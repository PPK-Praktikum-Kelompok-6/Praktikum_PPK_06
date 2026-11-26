import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
  type Transaction,
  type QuerySnapshot,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import {
  AttendanceRecord,
  PracticalSession,
  SessionStatus,
} from '@/types/attendance';
import { FineRecord } from '@/types/fine';
import { Coordinates, LabLocation } from '@/types/lab';
import { calculateDistanceMeters } from '@/utils/geo';
import {
  DEFAULT_FINE_AMOUNT,
  DEFAULT_GRACE_PERIOD_MINUTES,
  evaluateLateness,
  formatRupiah,
  resolveSessionStartIso,
} from '@/utils/lateness';
import { buildFineId, createLateFineIfNotExists } from './fines';
import { db, isFirebaseConfigured } from './firebase';
import { getLabByRoomName } from './labs';
import { getSessionById, updateSession } from './sessions';

type LabWithPolicy = LabLocation & {
  gracePeriodMinutes?: number;
  fineAmount?: number;
};

/**
 * Service Presensi, Sinkronisasi Real-Time, dan Anti-Bocor (Sprint 2 - Bahir).
 * SRS-PRES-01, SRS-PRES-02, SRS-SYNC-01, SRS-SEC-01
 */

export type AttendanceListener = () => void;
const attendanceListeners = new Set<AttendanceListener>();

function notifyAttendanceListeners() {
  attendanceListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn('Error in attendance listener:', err);
    }
  });
}

/**
 * Store lokal sebagai fallback reaktif jika Firebase belum dikonfigurasi / offline.
 */
let localAttendanceStore: AttendanceRecord[] = [];

/**
 * 1. Buka atau Tutup Sesi Praktikum di Firestore (SRS-PRES-01)
 * Asisten dapat mengubah status sesi menjadi 'OPEN' atau 'CLOSED'.
 */
export async function setSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<void> {
  if (!sessionId) {
    throw new Error('ID sesi tidak valid.');
  }

  // Delegasikan pembaruan status ke service sessions; catat openedAt saat sesi dibuka
  if (status === 'OPEN') {
    await updateSession(sessionId, {
      status,
      openedAt: new Date().toISOString(),
    });
    return;
  }
  await updateSession(sessionId, { status });
}

/**
 * 2. Submit Presensi dengan Proteksi Anti-Bocor, Validasi Geofencing, & Evaluasi Keterlambatan
 * (SRS-PRES-02, SRS-S3-02, SRS-S4-04)
 *
 * Menerapkan verifikasi atomik:
 * a. Memastikan status sesi adalah 'OPEN'.
 * b. Memastikan mahasiswa belum pernah presensi / belum berstatus EXCUSED_ABSENCE pada sesi ini.
 * c. Validasi Geofencing (SRS-S3-02): Untuk sesi OFFLINE, mahasiswa wajib berada
 *    di dalam radius laboratorium yang ditentukan.
 * d. Evaluasi Grace Period (SRS-S4-04): Menentukan ON_TIME vs LATE dan menerbitkan
 *    tepat 1 tagihan denda nominal tetap (idempotent) bila terlambat.
 * e. Menggunakan deterministic ID `attendance_${sessionId}_${studentId}`
 *    dengan Firestore Transaction untuk mencegah race condition / duplikasi.
 */
