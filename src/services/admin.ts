import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { SessionChangeRequest } from '@/types/attendance';
import { AuthUser } from './auth';
import { db, isFirebaseConfigured } from './firebase';
import { deleteSession, PracticalClass, updateSession } from './sessions';

/**
 * Service Administrasi & Tata Kelola Lab (Admin & Perizinan Berjenjang).
 * Mengatur:
 * 1. Persetujuan penghapusan / reschedule sesi praktikum (Admin).
 * 2. Penetapan penugasan kelas praktikum ke asisten (Admin).
 * 3. Persetujuan pendaftaran akun asisten baru (Admin).
 * 4. Persetujuan pendaftaran akun praktikan baru (Asisten Kelas).
 */

// In-memory fallback stores
let localSessionRequests: SessionChangeRequest[] = [];

// ==========================================
// 1. MANAJEMEN PERMINTAAN PERUBAHAN SESI (RESCHEDULE / HAPUS)
// ==========================================

export async function requestSessionChange(
  data: Omit<SessionChangeRequest, 'id' | 'createdAt' | 'status'>
): Promise<string> {
  const newId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const record: SessionChangeRequest = {
    ...data,
    id: newId,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'session_requests', newId), record);
      // Tandai sesi di Firestore sedang menunggu persetujuan
      await updateDoc(doc(db, 'sessions', data.sessionId), {
        pendingChangeRequest: data.type,
      });
      return newId;
    } catch (err) {
      console.warn('Gagal menyimpan permohonan sesi ke Firestore:', err);
    }
  }

  localSessionRequests.unshift(record);
  return newId;
}

export function subscribeSessionRequests(
  onUpdate: (requests: SessionChangeRequest[]) => void
): () => void {
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'session_requests'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: SessionChangeRequest[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<SessionChangeRequest, 'id'>),
          }));
          list.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          onUpdate(list);
        },
        (err) => {
          console.warn('Real-time session requests error:', err);
          onUpdate(localSessionRequests);
        }
      );
      return unsub;
    } catch (e) {
      console.warn('Could not setup session requests listener:', e);
    }
  }

  onUpdate(localSessionRequests);
  return () => {};
}

export async function reviewSessionRequest(
  requestId: string,
  decision: 'APPROVED' | 'REJECTED',
  adminName: string,
  adminNote?: string
): Promise<void> {
  let targetRequest: SessionChangeRequest | undefined = localSessionRequests.find(
    (r) => r.id === requestId
  );

  if (isFirebaseConfigured) {
    try {
      const snap = await getDoc(doc(db, 'session_requests', requestId));
      if (snap.exists()) {
        targetRequest = {
          id: snap.id,
          ...(snap.data() as Omit<SessionChangeRequest, 'id'>),
        };
      }
    } catch (err) {
      console.warn('Gagal membaca detail permintaan sesi:', err);
    }
  }

  if (!targetRequest) {
    throw new Error('Permohonan perubahan sesi tidak ditemukan.');
  }

  const updates = {
    status: decision,
    reviewedBy: adminName,
    reviewedAt: new Date().toISOString(),
    adminNote: adminNote?.trim() || undefined,
  };

  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'session_requests', requestId), updates);

    if (decision === 'APPROVED') {
      if (targetRequest.type === 'DELETE') {
        await deleteSession(targetRequest.sessionId);
      } else if (targetRequest.type === 'RESCHEDULE') {
        await updateSession(targetRequest.sessionId, {
          timeSlot: targetRequest.newTimeSlot,
          date: targetRequest.newDate,
          room: targetRequest.newRoom,
          pendingChangeRequest: undefined,
        });
      }
    } else {
      // Jika ditolak, hapus penanda pending di sesi
      try {
        await updateDoc(doc(db, 'sessions', targetRequest.sessionId), {
          pendingChangeRequest: null,
        });
      } catch {}
    }
    return;
  }

  // Local fallback
  localSessionRequests = localSessionRequests.map((r) =>
    r.id === requestId ? { ...r, ...updates } : r
  );
}

// ==========================================
// 2. PENUGASAN KELAS KE ASISTEN OLEH ADMIN
// ==========================================

