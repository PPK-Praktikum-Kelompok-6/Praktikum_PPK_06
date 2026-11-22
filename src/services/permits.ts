import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';

import { PermitAttachment, PermitRequest } from '@/types/permit';
import { classifyPermitReason } from './ai';
import { db, isFirebaseConfigured } from './firebase';

export { PermitAttachment, PermitRequest };

function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = sanitizeForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Service pengolahan data izin (SRS-IZIN-01, SRS-IZIN-02, SRS-AI-01).
 *
 * Menggunakan integrasi Cloud Firestore real-time sebagai sumber kebenaran utama
 * dengan sinkronisasi dua arah ke cache in-memory (`permitStore`).
 */

export type PermitListener = () => void;
const listeners = new Set<PermitListener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribePermits(listener: PermitListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Store bersih tanpa dummy data sampah; otomatis terisi dari Firestore
let permitStore: PermitRequest[] = [];

function mergeRemotePermitsIntoLocal(remoteList: PermitRequest[]) {
  const byId = new Map<string, PermitRequest>();
  permitStore.forEach((loc) => byId.set(loc.id, loc));
  remoteList.forEach((rem) => byId.set(rem.id, rem));

  const merged = Array.from(byId.values());
  merged.sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  permitStore = merged;
}

export function getStudentPermitsSync(studentId: string): PermitRequest[] {
  return permitStore.filter((p) => p.studentId === studentId);
}

export function getIncomingPermitsSync(): PermitRequest[] {
  return [...permitStore];
}

/**
 * Berlangganan real-time daftar izin untuk satu mahasiswa dari Cloud Firestore
 */
export function subscribeStudentPermits(
  studentId: string,
  onUpdate: (permits: PermitRequest[]) => void
): () => void {
  if (isFirebaseConfigured && studentId) {
    try {
      const q = query(
        collection(db, 'permits'),
        where('studentId', '==', studentId)
      );
      const unsubFirestore = onSnapshot(
        q,
        (snap) => {
          const allRemote: PermitRequest[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<PermitRequest, 'id'>),
          }));
          mergeRemotePermitsIntoLocal(allRemote);
          onUpdate(permitStore.filter((p) => p.studentId === studentId));
        },
        (err) => {
          console.warn('Real-time student permits listener error:', err);
          onUpdate(permitStore.filter((p) => p.studentId === studentId));
        }
      );

      const unsubLocal = subscribePermits(() => {
        onUpdate(permitStore.filter((p) => p.studentId === studentId));
      });

      return () => {
        unsubFirestore();
        unsubLocal();
      };
    } catch (e) {
      console.warn('Could not setup student permits listener:', e);
    }
  }

  const send = () =>
    onUpdate(permitStore.filter((p) => p.studentId === studentId));
  send();
  return subscribePermits(send);
}

/**
 * Berlangganan real-time seluruh daftar permohonan izin untuk asisten dari Cloud Firestore
 */
export function subscribeIncomingPermits(
  onUpdate: (permits: PermitRequest[]) => void
): () => void {
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'permits'));
      const unsubFirestore = onSnapshot(
        q,
        (snap) => {
          const list: PermitRequest[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<PermitRequest, 'id'>),
          }));
          mergeRemotePermitsIntoLocal(list);
          onUpdate([...permitStore]);
        },
        (err) => {
          console.warn('Real-time incoming permits listener error:', err);
          onUpdate([...permitStore]);
        }
      );

      const unsubLocal = subscribePermits(() => {
        onUpdate([...permitStore]);
      });

      return () => {
        unsubFirestore();
        unsubLocal();
      };
    } catch (e) {
      console.warn('Could not setup incoming permits listener:', e);
    }
  }

  const send = () => onUpdate([...permitStore]);
  send();
  return subscribePermits(send);
}

/**
 * 1. Mengajukan Izin Baru (SRS-IZIN-01 & SRS-AI-01)
 */
