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
import { isSessionExpired } from '@/store/rules';
import { PracticalClass, PracticalSession, UserProfile } from '@/types/attendance';
import { db, isFirebaseConfigured } from './firebase';

export { PracticalClass } from '@/types/attendance';

/**
 * Memastikan payload yang dikirim ke Cloud Firestore bebas dari nilai `undefined`.
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export const DEFAULT_CLASSES: PracticalClass[] = [
  {
    id: 'class-a1',
    classCode: 'A1',
    courseName: 'Basis Data Lanjut',
    room: 'Lab Basis Data',
    assistantId: 'EW1rsd5cTZR6iW0xDQdchJ4CYdd2',
    assistantName: 'Crystiano Bayu Satya Alves, Herman',
    assistantIds: ['EW1rsd5cTZR6iW0xDQdchJ4CYdd2', 'iUuzqYziLZhWndnZdh9bx4NRsSe2'],
    assistantNames: ['Crystiano Bayu Satya Alves', 'Herman'],
    studentJoinCode: 'BDL-A1-101',
    assistantInviteCode: 'ASP-BDL-A1-201',
    studentIds: [
      'mDZOvU3OiKUl037f9C1DuX5O6IH3',
      'JptPsdlcQPeUg9tVahmaaJGFcR23',
      'wgxCVH0QxiZ7VsEYPQprqW6KKAJ3',
    ],
    isOpen: true,
  },
  {
    id: 'class-b2',
    classCode: 'B2',
    courseName: 'Struktur Data & Algoritma',
    room: 'Lab Komputer 1',
    assistantId: 'SxbmMvFvLcRUPSEhOiyJRfNpOzg1',
    assistantName: 'Muhammad Zaidan Alfarizi, Herman',
    assistantIds: ['SxbmMvFvLcRUPSEhOiyJRfNpOzg1', 'iUuzqYziLZhWndnZdh9bx4NRsSe2'],
    assistantNames: ['Muhammad Zaidan Alfarizi', 'Herman'],
    studentJoinCode: 'SDA-B2-102',
    assistantInviteCode: 'ASP-SDA-B2-202',
    studentIds: [
      'mDZOvU3OiKUl037f9C1DuX5O6IH3',
      'MMu4kWP6WKaAhKvSDDiCJ5Jjhxw1',
      'wgxCVH0QxiZ7VsEYPQprqW6KKAJ3',
    ],
    isOpen: true,
  },
  {
    id: 'class-c1',
    classCode: 'C1',
    courseName: 'Pemrograman Perangkat Keras',
    room: 'Lab Komputer 2',
    assistantId: 'SxbmMvFvLcRUPSEhOiyJRfNpOzg1',
    assistantName: 'Muhammad Zaidan Alfarizi, Crystiano Bayu Satya Alves',
    assistantIds: ['SxbmMvFvLcRUPSEhOiyJRfNpOzg1', 'EW1rsd5cTZR6iW0xDQdchJ4CYdd2'],
    assistantNames: ['Muhammad Zaidan Alfarizi', 'Crystiano Bayu Satya Alves'],
    studentJoinCode: 'PPK-C1-103',
    assistantInviteCode: 'ASP-PPK-C1-203',
    studentIds: [
      'mDZOvU3OiKUl037f9C1DuX5O6IH3',
      'JptPsdlcQPeUg9tVahmaaJGFcR23',
      'MMu4kWP6WKaAhKvSDDiCJ5Jjhxw1',
      'wgxCVH0QxiZ7VsEYPQprqW6KKAJ3',
    ],
    isOpen: true,
  },
];

const STOPWORDS = new Set(['DAN', 'ATAU', 'DENGAN', 'UNTUK', 'PADA', 'DI', 'KE', 'DARI', 'OF', 'AND']);

/**
 * Menghasilkan singkatan nama mata kuliah (contoh: "Pemrograman Perangkat Keras" -> "PPK",
 * "Basis Data Lanjut" -> "BDL", "Struktur Data & Algoritma" -> "SDA", "Jaringan Komputer" -> "JK").
 */
export function generateCoursePrefix(courseName: string): string {
  const words = courseName
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.toUpperCase())
    .filter((w) => w.length > 0 && !STOPWORDS.has(w));

  if (words.length >= 2) {
    return words
      .slice(0, 4)
      .map((w) => w[0])
      .join('');
  }
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return 'PPK';
}