export async function submitAttendanceToFirestore(
  record: Omit<AttendanceRecord, 'id' | 'timestamp'> & {
    timestamp?: string;
    userCoords?: Coordinates | null;
    labLocation?: LabLocation | null;
  }
): Promise<{
  success: boolean;
  message: string;
  record?: AttendanceRecord;
  fine?: FineRecord | null;
}> {
  const { sessionId, studentId, studentName, studentNim, notes, userCoords } = record;

  if (!sessionId || !studentId) {
    return {
      success: false,
      message: 'Data sesi atau identitas praktikan tidak lengkap.',
    };
  }

  const timestamp = record.timestamp || new Date().toISOString();
  const docId = `attendance_${sessionId}_${studentId}`;

  // Mode Firebase Terkonfigurasi (Cloud Firestore)
  if (isFirebaseConfigured) {
    try {
      const attendanceDocRef = doc(db, 'attendance', docId);
      const sessionDocRef = doc(db, 'sessions', sessionId);

      // Ambil data sesi terlebih dahulu untuk pra-validasi geofence & kebijakan keterlambatan
      const preSessionSnap = await getDoc(sessionDocRef);
      if (!preSessionSnap.exists()) {
        return {
          success: false,
          message: 'Sesi praktikum tidak ditemukan.',
        };
      }

      const preSessionData = preSessionSnap.data() as Omit<PracticalSession, 'id'>;
      if (preSessionData.status !== 'OPEN') {
        return {
          success: false,
          message: 'Sesi praktikum belum dibuka atau sudah ditutup.',
        };
      }

      let targetLab: LabWithPolicy | null =
        (record.labLocation as LabWithPolicy | null) || null;
      if (!targetLab && preSessionData.labId) {
        try {
          const labSnap = await getDoc(doc(db, 'labs', preSessionData.labId));
          if (labSnap.exists()) {
            targetLab = {
              id: labSnap.id,
              ...(labSnap.data() as Omit<LabWithPolicy, 'id'>),
            };
          }
        } catch {
          // Abaikan jika gagal ambil lab by id, coba via room name
        }
      }

      if (!targetLab && preSessionData.room) {
        targetLab = (await getLabByRoomName(preSessionData.room)) as LabWithPolicy | null;
      }

      let computedDistance: number | null = null;
      // Validasi Lokasi (SRS-S3-02): Khusus sesi OFFLINE
      if (preSessionData.deliveryMode !== 'ONLINE') {
        if (!userCoords) {
          return {
            success: false,
            message:
              'Lokasi perangkat tidak dapat diperoleh. Aktifkan GPS dan izinkan akses lokasi untuk melakukan presensi praktikum offline.',
          };
        }

        if (targetLab) {
          const maxRadius = preSessionData.radiusMeters ?? targetLab.radiusMeters ?? 60;
          computedDistance = calculateDistanceMeters(userCoords, {
            latitude: targetLab.latitude,
            longitude: targetLab.longitude,
          });

          if (computedDistance > maxRadius) {
            return {
              success: false,
              message: `Presensi ditolak. Anda berada di luar radius laboratorium ${targetLab.name} (Jarak Anda: ${computedDistance} m, batas maksimal: ${maxRadius} m).`,
            };
          }
        }
      }

      const isOfflineVerified =
        preSessionData.deliveryMode !== 'ONLINE' && computedDistance !== null;

      // Evaluasi Keterlambatan berbasis Grace Period (SRS-S4-04)
      const gracePeriodMinutes =
        preSessionData.gracePeriodMinutes ??
        targetLab?.gracePeriodMinutes ??
        DEFAULT_GRACE_PERIOD_MINUTES;
      const fineAmount =
        preSessionData.fineAmount ??
        targetLab?.fineAmount ??
        DEFAULT_FINE_AMOUNT;
      const sessionStartIso = resolveSessionStartIso(preSessionData);
      const lateness = evaluateLateness(
        timestamp,
        sessionStartIso,
        gracePeriodMinutes
      );
      const expectedFineId = lateness.isLate
        ? buildFineId(sessionId, studentId)
        : null;

      const result = await runTransaction(db, async (transaction: Transaction) => {
        // 1. Periksa status sesi dalam transaksi
        const sessionSnap = await transaction.get(sessionDocRef);
        if (!sessionSnap.exists()) {
          throw new Error('Sesi praktikum tidak ditemukan.');
        }

        const sessionData = sessionSnap.data();
        if (sessionData.status !== 'OPEN') {
          throw new Error('Sesi praktikum belum dibuka atau sudah ditutup.');
        }

        // 2. Proteksi Anti-Bocor: Periksa apakah sudah ada presensi atau izin disetujui
        const attendanceSnap = await transaction.get(attendanceDocRef);
        if (attendanceSnap.exists()) {
          const existingStatus = attendanceSnap.data()?.attendanceStatus;
          if (existingStatus === 'EXCUSED_ABSENCE') {
            throw new Error(
              'Anda sudah tercatat Izin Disetujui (Bebas Denda) pada sesi ini sehingga tidak perlu melakukan presensi.'
            );
          }
          throw new Error('Anda sudah melakukan presensi pada sesi ini.');
        }

        const newRecord: AttendanceRecord = {
          id: docId,
          sessionId,
          studentId,
          studentName,
          studentNim,
          timestamp,
          notes: notes?.trim() || '',
          distanceMeters: computedDistance,
          userCoords: userCoords ?? null,
          verifiedLocation: isOfflineVerified,
          attendanceStatus: lateness.status,
          lateMinutes: lateness.lateMinutes,
          fineId: expectedFineId,
        };

        transaction.set(attendanceDocRef, newRecord);
        return newRecord;
      });

      // Jika terlambat, buat tepat 1 tagihan denda nominal tetap (idempotent)
      let createdFine: FineRecord | null = null;
      if (lateness.isLate) {
        createdFine = await createLateFineIfNotExists({
          studentId,
          studentName,
          studentNim,
          sessionId,
          sessionName: preSessionData.courseName || 'Sesi Praktikum',
          classCode: preSessionData.classCode || '-',
          labId: preSessionData.labId || targetLab?.id,
          attendanceId: result.id,
          lateMinutes: lateness.lateMinutes,
          amount: fineAmount,
        });
      }

      notifyAttendanceListeners();
      return {
        success: true,
        message: lateness.isLate
          ? `Presensi tercatat (Terlambat ${lateness.lateMinutes} menit). Tagihan denda sebesar ${formatRupiah(
              createdFine?.amount ?? fineAmount
            )} telah dibuat.`
          : 'Presensi berhasil dicatat tepat waktu!',
        record: result,
        fine: createdFine,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Gagal mengirim presensi ke server.',
      };
    }
  }

  // Mode Local Fallback (jika Firebase belum dihubungkan)
  const session = getSessionById(sessionId);
  if (!session) {
    return {
      success: false,
      message: 'Sesi praktikum tidak ditemukan.',
    };
  }

  if (session.status !== 'OPEN') {
    return {
      success: false,
      message: 'Sesi praktikum belum dibuka atau sudah ditutup.',
    };
  }

  // Proteksi Anti-Bocor lokal
  const existingLocal = localAttendanceStore.find(
    (item) => item.sessionId === sessionId && item.studentId === studentId
  );

  if (existingLocal) {
    if (existingLocal.attendanceStatus === 'EXCUSED_ABSENCE') {
      return {
        success: false,
        message:
          'Anda sudah tercatat Izin Disetujui (Bebas Denda) pada sesi ini sehingga tidak perlu melakukan presensi.',
      };
    }
    return {
      success: false,
      message: 'Anda sudah melakukan presensi pada sesi ini.',
    };
  }

  const targetLab = ((record.labLocation ||
    (await getLabByRoomName(session.room))) as LabWithPolicy | null);

  let localComputedDistance: number | null = null;
  // Validasi Geofencing lokal (SRS-S3-02)
  if (session.deliveryMode !== 'ONLINE') {
    if (!userCoords) {
      return {
        success: false,
        message:
          'Lokasi perangkat tidak dapat diperoleh. Aktifkan GPS dan izinkan akses lokasi untuk melakukan presensi praktikum offline.',
      };
    }

    if (targetLab) {
      const maxRadius = session.radiusMeters ?? targetLab.radiusMeters ?? 60;
      localComputedDistance = calculateDistanceMeters(userCoords, {
        latitude: targetLab.latitude,
        longitude: targetLab.longitude,
      });

      if (localComputedDistance > maxRadius) {
        return {
          success: false,
          message: `Presensi ditolak. Anda berada di luar radius laboratorium ${targetLab.name} (Jarak Anda: ${localComputedDistance} m, batas maksimal: ${maxRadius} m).`,
        };
      }
    }
  }

  const gracePeriodMinutes =
    session.gracePeriodMinutes ??
    targetLab?.gracePeriodMinutes ??
    DEFAULT_GRACE_PERIOD_MINUTES;
  const fineAmount =
    session.fineAmount ?? targetLab?.fineAmount ?? DEFAULT_FINE_AMOUNT;
  const sessionStartIso = resolveSessionStartIso(session);
  const lateness = evaluateLateness(
    timestamp,
    sessionStartIso,
    gracePeriodMinutes
  );
  const expectedFineId = lateness.isLate
    ? buildFineId(sessionId, studentId)
    : null;

  const newRecord: AttendanceRecord = {
    id: docId,
    sessionId,
    studentId,
    studentName,
    studentNim,
    timestamp,
    notes: notes?.trim() || '',
    distanceMeters: localComputedDistance,
    userCoords: userCoords ?? null,
    verifiedLocation:
      session.deliveryMode !== 'ONLINE' && localComputedDistance !== null,
    attendanceStatus: lateness.status,
    lateMinutes: lateness.lateMinutes,
    fineId: expectedFineId,
  };

  localAttendanceStore = [newRecord, ...localAttendanceStore];

  let localFine: FineRecord | null = null;
  if (lateness.isLate) {
    localFine = await createLateFineIfNotExists({
      studentId,
      studentName,
      studentNim,
      sessionId,
      sessionName: session.courseName,
      classCode: session.classCode,
      labId: session.labId || targetLab?.id,
      attendanceId: newRecord.id,
      lateMinutes: lateness.lateMinutes,
      amount: fineAmount,
    });
  }

  notifyAttendanceListeners();

  return {
    success: true,
    message: lateness.isLate
      ? `Presensi tercatat (Terlambat ${lateness.lateMinutes} menit). Tagihan denda sebesar ${formatRupiah(
          localFine?.amount ?? fineAmount
        )} telah dibuat.`
      : 'Presensi berhasil dicatat tepat waktu!',
    record: newRecord,
    fine: localFine,
  };
}

