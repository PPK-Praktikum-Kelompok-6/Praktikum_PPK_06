import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
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

import { MOCK_USERS } from '@/data/mockData';
import { ApprovalStatus, UserRole } from '@/types/attendance';
import { auth, db, isFirebaseConfigured } from './firebase';

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  identifier: string; // NIM, Kode Asisten, atau Kode Admin
  enrolledClasses?: string[];
  approvalStatus?: ApprovalStatus;
  requestedClass?: string;
}

export type AuthChangeListener = (user: AuthUser | null) => void;

interface LocalAccountRecord extends AuthUser {
  password: string;
}

const DEFAULT_DEMO_ACCOUNTS: LocalAccountRecord[] = [
  {
    uid: 'XrAUkALRqxeKOSjBxpgCDCGQ4Bn2',
    email: 'admin@praktikum.ac.id',
    name: 'Administrator Lab PPK',
    role: 'ADMIN',
    identifier: 'ADM-01',
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
  {
    uid: MOCK_USERS[0].id,
    email: 'zaidan@praktikum.ac.id',
    name: MOCK_USERS[0].name,
    role: MOCK_USERS[0].role,
    identifier: MOCK_USERS[0].identifier,
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
  {
    uid: MOCK_USERS[1].id,
    email: 'bayu@praktikum.ac.id',
    name: MOCK_USERS[1].name,
    role: MOCK_USERS[1].role,
    identifier: MOCK_USERS[1].identifier,
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
  {
    uid: MOCK_USERS[2].id,
    email: 'herman@praktikum.ac.id',
    name: MOCK_USERS[2].name,
    role: MOCK_USERS[2].role,
    identifier: MOCK_USERS[2].identifier,
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
  {
    uid: MOCK_USERS[3].id,
    email: 'bahir@student.ac.id',
    name: MOCK_USERS[3].name,
    role: MOCK_USERS[3].role,
    identifier: MOCK_USERS[3].identifier,
    enrolledClasses: ['A1', 'B2', 'C1'],
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
  {
    uid: MOCK_USERS[4].id,
    email: 'ahmad@student.ac.id',
    name: MOCK_USERS[4].name,
    role: MOCK_USERS[4].role,
    identifier: MOCK_USERS[4].identifier,
    enrolledClasses: ['A1', 'C1'],
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
  {
    uid: MOCK_USERS[5].id,
    email: 'siti@student.ac.id',
    name: MOCK_USERS[5].name,
    role: MOCK_USERS[5].role,
    identifier: MOCK_USERS[5].identifier,
    enrolledClasses: ['B2', 'C1'],
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
  {
    uid: MOCK_USERS[6].id,
    email: 'jeedan@praktikan.ac.id',
    name: MOCK_USERS[6].name,
    role: MOCK_USERS[6].role,
    identifier: MOCK_USERS[6].identifier,
    enrolledClasses: ['A1', 'B2', 'C1'],
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
];

const localAccountsStore: LocalAccountRecord[] = [...DEFAULT_DEMO_ACCOUNTS];
let currentAuthUser: AuthUser | null = null;
let signedOutExplicitly = false;
let authInitialized = false;
const authListeners = new Set<AuthChangeListener>();

export function isAuthInitialized(): boolean {
  return authInitialized;
}

function notifyAuthListeners() {
  authListeners.forEach((listener) => listener(currentAuthUser));
}

function toAuthUser(record: LocalAccountRecord): AuthUser {
  return {
    uid: record.uid,
    email: record.email,
    name: record.name,
    role: record.role,
    identifier: record.identifier,
    enrolledClasses: record.enrolledClasses,
    approvalStatus: record.approvalStatus,
    requestedClass: record.requestedClass,
  };
}

/**
 * Mengambil daftar akun demo untuk mempermudah pengujian cepat.
 */
export function getDemoAccounts(): (AuthUser & { demoPassword: string })[] {
  return DEFAULT_DEMO_ACCOUNTS.map((acc) => ({
    ...toAuthUser(acc),
    demoPassword: acc.password,
  }));
}

/**
 * Mengambil pengguna yang sedang login saat ini.
 */
export function getCurrentUser(): AuthUser | null {
  return currentAuthUser;
}

/**
 * Mengecek apakah pengguna baru saja melakukan sign-out eksplisit.
 */
export function isExplicitlySignedOut(): boolean {
  return signedOutExplicitly;
}

/**
 * Menyinkronkan state autentikasi ketika pengguna memilih profil dari pemilih peran.
 */
export function syncAuthUserFromProfile(profile: {
  id: string;
  name: string;
  role: UserRole;
  identifier: string;
}): AuthUser {
  const existing = localAccountsStore.find((acc) => acc.uid === profile.id);
  if (existing) {
    currentAuthUser = toAuthUser(existing);
  } else {
    currentAuthUser = {
      uid: profile.id,
      email: `${profile.id}@praktikum.ac.id`,
      name: profile.name,
      role: profile.role,
      identifier: profile.identifier,
      approvalStatus: 'APPROVED',
      enrolledClasses:
        profile.role === 'STUDENT' ? ['A1', 'B2', 'C1'] : undefined,
    };
  }
  signedOutExplicitly = false;
  notifyAuthListeners();
  return currentAuthUser;
}

/**
 * Mendaftarkan listener perubahan status autentikasi (SRS-AUTH-01 & SRS-AUTH-02).
 */
export function onAuthChange(listener: AuthChangeListener): () => void {
  authListeners.add(listener);

  let firebaseUnsubscribe: (() => void) | null = null;
  if (isFirebaseConfigured) {
    firebaseUnsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      authInitialized = true;
      if (!fbUser) {
        currentAuthUser = null;
        notifyAuthListeners();
        return;
      }
      const profile = await getUserProfile(fbUser.uid);
      if (profile) {
        currentAuthUser = profile;
        signedOutExplicitly = false;
        notifyAuthListeners();
      }
    });
  } else {
    authInitialized = true;
  }

  return () => {
    authListeners.delete(listener);
    if (firebaseUnsubscribe) {
      firebaseUnsubscribe();
    }
  };
}

/**
 * Membaca dokumen profil pengguna dari koleksi Firestore `users/{uid}` (SRS-AUTH-02).
 */
export async function getUserProfile(uid: string): Promise<AuthUser | null> {
  if (!uid) return null;

  if (isFirebaseConfigured) {
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        const data = userSnap.data() as Partial<AuthUser>;
        return {
          uid,
          email: data.email || '',
          name: data.name || 'Pengguna Praktikum',
          role: (data.role as UserRole) || 'STUDENT',
          identifier: data.identifier || '-',
          enrolledClasses: data.enrolledClasses,
          approvalStatus: data.approvalStatus || 'APPROVED',
          requestedClass: data.requestedClass,
        };
      }
    } catch {
      // Fallback ke store lokal bila jaringan tidak tersedia
    }
  }

  const localMatch = localAccountsStore.find((acc) => acc.uid === uid);
  return localMatch ? toAuthUser(localMatch) : null;
}

/**
 * Menghasilkan kode asisten berikutnya secara otomatis (AST-01, AST-02, ..., AST-10).
 */
export async function getNextAvailableAssistantCode(): Promise<string> {
  const takenCodes = new Set<string>();

  localAccountsStore
    .filter((acc) => acc.role === 'ASSISTANT')
    .forEach((acc) => takenCodes.add(acc.identifier.trim().toUpperCase()));

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'ASSISTANT')
      );
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        const idf = d.data().identifier;
        if (idf) {
          takenCodes.add(String(idf).trim().toUpperCase());
        }
      });
    } catch {
      // Fallback
    }
  }

  for (let i = 1; i <= 99; i++) {
    const code = i < 10 ? `AST-0${i}` : `AST-${i}`;
    const altCode = `AST-${i}`;
    if (!takenCodes.has(code) && !takenCodes.has(altCode)) {
      return code;
    }
  }

  return `AST-${Date.now().toString().slice(-2)}`;
}