function randomDigits(len: number = 3): string {
  const min = Math.pow(10, len - 1);
  const max = Math.pow(10, len) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

/**
 * Memastikan setiap objek PracticalClass memiliki field assistantIds, assistantNames,
 * studentJoinCode, dan assistantInviteCode dengan format: [SINGKATAN]-[KELAS]-[NOMOR_RANDOM].
 */
export function normalizePracticalClass(cls: PracticalClass): PracticalClass {
  const assistantIds =
    cls.assistantIds && cls.assistantIds.length > 0
      ? cls.assistantIds
      : cls.assistantId
      ? [cls.assistantId]
      : [];
  const assistantNames =
    cls.assistantNames && cls.assistantNames.length > 0
      ? cls.assistantNames
      : cls.assistantName && cls.assistantName !== 'Belum Ditugaskan'
      ? cls.assistantName.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  const prefix = generateCoursePrefix(cls.courseName || 'Praktikum');
  const codeClean = (cls.classCode || 'A1').toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Deterministic 3-digit number fallback jika dokumen belum punya kode
  let hashNum = 100;
  const seedStr = `${cls.id || ''}-${prefix}-${codeClean}`;
  for (let i = 0; i < seedStr.length; i++) {
    hashNum = (hashNum * 31 + seedStr.charCodeAt(i)) % 900;
  }
  const deterministic3Digit = String(100 + Math.abs(hashNum));
  const deterministicAst3Digit = String(100 + ((Math.abs(hashNum) + 137) % 900));

  const studentJoinCode = (
    cls.studentJoinCode || `${prefix}-${codeClean}-${deterministic3Digit}`
  ).toUpperCase();
  const assistantInviteCode = (
    cls.assistantInviteCode || `ASP-${prefix}-${codeClean}-${deterministicAst3Digit}`
  ).toUpperCase();

  return {
    ...cls,
    assistantId: assistantIds[0] || '',
    assistantName:
      assistantNames.length > 0 ? assistantNames.join(', ') : 'Belum Ditugaskan',
    assistantIds,
    assistantNames,
    studentJoinCode,
    assistantInviteCode,
    studentIds: cls.studentIds || [],
    isOpen: cls.isOpen !== false,
  };
}

export type SessionListener = () => void;

const sessionListeners = new Set<SessionListener>();
let localSessionsStore: PracticalSession[] = [...MOCK_SESSIONS];

let localClassesStore: PracticalClass[] = [...DEFAULT_CLASSES];

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
  const firstName = (assistantName || '').toLowerCase().split(' ')[0];

  const filterForAssistant = (allSessions: PracticalSession[]) => {
    const myClassIds = new Set<string>();
    const myClassCodes = new Set<string>();

    localClassesStore.forEach((cls) => {
      const ids = cls.assistantIds || (cls.assistantId ? [cls.assistantId] : []);
      const names = cls.assistantNames || (cls.assistantName ? [cls.assistantName] : []);
      const isMine =
        ids.includes(assistantId) ||
        (Boolean(firstName) && names.some((n) => n.toLowerCase().includes(firstName)));
      if (isMine) {
        myClassIds.add(cls.id);
        myClassCodes.add(cls.classCode.toUpperCase());
      }
    });

    return allSessions.filter((s) => {
      const directOwner =
        s.assistantId === assistantId ||
        (Boolean(firstName) &&
          (s.assistantName || '').toLowerCase().includes(firstName));
      const coAssistantClass =
        (s.classId && myClassIds.has(s.classId)) ||
        myClassCodes.has((s.classCode || '').toUpperCase());
      return directOwner || coAssistantClass;
    });
  };

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

          // Periksa dan otomatis tutup sesi yang telah berakhir jam praktikumnya
          checkAndAutoCloseExpiredSessions(allSessions);

          onUpdate(filterForAssistant(allSessions));
        },
        (error) => {
          console.warn('Real-time assistant sessions listener error:', error);
          onUpdate(filterForAssistant(localSessionsStore));
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('Could not setup Firestore onSnapshot for assistant sessions:', err);
    }
  }

  // Fallback lokal
  const sendLocal = () => {
    onUpdate(filterForAssistant(localSessionsStore));
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

          // Periksa dan otomatis tutup sesi yang telah berakhir jam praktikumnya
          checkAndAutoCloseExpiredSessions(allSessions);

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
 * Memeriksa seluruh sesi yang berstatus 'OPEN'. Bila jam praktikum telah lewat,
 * ubah status menjadi 'CLOSED' secara otomatis (baik di Firestore maupun lokal).
 */
let isAutoClosing = false;
export async function checkAndAutoCloseExpiredSessions(
  sessions?: PracticalSession[]
): Promise<void> {
  if (isAutoClosing) return;
  isAutoClosing = true;
  try {
    const target = sessions || localSessionsStore;
    const now = new Date();
    for (const s of target) {
      if (s.status === 'OPEN') {
        const { expired } = isSessionExpired(s, now);
        if (expired) {
          // Tutup sesi otomatis
          await updateSession(s.id, { status: 'CLOSED' });
        }
      }
    }
  } catch (err) {
    console.warn('Gagal memeriksa penutupan otomatis sesi:', err);
  } finally {
    isAutoClosing = false;
  }
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
    const rawData = {
      ...sessionData,
      courseName: sessionData.courseName.trim(),
      classCode: (sessionData.classCode || 'A1').trim(),
      room: sessionData.room.trim(),
      deliveryMode: sessionData.deliveryMode || 'OFFLINE',
    };
    const cleanData = sanitizeForFirestore(rawData);
    const docRef = await addDoc(collection(db, 'sessions'), cleanData);
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
    deliveryMode: sessionData.deliveryMode || 'OFFLINE',
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
    const cleanUpdates = sanitizeForFirestore(updates);
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

// ==========================================
// 13. SISTEM KELAS ALA GOOGLE CLASSROOM (BUAT KELAS, KODE UNDANGAN & KELUAR KELAS)
// ==========================================

export function getLocalClassesStore(): PracticalClass[] {
  return localClassesStore.map(normalizePracticalClass);
}

/**
 * Asisten membuat Kelas Praktikum baru dan otomatis men-generate:
 * 1. `studentJoinCode` (Kode Kelas Praktikan)
 * 2. `assistantInviteCode` (Kode Spesial Undangan Rekan Asprak)
 */
export async function createClassroomByAssistant(input: {
  courseName: string;
  classCode: string;
  room: string;
  assistantId: string;
  assistantName: string;
}): Promise<PracticalClass> {
  const trimmedCourse = input.courseName.trim();
  const trimmedCode = input.classCode.trim().toUpperCase();
  const trimmedRoom = input.room.trim();

  if (!trimmedCourse) {
    throw new Error('Nama mata kuliah praktikum wajib diisi.');
  }
  if (!trimmedCode) {
    throw new Error('Kode kelas (misal A1, B2) wajib diisi.');
  }
  if (!trimmedRoom) {
    throw new Error('Ruangan praktikum wajib diisi.');
  }

  const prefix = generateCoursePrefix(trimmedCourse);
  const codeClean = trimmedCode.replace(/[^A-Z0-9]/g, '');
  const studentJoinCode = `${prefix}-${codeClean}-${randomDigits(3)}`;
  const assistantInviteCode = `ASP-${prefix}-${codeClean}-${randomDigits(3)}`;

  const payload: Omit<PracticalClass, 'id'> = {
    courseName: trimmedCourse,
    classCode: trimmedCode,
    room: trimmedRoom,
    assistantId: input.assistantId,
    assistantName: input.assistantName,
    assistantIds: [input.assistantId],
    assistantNames: [input.assistantName],
    studentJoinCode,
    assistantInviteCode,
    studentIds: [],
    isOpen: true,
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured) {
    try {
      const docRef = await addDoc(
        collection(db, 'classes'),
        sanitizeForFirestore(payload)
      );
      const created: PracticalClass = { ...payload, id: docRef.id };
      localClassesStore = [created, ...localClassesStore];
      notifySessionListeners();
      return created;
    } catch (err) {
      console.warn('Fallback local createClassroomByAssistant:', err);
    }
  }

  const newId = `class-${Date.now()}`;
  const created: PracticalClass = { ...payload, id: newId };
  localClassesStore = [created, ...localClassesStore];
  notifySessionListeners();
  return created;
}

/**
 * Mencari kelas berdasarkan kode undangan (`studentJoinCode` untuk STUDENT, `assistantInviteCode` untuk ASSISTANT)
 * untuk menampilkan modal pratinjau konfirmasi sebelum benar-benar bergabung.
 */
export async function lookupClassByInviteCode(
  rawCode: string,
  targetRole: 'STUDENT' | 'ASSISTANT'
): Promise<PracticalClass> {
  const cleaned = rawCode.trim().toUpperCase();
  if (!cleaned) {
    throw new Error('Silakan masukkan kode kelas terlebih dahulu.');
  }

  let candidateList: PracticalClass[] = localClassesStore.map(normalizePracticalClass);

  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, 'classes'));
      const remoteList = snap.docs.map((d) =>
        normalizePracticalClass({
          id: d.id,
          ...(d.data() as Omit<PracticalClass, 'id'>),
        })
      );
      const mergedMap = new Map<string, PracticalClass>();
      candidateList.forEach((c) => mergedMap.set(c.id, c));
      remoteList.forEach((c) => mergedMap.set(c.id, c));
      candidateList = Array.from(mergedMap.values());
    } catch {
      // Fallback to local
    }
  }

  if (targetRole === 'ASSISTANT') {
    const matched = candidateList.find(
      (c) => (c.assistantInviteCode || '').toUpperCase() === cleaned
    );
    if (!matched) {
      // Cek apakah asprak salah memasukkan kode praktikan
      const wrongStudentCode = candidateList.find(
        (c) => (c.studentJoinCode || '').toUpperCase() === cleaned
      );
      if (wrongStudentCode) {
        throw new Error(
          'Kode yang Anda masukkan adalah Kode Praktikan. Gunakan Kode Spesial Asprak (diawali ASP-) dari rekan asprak kelas tersebut.'
        );
      }
      throw new Error(
        'Kode Spesial Asprak tidak ditemukan. Pastikan kode undangan dari rekan asprak sudah benar.'
      );
    }
    return matched;
  } else {
    const matched = candidateList.find(
      (c) => (c.studentJoinCode || '').toUpperCase() === cleaned
    );
    if (!matched) {
      const wrongAstCode = candidateList.find(
        (c) => (c.assistantInviteCode || '').toUpperCase() === cleaned
      );
      if (wrongAstCode) {
        throw new Error(
          'Kode tersebut adalah Kode Spesial Asisten. Praktikan hanya dapat bergabung menggunakan Kode Kelas Praktikan.'
        );
      }
      throw new Error(
        'Kode Kelas Praktikan tidak ditemukan. Periksa kembali kode yang diberikan oleh asisten praktikum Anda.'
      );
    }
    if (matched.isOpen === false) {
      throw new Error(
        `Kelas ${matched.courseName} (${matched.classCode}) saat ini sedang ditutup untuk pendaftaran baru.`
      );
    }
    return matched;
  }
}

