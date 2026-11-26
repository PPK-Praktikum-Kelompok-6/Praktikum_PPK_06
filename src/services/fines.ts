import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type Transaction,
} from 'firebase/firestore';

import { FineRecord } from '@/types/fine';
import { formatRupiah } from '@/utils/lateness';
import { db, isFirebaseConfigured } from './firebase';

/**
 * Service Pengelolaan Denda Keterlambatan & Excused Absence (Sprint 4 - Bayu).
 * SRS-S4-04:
 * - Nominal denda tetap per keterlambatan.
 * - Idempotent: ID deterministik `fine_${sessionId}_${studentId}` (maksimal 1 tagihan per kejadian).
 * - Pembayaran denda TIDAK mengubah status kehadiran praktikan.
 * - Izin disetujui (`EXCUSED_ABSENCE`) membebaskan denda (`WAIVED`).
 */

export type FineListener = () => void;
const fineListeners = new Set<FineListener>();
let localFinesStore: FineRecord[] = [];

function notifyFineListeners() {
  fineListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn('Error in fine listener:', err);
    }
  });
}

function sanitizeFineForFirestore(fine: FineRecord): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  (Object.keys(fine) as (keyof FineRecord)[]).forEach((key) => {
    const val = fine[key];
    if (val !== undefined) {
      clean[key] = val;
    }
  });
  return clean;
}

export function buildFineId(sessionId: string, studentId: string): string {
  return `fine_${sessionId}_${studentId}`;
}

/**
 * Mengirimkan event notifikasi `FINE_CREATED` ke koleksi Firestore `notifications`
 * agar praktikan segera mengetahui tagihan denda baru (terintegrasi dengan modul Ferdy).
 */
async function dispatchFineCreatedNotification(fine: FineRecord): Promise<void> {
  if (!isFirebaseConfigured) return;

  try {
    const notifId = `notif_fine_${fine.sessionId}_${fine.studentId}`;
    await setDoc(
      doc(db, 'notifications', notifId),
      {
        id: notifId,
        type: 'FINE_CREATED',
        title: 'Tagihan Denda Keterlambatan',
        body: `Anda terlambat ${fine.lateMinutes} menit pada sesi ${fine.sessionName} (${fine.classCode}). Tagihan denda sebesar ${formatRupiah(fine.amount)} telah diterbitkan.`,
        targetUserIds: [fine.studentId],
        targetClassCode: fine.classCode,
        route: '/student/fines',
        sessionId: fine.sessionId,
        fineId: fine.id,
        createdAt: new Date().toISOString(),
        readBy: [],
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Gagal mengirim notifikasi FINE_CREATED:', err);
  }
}

/**
 * 1. Membuat tepat 1 tagihan denda dengan ID deterministik `fine_${sessionId}_${studentId}`.
 * Jika dokumen sudah ada, mengembalikan dokumen yang ada tanpa membuat duplikat.
 */
export async function createLateFineIfNotExists(
  input: Omit<FineRecord, 'id' | 'status' | 'createdAt'>
): Promise<FineRecord> {
  const fineId = buildFineId(input.sessionId, input.studentId);
  const createdAt = new Date().toISOString();

  const candidateFine: FineRecord = {
    id: fineId,
    studentId: input.studentId,
    studentName: input.studentName,
    studentNim: input.studentNim,
    sessionId: input.sessionId,
    sessionName: input.sessionName,
    classCode: input.classCode,
    ...(input.labId ? { labId: input.labId } : {}),
    attendanceId: input.attendanceId,
    lateMinutes: Math.max(1, Math.round(input.lateMinutes)),
    amount: Math.max(0, Math.round(input.amount)),
    status: 'UNPAID',
    createdAt,
  };

  let createdNew = false;
  let finalRecord: FineRecord = candidateFine;

  if (isFirebaseConfigured) {
    try {
      const fineRef = doc(db, 'fines', fineId);
      const txResult = await runTransaction(
        db,
        async (transaction: Transaction) => {
          const existingSnap = await transaction.get(fineRef);
          if (existingSnap.exists()) {
            const existingData = {
              id: existingSnap.id,
              ...(existingSnap.data() as Omit<FineRecord, 'id'>),
            };
            return { record: existingData, isNew: false };
          }
          transaction.set(fineRef, sanitizeFineForFirestore(candidateFine));
          return { record: candidateFine, isNew: true };
        }
      );

      finalRecord = txResult.record;
      createdNew = txResult.isNew;

      localFinesStore = [
        finalRecord,
        ...localFinesStore.filter((f) => f.id !== finalRecord.id),
      ];
      notifyFineListeners();

      if (createdNew) {
        void dispatchFineCreatedNotification(finalRecord);
      }
      return finalRecord;
    } catch (err) {
      console.warn('Gagal membuat tagihan denda di Firestore (fallback lokal):', err);
    }
  }

  // Local fallback idempotent
  const existingLocal = localFinesStore.find((f) => f.id === fineId);
  if (existingLocal) {
    return existingLocal;
  }

  localFinesStore = [candidateFine, ...localFinesStore];
  notifyFineListeners();
  return candidateFine;
}

/**
 * 2. Membebaskan denda (status: 'WAIVED') jika praktikan memperoleh persetujuan izin dari Asprak.
 * Jika denda belum pernah dibuat, tidak membuat tagihan baru.
 * Jika denda sudah 'PAID', tidak diubah lagi.
 */
export async function waiveFineForExcusedAbsence(
  sessionId: string,
  studentId: string
): Promise<void> {
  if (!sessionId || !studentId) return;
  const fineId = buildFineId(sessionId, studentId);

  if (isFirebaseConfigured) {
    try {
      const fineRef = doc(db, 'fines', fineId);
      const fineSnap = await getDoc(fineRef);
      if (fineSnap.exists()) {
        const currentStatus = fineSnap.data()?.status;
        if (currentStatus === 'UNPAID' || currentStatus === 'PENDING') {
          await updateDoc(fineRef, { status: 'WAIVED' });
        }
      }
    } catch (err) {
      console.warn('Gagal memperbarui status WAIVED pada denda Firestore:', err);
    }
  }

  let changed = false;
  localFinesStore = localFinesStore.map((fine) => {
    if (
      fine.id === fineId &&
      (fine.status === 'UNPAID' || fine.status === 'PENDING')
    ) {
      changed = true;
      return { ...fine, status: 'WAIVED' };
    }
    return fine;
  });

  if (changed) {
    notifyFineListeners();
  }
}

/**
 * 3. Mengambil daftar denda pada satu sesi praktikum (untuk rekap Asprak).
 */
export async function getFinesBySession(
  sessionId: string
): Promise<FineRecord[]> {
  if (!sessionId) return [];

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, 'fines'),
        where('sessionId', '==', sessionId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<FineRecord, 'id'>),
      }));
    } catch {
      // Fallback lokal
    }
  }

  return localFinesStore.filter((f) => f.sessionId === sessionId);
}

