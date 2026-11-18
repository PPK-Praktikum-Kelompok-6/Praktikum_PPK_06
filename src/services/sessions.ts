import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { MOCK_SESSIONS, MOCK_USERS } from '@/data/mockData';
import { PracticalSession, UserProfile } from '@/types/attendance';
import { db, isFirebaseConfigured } from './firebase';

export interface PracticalClass {
  id: string;
  classCode: string;
  courseName: string;
  room: string;
  assistantId: string;
  assistantName: string;
  studentIds: string[];
}

export type SessionListener = () => void;

const sessionListeners = new Set<SessionListener>();
let localSessionsStore: PracticalSession[] = [...MOCK_SESSIONS];

let localClassesStore: PracticalClass[] = [
  {
    id: 'class-c1',
    classCode: 'C1',
    courseName: 'Pemrograman Web & Mobile',
    room: 'Lab Komputer 2',
    assistantId: 'ast-1',
    assistantName: 'Muhammad Zaidan Alfarizi',
    studentIds: ['std-1', 'std-2', 'std-3', 'std-4', 'std-5'],
  },
  {
    id: 'class-b2',
    classCode: 'B2',
    courseName: 'Struktur Data & Algoritma',
    room: 'Lab Komputer 1',
    assistantId: 'ast-1',
    assistantName: 'Muhammad Zaidan Alfarizi',
    studentIds: ['std-1', 'std-3', 'std-4'],
  },
  {
    id: 'class-a1',
    classCode: 'A1',
    courseName: 'Basis Data Lanjut',
    room: 'Lab Basis Data',
    assistantId: 'ast-2',
    assistantName: 'Crystiano Bayu Satya Alves',
    studentIds: ['std-1', 'std-2', 'std-5'],
  },
];

function notifySessionListeners() {
  sessionListeners.forEach((listener) => listener());
}

/**
 * Mendaftarkan listener perubahan jadwal/sesi praktikum.
 */
export function subscribeSessions(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

/**
 * Berlangganan (subscribe) real-time daftar sesi yang diampu asisten dari Firestore
 */
export function subscribeAssistantSessions(
  assistantId: string,
  onUpdate: (sessions: PracticalSession[]) => void,
  assistantName?: string
): () => void {
  if (isFirebaseConfigured && assistantId) {
    try {
      const q = query(collection(db, 'sessions'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const allSessions: PracticalSession[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<PracticalSession, 'id'>),
          }));

          const filtered = allSessions.filter(
            (s) =>
              s.assistantId === assistantId ||
              s.assistantId === 'ast-1' ||
              (assistantName && s.assistantName === assistantName)
          );

          onUpdate(filtered);
        },
        (error) => {
          console.warn('Real-time assistant sessions listener error:', error);
          onUpdate(
            localSessionsStore.filter(
              (s) =>
                s.assistantId === assistantId ||
                s.assistantId === 'ast-1' ||
                (assistantName && s.assistantName === assistantName)
            )
          );
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('Could not setup Firestore onSnapshot for assistant sessions:', err);
    }
  }

  // Fallback lokal
  const sendLocal = () => {
    onUpdate(
      localSessionsStore.filter(
        (s) =>
          s.assistantId === assistantId ||
          s.assistantId === 'ast-1' ||
          (assistantName && s.assistantName === assistantName)
      )
    );
  };
  sendLocal();
  return subscribeSessions(sendLocal);
}

/**
 * Berlangganan (subscribe) real-time dokumen satu sesi praktikum berdasarkan ID.
 */