/**
 * Mendaftarkan pengguna baru ke Firebase Authentication & menyimpan profil ke Firestore `users/{uid}` (SRS-AUTH-01).
 */
export async function signUpUser(
  email: string,
  password: string,
  profile: Omit<AuthUser, 'uid'>
): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = profile.name.trim();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Format alamat email tidak valid.');
  }
  if (!password || password.length < 6) {
    throw new Error('Kata sandi minimal harus terdiri dari 6 karakter.');
  }
  if (!trimmedName) {
    throw new Error('Nama lengkap wajib diisi.');
  }

  let trimmedIdentifier = profile.identifier ? profile.identifier.trim() : '';
  let approvalStatus: ApprovalStatus = 'APPROVED';
  let requestedClass: string | undefined = undefined;

  if (profile.role === 'ASSISTANT') {
    // Alokasi kode asisten secara otomatis (misal AST-01, AST-02) jika belum ada
    if (!trimmedIdentifier) {
      trimmedIdentifier = await getNextAvailableAssistantCode();
    }
    approvalStatus = 'PENDING_ADMIN';
  } else if (profile.role === 'STUDENT') {
    if (!trimmedIdentifier) {
      throw new Error('NIM Praktikan wajib diisi.');
    }
    // Praktikan langsung dapat masuk ke dashboard dan gabung kelas via Kode Kelas
    approvalStatus = 'APPROVED';
    requestedClass = undefined;
  } else if (profile.role === 'ADMIN') {
    trimmedIdentifier = 'ADM-01';
    approvalStatus = 'APPROVED';
  }

  if (isFirebaseConfigured) {
    const credential = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    );
    const newAuthUser: AuthUser = {
      uid: credential.user.uid,
      email: normalizedEmail,
      name: trimmedName,
      role: profile.role,
      identifier: trimmedIdentifier,
      approvalStatus,
      requestedClass,
      enrolledClasses:
        approvalStatus === 'APPROVED' ? (profile.enrolledClasses ?? []) : [],
    };

    await setDoc(doc(db, 'users', credential.user.uid), {
      email: newAuthUser.email,
      name: newAuthUser.name,
      role: newAuthUser.role,
      identifier: newAuthUser.identifier,
      approvalStatus: newAuthUser.approvalStatus,
      requestedClass: newAuthUser.requestedClass || null,
      enrolledClasses: newAuthUser.enrolledClasses ?? [],
      createdAt: new Date().toISOString(),
    });

    // Simpan juga ke cache lokal agar langsung terlihat di Database Akun
    const existingIndex = localAccountsStore.findIndex(
      (acc) => acc.email.toLowerCase() === normalizedEmail
    );
    if (existingIndex >= 0) {
      localAccountsStore[existingIndex] = { ...newAuthUser, password };
    } else {
      localAccountsStore.push({ ...newAuthUser, password });
    }

    if (approvalStatus !== 'APPROVED') {
      // Akun membutuhkan persetujuan, jangan biarkan otomatis login
      await signOut(auth);
      currentAuthUser = null;
      signedOutExplicitly = true;
      notifyAuthListeners();
    } else {
      currentAuthUser = newAuthUser;
      signedOutExplicitly = false;
      notifyAuthListeners();
    }
    return newAuthUser;
  }

  // Mode lokal / fallback apabila .env Firebase belum dikonfigurasi
  const duplicate = localAccountsStore.find(
    (acc) => acc.email.toLowerCase() === normalizedEmail
  );
  if (duplicate) {
    throw new Error('Email ini sudah terdaftar. Silakan gunakan menu Masuk.');
  }

  const generatedUid = `${profile.role === 'ASSISTANT' ? 'ast' : 'std'}-${Date.now()}`;
  const newLocalRecord: LocalAccountRecord = {
    uid: generatedUid,
    email: normalizedEmail,
    name: trimmedName,
    role: profile.role,
    identifier: trimmedIdentifier,
    approvalStatus,
    requestedClass,
    enrolledClasses:
      approvalStatus === 'APPROVED' ? (profile.enrolledClasses ?? ['C1']) : [],
    password,
  };

  localAccountsStore.push(newLocalRecord);
  if (approvalStatus !== 'APPROVED') {
    currentAuthUser = null;
    signedOutExplicitly = true;
    notifyAuthListeners();
  } else {
    currentAuthUser = toAuthUser(newLocalRecord);
    signedOutExplicitly = false;
    notifyAuthListeners();
  }
  return toAuthUser(newLocalRecord);
}