export function subscribeAllClasses(
  onUpdate: (classes: PracticalClass[]) => void
): () => void {
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'classes'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: PracticalClass[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<PracticalClass, 'id'>),
          }));
          list.sort((a, b) => a.classCode.localeCompare(b.classCode));
          onUpdate(list);
        },
        (err) => {
          console.warn('Real-time classes error:', err);
        }
      );
      return unsub;
    } catch (e) {
      console.warn('Could not setup classes listener:', e);
    }
  }
  return () => {};
}

export async function assignAssistantToClass(
  classId: string,
  assistantId: string,
  assistantName: string
): Promise<void> {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'classes', classId), {
      assistantId,
      assistantName,
    });
  }
}

// ==========================================
// 3. PERSETUJUAN AKUN ASISTEN (OLEH ADMIN)
// ==========================================

export function subscribePendingAssistants(
  onUpdate: (users: AuthUser[]) => void
): () => void {
  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'ASSISTANT'),
        where('approvalStatus', '==', 'PENDING_ADMIN')
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: AuthUser[] = snap.docs.map((d) => ({
            uid: d.id,
            ...(d.data() as Omit<AuthUser, 'uid'>),
          }));
          onUpdate(list);
        },
        (err) => {
          console.warn('Real-time pending assistants error:', err);
        }
      );
      return unsub;
    } catch (e) {
      console.warn('Could not setup pending assistants listener:', e);
    }
  }
  return () => {};
}

export async function approveAssistantAccount(
  assistantUid: string,
  adminName: string
): Promise<void> {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'users', assistantUid), {
      approvalStatus: 'APPROVED',
      approvedBy: adminName,
      approvedAt: new Date().toISOString(),
    });
  }
}

export async function rejectAssistantAccount(
  assistantUid: string
): Promise<void> {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'users', assistantUid), {
      approvalStatus: 'REJECTED',
      rejectedAt: new Date().toISOString(),
    });
  }
}

// ==========================================
// 4. PERSETUJUAN AKUN PRAKTIKAN (OLEH ASISTEN KELAS)
// ==========================================

export function subscribePendingStudents(
  onUpdate: (users: AuthUser[]) => void,
  classCode?: string
): () => void {
  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'STUDENT'),
        where('approvalStatus', '==', 'PENDING_ASSISTANT')
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          let list: AuthUser[] = snap.docs.map((d) => ({
            uid: d.id,
            ...(d.data() as Omit<AuthUser, 'uid'>),
          }));
          if (classCode) {
            list = list.filter(
              (u) =>
                (u.requestedClass || '').toUpperCase() ===
                classCode.toUpperCase()
            );
          }
          onUpdate(list);
        },
        (err) => {
          console.warn('Real-time pending students error:', err);
        }
      );
      return unsub;
    } catch (e) {
      console.warn('Could not setup pending students listener:', e);
    }
  }
  return () => {};
}

export async function approveStudentAccount(
  studentUid: string,
  classCode: string,
  assistantName: string
): Promise<void> {
  if (isFirebaseConfigured) {
    // 1. Perbarui status akun mahasiswa
    await updateDoc(doc(db, 'users', studentUid), {
      approvalStatus: 'APPROVED',
      enrolledClasses: [classCode.toUpperCase()],
      approvedBy: assistantName,
      approvedAt: new Date().toISOString(),
    });

    // 2. Tambahkan mahasiswa ke daftar kelas
    try {
      const classQ = query(
        collection(db, 'classes'),
        where('classCode', '==', classCode.toUpperCase())
      );
      const snap = await getDocs(classQ);
      if (!snap.empty) {
        const clsDoc = snap.docs[0];
        const existingStudents: string[] = clsDoc.data().studentIds || [];
        if (!existingStudents.includes(studentUid)) {
          await updateDoc(doc(db, 'classes', clsDoc.id), {
            studentIds: [...existingStudents, studentUid],
          });
        }
      }
    } catch (err) {
      console.warn('Gagal menambahkan mahasiswa ke kelas Firestore:', err);
    }
  }
}

export async function rejectStudentAccount(
  studentUid: string
): Promise<void> {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'users', studentUid), {
      approvalStatus: 'REJECTED',
      rejectedAt: new Date().toISOString(),
    });
  }
}