export function subscribeSessionDoc(
  sessionId: string,
  onUpdate: (session: PracticalSession | undefined) => void
): () => void {
  if (isFirebaseConfigured && sessionId) {
    try {
      const unsubscribe = onSnapshot(
        doc(db, 'sessions', sessionId),
        (docSnap) => {
          if (docSnap.exists()) {
            onUpdate({
              id: docSnap.id,
              ...(docSnap.data() as Omit<PracticalSession, 'id'>),
            });
          } else {
            onUpdate(localSessionsStore.find((s) => s.id === sessionId));
          }
        },
        (error) => {
          console.warn('Real-time session doc listener error:', error);
          onUpdate(localSessionsStore.find((s) => s.id === sessionId));
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Could not setup session doc onSnapshot:', err);
    }
  }

  onUpdate(localSessionsStore.find((s) => s.id === sessionId));
  return () => {};
}

/**
 * Mengambil dokumen sesi praktikum dari Firestore atau fallback lokal secara async.
 */
export async function getSessionDoc(
  sessionId: string
): Promise<PracticalSession | undefined> {
  if (!sessionId) return undefined;

  if (isFirebaseConfigured) {
    try {
      const snap = await getDoc(doc(db, 'sessions', sessionId));
      if (snap.exists()) {
        return {
          id: snap.id,
          ...(snap.data() as Omit<PracticalSession, 'id'>),
        };
      }
    } catch {
      // Fallback
    }
  }

  return localSessionsStore.find((s) => s.id === sessionId);
}

/**
 * Berlangganan (subscribe) real-time daftar sesi untuk praktikan dari Firestore
 */
export function subscribeStudentSessions(
  studentId: string,
  enrolledClasses: string[],
  onUpdate: (sessions: PracticalSession[]) => void
): () => void {
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'sessions'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const allSessions: PracticalSession[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<PracticalSession, 'id'>),
          }));

          const normalizedClasses = enrolledClasses.map((c) => c.toUpperCase());
          const filtered = allSessions.filter(
            (s) =>
              normalizedClasses.length === 0 ||
              normalizedClasses.includes((s.classCode || '').toUpperCase())
          );
          onUpdate(filtered.length > 0 ? filtered : allSessions);
        },
        (error) => {
          console.warn('Real-time student sessions error:', error);
          onUpdate(localSessionsStore);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Could not setup student sessions onSnapshot:', err);
    }
  }

  const sendLocal = () => onUpdate(localSessionsStore);
  sendLocal();
  return subscribeSessions(sendLocal);
}

/**
 * Mengambil sesi praktikum berdasarkan ID dari store lokal (fallback / lookup cepat).
 */
export function getSessionById(sessionId: string): PracticalSession | undefined {
  return localSessionsStore.find((s) => s.id === sessionId);
}

/**
 * 1. Membuat jadwal sesi praktikum baru di koleksi Firestore `sessions` (SRS-CRUD-01).
 */
export async function createSession(
  sessionData: Omit<PracticalSession, 'id'>
): Promise<string> {
  if (!sessionData.courseName.trim()) {
    throw new Error('Nama mata kuliah wajib diisi.');
  }
  if (!sessionData.room.trim()) {
    throw new Error('Ruangan praktikum wajib diisi.');
  }

  if (isFirebaseConfigured) {
    const docRef = await addDoc(collection(db, 'sessions'), {
      ...sessionData,
      courseName: sessionData.courseName.trim(),
      classCode: (sessionData.classCode || 'A1').trim(),
      room: sessionData.room.trim(),
    });
    notifySessionListeners();
    return docRef.id;
  }

  const newId = `session-${Date.now()}`;
  const created: PracticalSession = {
    ...sessionData,
    id: newId,
    courseName: sessionData.courseName.trim(),
    classCode: (sessionData.classCode || 'A1').trim(),
    room: sessionData.room.trim(),
  };
  localSessionsStore = [created, ...localSessionsStore];
  notifySessionListeners();
  return newId;
}

/**
 * 2. Mengambil daftar sesi praktikum yang diampu oleh asisten tertentu (SRS-CRUD-01).
 */