export async function submitPermit(
  permitData: Omit<
    PermitRequest,
    'id' | 'submittedAt' | 'status' | 'aiClassification'
  > & {
    attachment?: PermitAttachment;
  }
): Promise<{
  success: boolean;
  permitId?: string;
  message: string;
  data?: PermitRequest;
}> {
  const trimmedReason = permitData.reason?.trim() || '';

  if (trimmedReason.length < 10) {
    return {
      success: false,
      message:
        'Alasan izin terlalu pendek. Harap jelaskan alasan Anda minimal 10 karakter.',
    };
  }

  // Validasi lokal: Praktikan tidak dapat mengajukan izin ganda untuk sesi yang sama
  const existingLocal = permitStore.find(
    (p) =>
      p.sessionId === permitData.sessionId &&
      p.studentId === permitData.studentId &&
      p.status !== 'REJECTED'
  );

  if (existingLocal) {
    return {
      success: false,
      message: 'Anda sudah pernah mengajukan izin untuk sesi praktikum ini.',
    };
  }

  // Panggil model AI untuk klasifikasi alasan
  const aiResult = await classifyPermitReason(trimmedReason);

  const newPermit: PermitRequest = {
    id: `permit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sessionId: permitData.sessionId,
    classId: permitData.classId,
    classCode: permitData.classCode,
    courseName: permitData.courseName,
    studentId: permitData.studentId,
    studentName: permitData.studentName,
    studentNim: permitData.studentNim,
    reason: trimmedReason,
    submittedAt: new Date().toISOString(),
    status: 'PENDING',
    aiClassification: aiResult,
    ...(permitData.attachment ? { attachment: permitData.attachment } : {}),
  };

  // Simpan ke Cloud Firestore
  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, 'permits'),
        where('studentId', '==', permitData.studentId)
      );
      const snap = await getDocs(q);
      const hasActive = snap.docs.some((d) => {
        const data = d.data() as PermitRequest;
        return (
          data.sessionId === permitData.sessionId && data.status !== 'REJECTED'
        );
      });
      if (hasActive) {
        return {
          success: false,
          message:
            'Anda sudah pernah mengajukan izin untuk sesi praktikum ini di database.',
        };
      }

      await setDoc(
        doc(db, 'permits', newPermit.id),
        sanitizeForFirestore(newPermit)
      );
    } catch (err) {
      console.warn('Gagal menyimpan izin ke Firestore (menggunakan store lokal):', err);
    }
  }

  permitStore = [newPermit, ...permitStore.filter((p) => p.id !== newPermit.id)];
  notifyListeners();

  return {
    success: true,
    permitId: newPermit.id,
    message:
      'Permohonan izin berhasil disimpan ke database dan sedang menunggu peninjauan asisten.',
    data: newPermit,
  };
}

/**
 * 2. Ambil Izin untuk Praktikan Tertentu dari Firestore & Store Lokal (SRS-IZIN-01)
 */
export async function getStudentPermits(
  studentId: string
): Promise<PermitRequest[]> {
  if (isFirebaseConfigured && studentId) {
    try {
      const q = query(
        collection(db, 'permits'),
        where('studentId', '==', studentId)
      );
      const snap = await getDocs(q);
      const remoteList: PermitRequest[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PermitRequest, 'id'>),
      }));
      mergeRemotePermitsIntoLocal(remoteList);
    } catch {
      // Fallback ke store lokal
    }
  }
  return permitStore.filter((p) => p.studentId === studentId);
}

/**
 * 3. Ambil Seluruh Izin Masuk untuk Asisten dari Firestore & Store Lokal (SRS-IZIN-02)
 */
export async function getIncomingPermits(): Promise<PermitRequest[]> {
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, 'permits'));
      const remoteList: PermitRequest[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PermitRequest, 'id'>),
      }));
      mergeRemotePermitsIntoLocal(remoteList);
    } catch {
      // Fallback ke store lokal
    }
  }
  return [...permitStore];
}

/**
 * 4. Keputusan Asisten: Menerima atau Menolak Izin di Firestore & Store Lokal (SRS-IZIN-02)
 */
export async function reviewPermit(
  permitId: string,
  decision: 'APPROVED' | 'REJECTED',
  assistantName: string,
  decisionNote?: string
): Promise<{ success: boolean; message: string }> {
  let targetPermit: PermitRequest | undefined = permitStore.find(
    (p) => p.id === permitId
  );

  // Jika belum ada di memori lokal, baca langsung dari dokumen Firestore
  if (!targetPermit && isFirebaseConfigured) {
    try {
      const docSnap = await getDoc(doc(db, 'permits', permitId));
      if (docSnap.exists()) {
        targetPermit = {
          id: docSnap.id,
          ...(docSnap.data() as Omit<PermitRequest, 'id'>),
        };
      }
    } catch {
      // Fallback
    }
  }

  if (!targetPermit) {
    return {
      success: false,
      message: 'Permohonan izin tidak ditemukan di database.',
    };
  }

  const reviewedAt = new Date().toISOString();
  const updatedPermit: PermitRequest = {
    ...targetPermit,
    status: decision,
    decisionNote: decisionNote?.trim() || undefined,
    reviewedBy: assistantName,
    reviewedAt,
  };

  if (isFirebaseConfigured) {
    try {
      await setDoc(
        doc(db, 'permits', permitId),
        sanitizeForFirestore(updatedPermit),
        { merge: true }
      );
    } catch (err) {
      console.warn('Gagal memperbarui status izin di Firestore:', err);
    }
  }

  const targetIndex = permitStore.findIndex((p) => p.id === permitId);
  if (targetIndex >= 0) {
    permitStore[targetIndex] = updatedPermit;
  } else {
    permitStore = [updatedPermit, ...permitStore];
  }

  notifyListeners();

  const actionText = decision === 'APPROVED' ? 'disetujui' : 'ditolak';

  return {
    success: true,
    message: `Permohonan izin berhasil ${actionText}.`,
  };
}

/**
 * Reset helper untuk keperluan testing unit/evaluasi.
 */
export function _resetPermitStore(initialData?: PermitRequest[]) {
  if (initialData) {
    permitStore = [...initialData];
  } else {
    permitStore = [];
  }
  notifyListeners();
}

/**
 * 5. Input Izin / Sakit Manual oleh Asisten Praktikum (untuk praktikan yang menyerahkan
 * surat dokter fisik / WA langsung ke asisten tanpa sempat membuka aplikasi).
 * Langsung berstatus 'APPROVED'.
 */
export async function recordManualPermitByAssistant(params: {
  sessionId: string;
  classId?: string;
  classCode?: string;
  courseName: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  assistantName: string;
  reason?: string;
}): Promise<{ success: boolean; message: string; data?: PermitRequest }> {
  const finalReason =
    params.reason?.trim() ||
    'Surat izin/dokter fisik diterima dan diverifikasi langsung oleh asisten praktikum.';

  const aiResult = await classifyPermitReason(finalReason);
  const nowIso = new Date().toISOString();
  const permitId = `permit-manual-${params.sessionId}-${params.studentId}`;

  const manualPermit: PermitRequest = {
    id: permitId,
    sessionId: params.sessionId,
    classId: params.classId,
    classCode: params.classCode,
    courseName: params.courseName,
    studentId: params.studentId,
    studentName: params.studentName,
    studentNim: params.studentNim,
    reason: finalReason,
    submittedAt: nowIso,
    status: 'APPROVED',
    aiClassification: aiResult,
    decisionNote: `Diverifikasi manual oleh Asprak ${params.assistantName} (Dokumen bukti diterima).`,
    reviewedBy: params.assistantName,
    reviewedAt: nowIso,
  };

  if (isFirebaseConfigured) {
    try {
      await setDoc(
        doc(db, 'permits', permitId),
        sanitizeForFirestore(manualPermit),
        { merge: true }
      );
    } catch (err) {
      console.warn('Gagal menyimpan izin manual ke Firestore:', err);
    }
  }

  permitStore = [
    manualPermit,
    ...permitStore.filter((p) => p.id !== permitId),
  ];
  notifyListeners();

  return {
    success: true,
    message: `Status izin/sakit untuk ${params.studentName} (${params.studentNim}) berhasil dicatat dan disetujui.`,
    data: manualPermit,
  };
}