/**
 * 3. Real-Time Listener Rekap Kehadiran Sesi (SRS-SYNC-01)
 *
 * Menggunakan onSnapshot agar tampilan rekap pada dashboard asisten
 * otomatis bertambah tanpa reload saat mahasiswa melakukan presensi.
 */
export function subscribeToSessionAttendance(
  sessionId: string,
  onUpdate: (records: AttendanceRecord[]) => void
): () => void {
  if (!sessionId) {
    return () => {};
  }

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('sessionId', '==', sessionId)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const records: AttendanceRecord[] = snapshot.docs.map(
            (docSnap: QueryDocumentSnapshot<DocumentData>) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<AttendanceRecord, 'id'>),
            })
          );

          // Urutkan berdasarkan timestamp terbaru
          records.sort(
            (a: AttendanceRecord, b: AttendanceRecord) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          onUpdate(records);
        },
        (error: Error) => {
          console.warn('Real-time attendance listener error:', error);
          // Fallback kirim data lokal jika Firestore error
          onUpdate(
            localAttendanceStore.filter((r) => r.sessionId === sessionId)
          );
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('Could not setup Firestore onSnapshot:', err);
    }
  }

  // Local reaktif fallback
  const sendCurrent = () => {
    const records = localAttendanceStore.filter((r) => r.sessionId === sessionId);
    records.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    onUpdate(records);
  };

  // Kirim data saat inisialisasi
  sendCurrent();

  const listener = () => sendCurrent();
  attendanceListeners.add(listener);

  return () => {
    attendanceListeners.delete(listener);
  };
}