export async function getSessionsForAssistant(
  assistantId: string
): Promise<PracticalSession[]> {
  if (!assistantId) return [];

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, 'sessions'),
        where('assistantId', '==', assistantId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<PracticalSession, 'id'>),
      }));
    } catch {
      // Fallback ke store lokal bila jaringan tidak tersedia
    }
  }

  return localSessionsStore.filter((s) => s.assistantId === assistantId);
}

/**
 * 3. Mengambil daftar jadwal dan informasi sesi praktikum yang berkaitan dengan akun/kelas praktikan (SRS-CRUD-02).
 */
export async function getSessionsForStudent(
  studentId: string,
  studentClasses: string[]
): Promise<PracticalSession[]> {
  const normalizedClasses = studentClasses
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  if (isFirebaseConfigured) {
    try {
      if (normalizedClasses.length > 0) {
        const q = query(
          collection(db, 'sessions'),
          where('classCode', 'in', normalizedClasses.slice(0, 10))
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PracticalSession, 'id'>),
        }));
      }

      const enrolledQ = query(
        collection(db, 'classes'),
        where('studentIds', 'array-contains', studentId)
      );
      const classSnap = await getDocs(enrolledQ);
      const codes = classSnap.docs
        .map((d) => (d.data().classCode as string | undefined)?.toUpperCase())
        .filter((c): c is string => Boolean(c));

      if (codes.length > 0) {
        const sessionQ = query(
          collection(db, 'sessions'),
          where('classCode', 'in', codes.slice(0, 10))
        );
        const sessionSnap = await getDocs(sessionQ);
        return sessionSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PracticalSession, 'id'>),
        }));
      }
    } catch {
      // Fallback ke store lokal bila jaringan tidak tersedia
    }
  }

  // Resolusi kelas praktikan dari parameter atau daftar kelas lokal
  const enrolledClassCodes =
    normalizedClasses.length > 0
      ? normalizedClasses
      : localClassesStore
          .filter((cls) => cls.studentIds.includes(studentId))
          .map((cls) => cls.classCode.toUpperCase());

  if (enrolledClassCodes.length === 0) {
    return [...localSessionsStore];
  }

  return localSessionsStore.filter((s) =>
    enrolledClassCodes.includes(s.classCode.toUpperCase())
  );
}

/**
 * 4. Memperbarui data jadwal atau status sesi praktikum di Firestore (SRS-CRUD-01).
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<PracticalSession>
): Promise<void> {
  if (!sessionId) {
    throw new Error('ID sesi wajib disertakan untuk pembaruan.');
  }

  if (isFirebaseConfigured) {
    const cleanUpdates = { ...updates };
    delete cleanUpdates.id;
    await updateDoc(doc(db, 'sessions', sessionId), cleanUpdates);
    notifySessionListeners();
    return;
  }

  localSessionsStore = localSessionsStore.map((session) =>
    session.id === sessionId ? { ...session, ...updates, id: sessionId } : session
  );
  notifySessionListeners();
}

/**
 * 5. Menghapus jadwal sesi praktikum dari Firestore (SRS-CRUD-01).
 */
export async function deleteSession(sessionId: string): Promise<void> {
  if (!sessionId) {
    throw new Error('ID sesi wajib disertakan untuk penghapusan.');
  }

  if (isFirebaseConfigured) {
    await deleteDoc(doc(db, 'sessions', sessionId));
    notifySessionListeners();
    return;
  }

  localSessionsStore = localSessionsStore.filter((s) => s.id !== sessionId);
  notifySessionListeners();
}

/**
 * 6. Membuat data Kelas baru di koleksi Firestore `classes` (SRS-CRUD-01).
 */
export async function createClass(
  classData: Omit<PracticalClass, 'id'>
): Promise<string> {
  if (isFirebaseConfigured) {
    const docRef = await addDoc(collection(db, 'classes'), classData);
    notifySessionListeners();
    return docRef.id;
  }

  const newId = `class-${Date.now()}`;
  localClassesStore = [{ ...classData, id: newId }, ...localClassesStore];
  notifySessionListeners();
  return newId;
}