/**
 * Asisten bergabung ke kelas yang dibuat rekan asprak lain menggunakan konfirmasi setelah lookup.
 */
export async function confirmJoinClassAsAssistant(
  targetClass: PracticalClass,
  assistantId: string,
  assistantName: string
): Promise<PracticalClass> {
  const norm = normalizePracticalClass(targetClass);
  const existingIds = norm.assistantIds || [];
  const existingNames = norm.assistantNames || [];

  if (
    existingIds.includes(assistantId) ||
    existingNames.some((n) => n.toLowerCase() === assistantName.toLowerCase())
  ) {
    throw new Error(
      `Anda sudah terdaftar sebagai asisten di kelas ${norm.courseName} (${norm.classCode}).`
    );
  }

  const nextIds = [...existingIds, assistantId];
  const nextNames = [...existingNames, assistantName];
  const updates: Partial<PracticalClass> = {
    assistantId: nextIds[0] || assistantId,
    assistantName: nextNames.join(', '),
    assistantIds: nextIds,
    assistantNames: nextNames,
  };

  if (isFirebaseConfigured) {
    try {
      await updateDoc(
        doc(db, 'classes', norm.id),
        sanitizeForFirestore(updates)
      );
    } catch {
      // Fallback
    }
  }

  const existsLocally = localClassesStore.some((c) => c.id === norm.id);
  if (existsLocally) {
    localClassesStore = localClassesStore.map((c) =>
      c.id === norm.id ? normalizePracticalClass({ ...c, ...updates }) : c
    );
  } else {
    localClassesStore = [
      normalizePracticalClass({ ...norm, ...updates }),
      ...localClassesStore,
    ];
  }

  // Update juga assistantName pada semua sesi yang berada di kelas ini
  const combinedAssistantName = nextNames.join(', ');
  localSessionsStore = localSessionsStore.map((s) =>
    s.classId === norm.id ||
    (s.classCode.toUpperCase() === norm.classCode.toUpperCase() &&
      (!norm.courseName ||
        s.courseName.toLowerCase() === norm.courseName.toLowerCase()))
      ? { ...s, assistantName: combinedAssistantName }
      : s
  );

  if (isFirebaseConfigured) {
    try {
      const sessSnap = await getDocs(
        query(collection(db, 'sessions'), where('classCode', '==', norm.classCode))
      );
      for (const sDoc of sessSnap.docs) {
        const sData = sDoc.data();
        if (
          sData.classId === norm.id ||
          !norm.courseName ||
          (sData.courseName || '').toLowerCase() === norm.courseName.toLowerCase()
        ) {
          await updateDoc(doc(db, 'sessions', sDoc.id), {
            assistantName: combinedAssistantName,
          });
        }
      }
    } catch {
      // Fallback
    }
  }

  notifySessionListeners();
  return normalizePracticalClass({ ...norm, ...updates });
}