/**
 * Berlangganan (subscribe) real-time seluruh rekaman presensi milik satu mahasiswa.
 */
export function subscribeStudentAttendance(
  studentId: string,
  onUpdate: (records: AttendanceRecord[]) => void
): () => void {
  if (!studentId) {
    return () => {};
  }

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('studentId', '==', studentId)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const records: AttendanceRecord[] = snapshot.docs.map(
            (docSnap: QueryDocumentSnapshot<DocumentData>) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<AttendanceRecord, 'id'>),
            })
          );
          onUpdate(records);
        },
        (error: Error) => {
          console.warn('Real-time student attendance listener error:', error);
          onUpdate(
            localAttendanceStore.filter((r) => r.studentId === studentId)
          );
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('Could not setup student attendance onSnapshot:', err);
    }
  }

  const sendCurrent = () => {
    onUpdate(localAttendanceStore.filter((r) => r.studentId === studentId));
  };
  sendCurrent();
  const listener = () => sendCurrent();
  attendanceListeners.add(listener);
  return () => {
    attendanceListeners.delete(listener);
  };
}

/**
 * 4. Mengambil Riwayat Kehadiran Praktikan Tertentu (SRS-PRES-02)
 */
export async function getStudentAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  if (!studentId) return [];

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('studentId', '==', studentId)
      );
      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(
        (docSnap: QueryDocumentSnapshot<DocumentData>) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<AttendanceRecord, 'id'>),
        })
      );

      records.sort(
        (a: AttendanceRecord, b: AttendanceRecord) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return records;
    } catch {
      // Fallback
    }
  }

  return localAttendanceStore
    .filter((r) => r.studentId === studentId)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