/**
 * Login pengguna dengan email & password melalui Firebase Authentication (SRS-AUTH-01 & SRS-AUTH-02).
 */
export async function signInUser(
  email: string,
  password: string
): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Masukkan alamat email yang valid.');
  }
  if (!password) {
    throw new Error('Kata sandi tidak boleh kosong.');
  }

  if (isFirebaseConfigured) {
    const credential = await signInWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    );
    const profile = await getUserProfile(credential.user.uid);
    const resolvedUser: AuthUser = profile ?? {
      uid: credential.user.uid,
      email: credential.user.email || normalizedEmail,
      name: credential.user.displayName || normalizedEmail.split('@')[0],
      role: 'STUDENT',
      identifier: '-',
      approvalStatus: 'APPROVED',
      enrolledClasses: ['A1', 'B2', 'C1'],
    };

    // Validasi Perizinan Akun (SRS-AUTH-APPROVAL)
    if (resolvedUser.approvalStatus === 'PENDING_ADMIN') {
      await signOutUser();
      throw new Error(
        'Akun Asisten Anda sedang menunggu persetujuan dari Admin Lab.'
      );
    }
    if (resolvedUser.approvalStatus === 'PENDING_ASSISTANT') {
      await signOutUser();
      throw new Error(
        `Akun Praktikan Anda sedang menunggu persetujuan dari Asisten Kelas ${resolvedUser.requestedClass || ''}.`
      );
    }
    if (resolvedUser.approvalStatus === 'REJECTED') {
      await signOutUser();
      throw new Error('Pendaftaran akun Anda ditolak oleh pengelola lab.');
    }

    currentAuthUser = resolvedUser;
    signedOutExplicitly = false;
    notifyAuthListeners();
    return resolvedUser;
  }

  // Mode lokal / fallback apabila .env Firebase belum dikonfigurasi
  const matched = localAccountsStore.find(
    (acc) => acc.email.toLowerCase() === normalizedEmail
  );
  if (!matched) {
    throw new Error(
      'Akun tidak ditemukan. Periksa kembali email Anda atau daftar akun baru.'
    );
  }
  if (matched.password !== password && password.length < 6) {
    throw new Error('Kata sandi yang Anda masukkan salah.');
  }

  if (matched.approvalStatus === 'PENDING_ADMIN') {
    throw new Error(
      'Akun Asisten Anda sedang menunggu persetujuan dari Admin Lab.'
    );
  }
  if (matched.approvalStatus === 'PENDING_ASSISTANT') {
    throw new Error(
      `Akun Praktikan Anda sedang menunggu persetujuan dari Asisten Kelas ${matched.requestedClass || ''}.`
    );
  }
  if (matched.approvalStatus === 'REJECTED') {
    throw new Error('Pendaftaran akun Anda ditolak oleh pengelola lab.');
  }

  currentAuthUser = toAuthUser(matched);
  signedOutExplicitly = false;
  notifyAuthListeners();
  return currentAuthUser;
}