/**
 *Asisten keluar dari kelas praktikum (misal saat semester telah berakhir atau pindah kelas).
 */
export async function leaveClassAsAssistant(
  classId: string,
  assistantId: string,
  assistantName: string
): Promise<void> {
  let target = localClassesStore.find((c) => c.id === classId);
  if (isFirebaseConfigured) {
    try {
      const snap = await getDoc(doc(db, 'classes', classId));
      if (snap.exists()) {
        target = {
          id: snap.id,
          ...(snap.data() as Omit<PracticalClass, 'id'>),
        };
      }
    } catch {
      // Fallback
    }
  }

  if (!target) {
    throw new Error('Data kelas tidak ditemukan.');
  }

  const norm = normalizePracticalClass(target);
  const nextIds = (norm.assistantIds || []).filter((id) => id !== assistantId);
  const firstName = assistantName.toLowerCase().split(' ')[0];
  const nextNames = (norm.assistantNames || []).filter(
    (name) =>
      name.toLowerCase() !== assistantName.toLowerCase() &&
      !name.toLowerCase().includes(firstName)
  );

  const updates: Partial<PracticalClass> = {
    assistantId: nextIds[0] || '',
    assistantName:
      nextNames.length > 0 ? nextNames.join(', ') : 'Belum Ditugaskan',
    assistantIds: nextIds,
    assistantNames: nextNames,
  };

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'classes', classId), sanitizeForFirestore(updates));
    } catch {
      // Fallback
    }
  }

  localClassesStore = localClassesStore.map((c) =>
    c.id === classId ? normalizePracticalClass({ ...c, ...updates }) : c
  );
  notifySessionListeners();
}