/**
 * 5. Cek Cepat Apakah Praktikan Sudah Presensi di Sesi Tertentu
 */
export async function isStudentAlreadyAttended(
  sessionId: string,
  studentId: string
): Promise<boolean> {
  if (!sessionId || !studentId) return false;

  const docId = `attendance_${sessionId}_${studentId}`;

  if (isFirebaseConfigured) {
    try {
      const docSnap = await getDoc(doc(db, 'attendance', docId));
      return docSnap.exists();
    } catch {
      // Fallback
    }
  }

  return localAttendanceStore.some(
    (r) => r.sessionId === sessionId && r.studentId === studentId
  );
}

/**
 * 6. Mengambil Rekap Kehadiran Sesi secara Sinkron (Inisial)
 */
export function getAttendanceBySessionSync(sessionId: string): AttendanceRecord[] {
  return localAttendanceStore.filter((r) => r.sessionId === sessionId);
}

/**
 * 7. Input / Override Kehadiran Manual oleh Asisten Praktikum.
 * Digunakan ketika praktikan hadir di lab namun lupa klik presensi sebelum sesi ditutup,
 * atau praktikan baru join kode kelas setelah sesi dimulai.
 * Asisten memiliki otorisasi penuh sehingga tetap dapat mencatat kehadiran meski sesi telah CLOSED.
 */
export async function recordManualAttendanceByAssistant(params: {
  sessionId: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  assistantName: string;
  customNote?: string;
}): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
  const { sessionId, studentId, studentName, studentNim, assistantName, customNote } = params;
  if (!sessionId || !studentId) {
    return {
      success: false,
      message: 'ID sesi dan data praktikan wajib diisi.',
    };
  }

  const timestamp = new Date().toISOString();
  const docId = `attendance_${sessionId}_${studentId}`;
  const newRecord: AttendanceRecord = {
    id: docId,
    sessionId,
    studentId,
    studentName,
    studentNim,
    timestamp,
    notes:
      customNote?.trim() ||
      `Dicatat hadir manual oleh Asprak ${assistantName}`,
    attendanceStatus: 'ON_TIME',
    lateMinutes: 0,
    fineId: null,
  };

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'attendance', docId), newRecord, { merge: true });
    } catch (err) {
      console.warn('Gagal menyimpan presensi manual ke Firestore:', err);
    }
  }

  localAttendanceStore = [
    newRecord,
    ...localAttendanceStore.filter((item) => item.id !== docId),
  ];
  notifyAttendanceListeners();

  return {
    success: true,
    message: `Kehadiran ${studentName} (${studentNim}) berhasil dicatat oleh asisten.`,
    record: newRecord,
  };
}

/**
 * 8. Mencatat status Tidak Hadir dengan Izin (`EXCUSED_ABSENCE`) saat izin disetujui Asprak (SRS-S4-04).
 * TIDAK mengubah status menjadi hadir (`ON_TIME` / `LATE`) dan bebas dari denda keterlambatan.
 */
export async function recordExcusedAbsenceRecord(params: {
  sessionId: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  reason?: string;
}): Promise<AttendanceRecord> {
  const { sessionId, studentId, studentName, studentNim, reason } = params;
  const timestamp = new Date().toISOString();
  const docId = `attendance_${sessionId}_${studentId}`;

  const excusedRecord: AttendanceRecord = {
    id: docId,
    sessionId,
    studentId,
    studentName,
    studentNim,
    timestamp,
    notes: reason?.trim() || 'Tidak hadir dengan izin yang disetujui Asprak.',
    distanceMeters: null,
    userCoords: null,
    verifiedLocation: false,
    attendanceStatus: 'EXCUSED_ABSENCE',
    lateMinutes: 0,
    fineId: null,
  };

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'attendance', docId), excusedRecord, { merge: true });
    } catch (err) {
      console.warn('Gagal mencatat EXCUSED_ABSENCE ke Firestore:', err);
    }
  }

  localAttendanceStore = [
    excusedRecord,
    ...localAttendanceStore.filter((item) => item.id !== docId),
  ];
  notifyAttendanceListeners();

  return excusedRecord;
}
