import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { MOCK_USERS } from '@/data/mockData';
import { UserRole } from '@/types/attendance';
import { auth, db, isFirebaseConfigured } from './firebase';

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  identifier: string; // NIM atau Kode Asisten
  enrolledClasses?: string[];
}

export type AuthChangeListener = (user: AuthUser | null) => void;

interface LocalAccountRecord extends AuthUser {
  password: string;
}

const DEFAULT_DEMO_ACCOUNTS: LocalAccountRecord[] = [
  {
    uid: MOCK_USERS[0].id,
    email: 'zaidan@praktikum.ac.id',
    name: MOCK_USERS[0].name,
    role: MOCK_USERS[0].role,
    identifier: MOCK_USERS[0].identifier,
    password: 'password123',
  },
  {
    uid: MOCK_USERS[1].id,
    email: 'bayu@praktikum.ac.id',
    name: MOCK_USERS[1].name,
    role: MOCK_USERS[1].role,
    identifier: MOCK_USERS[1].identifier,
    password: 'password123',
  },
  {
    uid: MOCK_USERS[2].id,
    email: 'bahir@student.ac.id',
    name: MOCK_USERS[2].name,
    role: MOCK_USERS[2].role,
    identifier: MOCK_USERS[2].identifier,
    enrolledClasses: ['A1', 'B2', 'C1'],
    password: 'password123',
  },
  {
    uid: MOCK_USERS[3].id,
    email: 'ahmad@student.ac.id',
    name: MOCK_USERS[3].name,
    role: MOCK_USERS[3].role,
    identifier: MOCK_USERS[3].identifier,
    enrolledClasses: ['A1', 'C1'],
    password: 'password123',
  },
  {
    uid: MOCK_USERS[4].id,
    email: 'siti@student.ac.id',
    name: MOCK_USERS[4].name,
    role: MOCK_USERS[4].role,
    identifier: MOCK_USERS[4].identifier,
    enrolledClasses: ['B2', 'C1'],
    password: 'password123',
  },
];

const localAccountsStore: LocalAccountRecord[] = [...DEFAULT_DEMO_ACCOUNTS];
let currentAuthUser: AuthUser | null = null;
let signedOutExplicitly = false;
const authListeners = new Set<AuthChangeListener>();

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
          role: data.role === 'ASSISTANT' ? 'ASSISTANT' : 'STUDENT',
          identifier: data.identifier || '-',
          enrolledClasses: data.enrolledClasses,
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
 * Mendaftarkan pengguna baru ke Firebase Authentication & menyimpan profil ke Firestore `users/{uid}` (SRS-AUTH-01).
 */
export async function signUpUser(
  email: string,
  password: string,
  profile: Omit<AuthUser, 'uid'>
): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = profile.name.trim();
  const trimmedIdentifier = profile.identifier.trim();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Format alamat email tidak valid.');
  }
  if (!password || password.length < 6) {
    throw new Error('Kata sandi minimal harus terdiri dari 6 karakter.');
  }
  if (!trimmedName) {
    throw new Error('Nama lengkap wajib diisi.');
  }
  if (!trimmedIdentifier) {
    throw new Error(
      profile.role === 'ASSISTANT'
        ? 'Kode Asisten wajib diisi.'
        : 'NIM Praktikan wajib diisi.'
    );
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
      enrolledClasses:
        profile.enrolledClasses ??
        (profile.role === 'STUDENT' ? ['A1', 'B2', 'C1'] : undefined),
    };

    await setDoc(doc(db, 'users', credential.user.uid), {
      email: newAuthUser.email,
      name: newAuthUser.name,
      role: newAuthUser.role,
      identifier: newAuthUser.identifier,
      enrolledClasses: newAuthUser.enrolledClasses ?? [],
      createdAt: new Date().toISOString(),
    });

    currentAuthUser = newAuthUser;
    signedOutExplicitly = false;
    notifyAuthListeners();
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
    enrolledClasses:
      profile.enrolledClasses ??
      (profile.role === 'STUDENT' ? ['A1', 'B2', 'C1'] : undefined),
    password,
  };

  localAccountsStore.push(newLocalRecord);
  currentAuthUser = toAuthUser(newLocalRecord);
  signedOutExplicitly = false;
  notifyAuthListeners();
  return currentAuthUser;
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
      enrolledClasses: ['A1', 'B2', 'C1'],
    };

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
