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
import {
  DEFAULT_CLASSES,
  deleteSession,
  getLocalClassesStore,
  normalizePracticalClass,
  PracticalClass,
  subscribeSessions,
  updateSession,
} from './sessions';

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
      let latestRemote: PracticalClass[] = [];

      const emitMerged = () => {
        const localNow = getLocalClassesStore();
        const byId = new Map<string, PracticalClass>();

        DEFAULT_CLASSES.forEach((def) => {
          byId.set(def.id, normalizePracticalClass(def));
        });
        localNow.forEach((loc) => {
          byId.set(loc.id, normalizePracticalClass(loc));
        });
        latestRemote.forEach((rem) => {
          // Cocokkan juga apabila ada default class dengan classCode & courseName serupa
          const existingById = byId.get(rem.id);
          if (existingById) {
            byId.set(rem.id, normalizePracticalClass({ ...existingById, ...rem }));
          } else {
            byId.set(rem.id, normalizePracticalClass(rem));
          }
        });

        const merged = Array.from(byId.values());
        merged.sort((a, b) => {
          const courseCmp = (a.courseName || '').localeCompare(b.courseName || '');
          if (courseCmp !== 0) return courseCmp;
          return a.classCode.localeCompare(b.classCode);
        });
        onUpdate(merged);
      };

      const unsubFirestore = onSnapshot(
        q,
        (snap) => {
          latestRemote = snap.docs.map((d) =>
            normalizePracticalClass({
              id: d.id,
              ...(d.data() as Omit<PracticalClass, 'id'>),
            })
          );
          emitMerged();
        },
        (err) => {
          console.warn('Real-time classes error:', err);
          onUpdate(getLocalClassesStore());
        }
      );

      const unsubLocal = subscribeSessions(() => {
        emitMerged();
      });

      return () => {
        unsubFirestore();
        unsubLocal();
      };
    } catch (e) {
      console.warn('Could not setup classes listener:', e);
    }
  }

  const sendLocal = () => onUpdate(getLocalClassesStore());
  sendLocal();
  return subscribeSessions(sendLocal);
}

export async function assignAssistantToClass(
  classId: string,
  classCode: string,
  assistantId: string,
  assistantName: string
): Promise<void> {
  if (isFirebaseConfigured) {
    await setDoc(
      doc(db, 'classes', classId),
      {
        classCode: classCode.toUpperCase(),
        assistantId,
        assistantName,
      },
      { merge: true }
    );
  }
}

export async function toggleActiveClass(
  classId: string,
  classCode: string,
  isOpen: boolean
): Promise<void> {
  if (isFirebaseConfigured) {
    await setDoc(
      doc(db, 'classes', classId),
      {
        classCode: classCode.toUpperCase(),
        isOpen,
      },
      { merge: true }
    );
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