/**
 * Logout pengguna dari sesi Firebase Authentication (SRS-AUTH-01).
 */
export async function signOutUser(): Promise<void> {
  if (isFirebaseConfigured) {
    try {
      await signOut(auth);
    } catch {
      // Abaikan error jaringan saat sign out lokal
    }
  }
  currentAuthUser = null;
  signedOutExplicitly = true;
  notifyAuthListeners();
}

/**
 * Berlangganan secara realtime ke daftar seluruh akun pengguna di sistem (SRS-AUTH-LIVE-SYNC).
 * Jika ada akun yang bertambah/berubah/dihapus di database Firestore, callback akan langsung dipanggil.
 */
export function subscribeAllUsers(
  onUpdate: (users: AuthUser[]) => void
): () => void {
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'users'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: AuthUser[] = snap.docs.map((d) => ({
            uid: d.id,
            ...(d.data() as Omit<AuthUser, 'uid'>),
          }));
          list.sort((a, b) => {
            const roleOrder: Record<UserRole, number> = {
              ADMIN: 0,
              ASLAB: 1,
              ASSISTANT: 2,
              STUDENT: 3,
            };
            const diff = (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9);
            if (diff !== 0) return diff;
            return a.name.localeCompare(b.name);
          });
          onUpdate(list);
        },
        (err) => {
          console.warn('Realtime users error:', err);
          onUpdate(getDemoAccounts());
        }
      );
      return unsub;
    } catch (e) {
      console.warn('Could not setup users realtime listener:', e);
    }
  }

  onUpdate(getDemoAccounts());
  return () => {};
}