/**
 * Praktikan bergabung ke kelas setelah melihat konfirmasi Nama Kelas + Nama Asprak.
 */
export async function confirmJoinClassAsStudent(
  targetClass: PracticalClass,
  studentId: string
): Promise<PracticalClass> {
  const norm = normalizePracticalClass(targetClass);
  const existingStudents = norm.studentIds || [];

  if (existingStudents.includes(studentId)) {
    throw new Error(
      `Anda sudah tergabung di kelas ${norm.courseName} (${norm.classCode}).`
    );
  }

  const nextStudents = [...existingStudents, studentId];

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'classes', norm.id), {
        studentIds: arrayUnion(studentId),
      });
      await updateDoc(doc(db, 'users', studentId), {
        enrolledClasses: arrayUnion(norm.classCode.toUpperCase()),
      });
    } catch {
      // Fallback
    }
  }

  const existsLocally = localClassesStore.some((c) => c.id === norm.id);
  if (existsLocally) {
    localClassesStore = localClassesStore.map((c) =>
      c.id === norm.id ? { ...c, studentIds: nextStudents } : c
    );
  } else {
    localClassesStore = [
      { ...norm, studentIds: nextStudents },
      ...localClassesStore,
    ];
  }
  notifySessionListeners();
  return { ...norm, studentIds: nextStudents };
}

/**
 * Praktikan keluar dari kelas praktikum (misal jika jadwal mata kuliah berganti/tabrakan atau semester selesai).
 */
export async function leaveClassAsStudent(
  targetClass: PracticalClass,
  studentId: string
): Promise<void> {
  const norm = normalizePracticalClass(targetClass);
  const nextStudents = (norm.studentIds || []).filter((id) => id !== studentId);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'classes', norm.id), {
        studentIds: arrayRemove(studentId),
      });
    } catch {
      // Fallback
    }
  }

  localClassesStore = localClassesStore.map((c) =>
    c.id === norm.id ? { ...c, studentIds: nextStudents } : c
  );
  notifySessionListeners();
}
