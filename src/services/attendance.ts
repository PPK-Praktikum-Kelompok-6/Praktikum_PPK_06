import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  where,
  type Transaction,
  type QuerySnapshot,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { AttendanceRecord, SessionStatus } from '@/types/attendance';
import { db, isFirebaseConfigured } from './firebase';
import { getSessionById, updateSession } from './sessions';

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

  // Delegasikan pembaruan status ke service sessions
  await updateSession(sessionId, { status });
}

/**
 * 2. Submit Presensi dengan Proteksi Anti-Bocor (SRS-PRES-02)
 *
 * Menerapkan verifikasi atomik:
 * a. Memastikan status sesi adalah 'OPEN'.
 * b. Memastikan mahasiswa belum pernah presensi pada sesi ini.
 * c. Menggunakan deterministic ID `attendance_${sessionId}_${studentId}`
 *    atau Firestore Transaction untuk mencegah race condition / duplikasi.
 */
export async function submitAttendanceToFirestore(
  record: Omit<AttendanceRecord, 'id' | 'timestamp'> & { timestamp?: string }
): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
  const { sessionId, studentId, studentName, studentNim, notes } = record;

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

      const result = await runTransaction(db, async (transaction: Transaction) => {
        // 1. Periksa status sesi
        const sessionSnap = await transaction.get(sessionDocRef);
        if (!sessionSnap.exists()) {
          throw new Error('Sesi praktikum tidak ditemukan.');
        }

        const sessionData = sessionSnap.data();
        if (sessionData.status !== 'OPEN') {
          throw new Error('Sesi praktikum belum dibuka atau sudah ditutup.');
        }

        // 2. Proteksi Anti-Bocor: Periksa apakah sudah ada presensi
        const attendanceSnap = await transaction.get(attendanceDocRef);
        if (attendanceSnap.exists()) {
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
        };

        transaction.set(attendanceDocRef, newRecord);
        return newRecord;
      });

      notifyAttendanceListeners();
      return {
        success: true,
        message: 'Presensi berhasil dicatat!',
        record: result,
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
  const isDuplicate = localAttendanceStore.some(
    (item) => item.sessionId === sessionId && item.studentId === studentId
  );

  if (isDuplicate) {
    return {
      success: false,
      message: 'Anda sudah melakukan presensi pada sesi ini.',
    };
  }

  const newRecord: AttendanceRecord = {
    id: docId,
    sessionId,
    studentId,
    studentName,
    studentNim,
    timestamp,
    notes: notes?.trim() || '',
  };

  localAttendanceStore = [newRecord, ...localAttendanceStore];
  notifyAttendanceListeners();

  return {
    success: true,
    message: 'Presensi berhasil dicatat!',
    record: newRecord,
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