/**
 * 4. Real-time listener daftar denda pada satu sesi praktikum (untuk rekap & detail sesi Asprak).
 */
export function subscribeFinesBySession(
  sessionId: string,
  onUpdate: (fines: FineRecord[]) => void
): () => void {
  if (!sessionId) {
    return () => {};
  }

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, 'fines'),
        where('sessionId', '==', sessionId)
      );
      return onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const fines: FineRecord[] = snapshot.docs.map(
            (docSnap: QueryDocumentSnapshot<DocumentData>) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<FineRecord, 'id'>),
            })
          );
          onUpdate(fines);
        },
        (error: Error) => {
          console.warn('Real-time session fines listener error:', error);
          onUpdate(localFinesStore.filter((f) => f.sessionId === sessionId));
        }
      );
    } catch (err) {
      console.warn('Could not setup session fines onSnapshot:', err);
    }
  }

  const sendCurrent = () => {
    onUpdate(localFinesStore.filter((f) => f.sessionId === sessionId));
  };
  sendCurrent();
  const listener = () => sendCurrent();
  fineListeners.add(listener);
  return () => {
    fineListeners.delete(listener);
  };
}

/**
 * 5. Mengambil tagihan denda spesifik untuk pasangan (sessionId, studentId).
 */
export async function getFineBySessionAndStudent(
  sessionId: string,
  studentId: string
): Promise<FineRecord | null> {
  if (!sessionId || !studentId) return null;
  const fineId = buildFineId(sessionId, studentId);

  if (isFirebaseConfigured) {
    try {
      const fineSnap = await getDoc(doc(db, 'fines', fineId));
      if (fineSnap.exists()) {
        return {
          id: fineSnap.id,
          ...(fineSnap.data() as Omit<FineRecord, 'id'>),
        };
      }
      return null;
    } catch {
      // Fallback lokal
    }
  }

  return localFinesStore.find((f) => f.id === fineId) || null;
}

/**
 * 6. Real-time listener tagihan denda spesifik untuk praktikan pada satu sesi (dipakai di check-in/[id].tsx).
 */
export function subscribeStudentFineForSession(
  sessionId: string,
  studentId: string,
  onUpdate: (fine: FineRecord | null) => void
): () => void {
  if (!sessionId || !studentId) {
    return () => {};
  }
  const fineId = buildFineId(sessionId, studentId);

  if (isFirebaseConfigured) {
    try {
      return onSnapshot(
        doc(db, 'fines', fineId),
        (docSnap) => {
          if (docSnap.exists()) {
            onUpdate({
              id: docSnap.id,
              ...(docSnap.data() as Omit<FineRecord, 'id'>),
            });
          } else {
            onUpdate(null);
          }
        },
        () => {
          onUpdate(localFinesStore.find((f) => f.id === fineId) || null);
        }
      );
    } catch {
      // Fallback lokal
    }
  }

  const sendCurrent = () => {
    onUpdate(localFinesStore.find((f) => f.id === fineId) || null);
  };
  sendCurrent();
  const listener = () => sendCurrent();
  fineListeners.add(listener);
  return () => {
    fineListeners.delete(listener);
  };
}

/**
 * Reset helper khusus untuk keperluan unit testing.
 */
export function _resetFinesStore(initialData?: FineRecord[]) {
  localFinesStore = initialData ? [...initialData] : [];
  notifyFineListeners();
}