/**
 * 7. Mengambil daftar Kelas dari koleksi Firestore `classes` (SRS-CRUD-01).
 */
export async function getClasses(
  assistantId?: string
): Promise<PracticalClass[]> {
  if (isFirebaseConfigured) {
    try {
      const ref = collection(db, 'classes');
      const q = assistantId
        ? query(ref, where('assistantId', '==', assistantId))
        : ref;
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<PracticalClass, 'id'>),
      }));
    } catch {
      // Fallback ke store lokal
    }
  }

  if (assistantId) {
    return localClassesStore.filter((c) => c.assistantId === assistantId);
  }
  return [...localClassesStore];
}

/**
 * 8. Memperbarui data Kelas di koleksi Firestore `classes` (SRS-CRUD-01).
 */
export async function updateClass(
  classId: string,
  updates: Partial<PracticalClass>
): Promise<void> {
  if (isFirebaseConfigured) {
    const cleanUpdates = { ...updates };
    delete cleanUpdates.id;
    await updateDoc(doc(db, 'classes', classId), cleanUpdates);
    notifySessionListeners();
    return;
  }

  localClassesStore = localClassesStore.map((cls) =>
    cls.id === classId ? { ...cls, ...updates, id: classId } : cls
  );
  notifySessionListeners();
}

/**
 * 9. Menghapus data Kelas dari koleksi Firestore `classes` (SRS-CRUD-01).
 */
export async function deleteClass(classId: string): Promise<void> {
  if (isFirebaseConfigured) {
    await deleteDoc(doc(db, 'classes', classId));
    notifySessionListeners();
    return;
  }

  localClassesStore = localClassesStore.filter((cls) => cls.id !== classId);
  notifySessionListeners();
}

/**
 * 10. Menambahkan peserta (Praktikan) ke dalam Kelas tertentu di Firestore (SRS-CRUD-01).
 */
export async function enrollStudentToClass(
  classId: string,
  studentId: string
): Promise<void> {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'classes', classId), {
      studentIds: arrayUnion(studentId),
    });
    notifySessionListeners();
    return;
  }

  localClassesStore = localClassesStore.map((cls) => {
    if (cls.id !== classId) return cls;
    if (cls.studentIds.includes(studentId)) return cls;
    return { ...cls, studentIds: [...cls.studentIds, studentId] };
  });
  notifySessionListeners();
}

/**
 * 11. Menghapus peserta (Praktikan) dari Kelas tertentu di Firestore (SRS-CRUD-01).
 */
export async function removeStudentFromClass(
  classId: string,
  studentId: string
): Promise<void> {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'classes', classId), {
      studentIds: arrayRemove(studentId),
    });
    notifySessionListeners();
    return;
  }

  localClassesStore = localClassesStore.map((cls) =>
    cls.id === classId
      ? {
          ...cls,
          studentIds: cls.studentIds.filter((id) => id !== studentId),
        }
      : cls
  );
  notifySessionListeners();
}

/**
 * 12. Mengambil daftar profil Peserta (Praktikan) yang terdaftar di suatu kelas (SRS-CRUD-01).
 */
export async function getStudentsByClass(
  classCode: string
): Promise<UserProfile[]> {
  const normalizedCode = classCode.trim().toUpperCase();

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'STUDENT'),
        where('enrolledClasses', 'array-contains', normalizedCode)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: (data.name as string) || 'Praktikan',
          role: 'STUDENT',
          identifier: (data.identifier as string) || '-',
        };
      });
    } catch {
      // Fallback ke store lokal
    }
  }

  const targetClass = localClassesStore.find(
    (c) => c.classCode.toUpperCase() === normalizedCode
  );
  if (!targetClass) {
    return MOCK_USERS.filter((u) => u.role === 'STUDENT');
  }

  return MOCK_USERS.filter(
    (u) => u.role === 'STUDENT' && targetClass.studentIds.includes(u.id)
  );
}
