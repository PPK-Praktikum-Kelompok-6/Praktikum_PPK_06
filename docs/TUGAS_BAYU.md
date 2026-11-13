# Panduan Tugas — Crystiano Bayu Satya Alves (24060124140130)
## Modul: Fondasi Autentikasi, RBAC, dan Manajemen Data Utama (Sprint 2)

> **PETUNJUK KHUSUS AI ASSISTANT / PENGEMBANG:**  
> ⚠️ **Sprint 1 SELESAI & FREEZE:** Komponen UI dasar (`CustomButton`, `Card`, `EmptyState`, `FeedbackModal`, `theme.ts`) sudah selesai dan **JANGAN DIUBAH**.  
> Fokus Anda **HANYA** pada modul baru Sprint 2: Firebase Authentication, Routing RBAC, dan Firestore CRUD.

---

## 1. Product Requirements Document (PRD) — Sprint 2 Bayu

### 1.1 Objektif
Menghubungkan aplikasi ke Firebase Authentication dan Cloud Firestore sehingga pengguna memiliki identitas resmi, login terarah sesuai peran (*Role-Based Access Control* / RBAC), serta asisten dapat mengelola data Kelas, Peserta, dan Jadwal secara persisten di database cloud.

### 1.2 User Stories & Pemetaan SRS
- **SRS-AUTH-01 :** Sebagai pengguna, saya dapat melakukan registrasi dan login menggunakan Firebase Authentication agar memiliki identitas yang valid di dalam sistem.
- **SRS-AUTH-02 :** Sebagai sistem, saya dapat mengarahkan (*routing*) pengguna ke halaman yang tepat berdasarkan peran mereka (Asisten atau Praktikan) setelah berhasil login.
- **SRS-CRUD-01 :** Sebagai Asisten, saya dapat melakukan operasi Create, Read, Update, dan Delete (CRUD) pada data Kelas, Peserta, dan Jadwal menggunakan Cloud Firestore.
- **SRS-CRUD-02 :** Sebagai Praktikan, saya dapat melihat daftar jadwal dan informasi sesi praktikum yang hanya berkaitan dengan akun saya.

---

## 2. File yang Dikerjakan Bayu (Sprint 2)

```
src/
├── services/                               <-- FOLDER BARU SPRINT 2
│   ├── firebase.ts                         <-- Inisialisasi Firebase App, Auth, dan Firestore
│   ├── auth.ts                             <-- signIn, signUp, signOut, getCurrentUser, getUserProfile
│   └── sessions.ts                         <-- CRUD Firestore: Kelas, Peserta, Jadwal praktikum
└── app/
    ├── index.tsx                           <-- Update: Form login/registrasi + Auto-redirect RBAC
    ├── assistant/(tabs)/_layout.tsx        <-- Update: Proteksi sesi login & guard asisten
    └── student/(tabs)/_layout.tsx          <-- Update: Proteksi sesi login & guard praktikan
```

> 💡 **File Lama yang TIDAK PERLU DIUBAH:** `src/components/ui/*`, `src/constants/theme.ts`, `src/store/*`.

---

## 3. Spesifikasi Teknis & Kontrak Data

### 3.1 Inisialisasi Firebase (`src/services/firebase.ts`)
Gunakan konfigurasi Firebase Web SDK / React Native modular:
```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### 3.2 Service Autentikasi (`src/services/auth.ts`)
```typescript
export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: 'ASSISTANT' | 'STUDENT';
  identifier: string; // NIM atau Kode Asisten
}

// Method yang harus disediakan:
export async function signUpUser(email: string, password: string, profile: Omit<AuthUser, 'uid'>): Promise<AuthUser>;
export async function signInUser(email: string, password: string): Promise<AuthUser>;
export async function signOutUser(): Promise<void>;
export async function getUserProfile(uid: string): Promise<AuthUser | null>;
```

### 3.3 Service CRUD Firestore (`src/services/sessions.ts`)
Koleksi Firestore: `classes`, `sessions`, `users`.
```typescript
import { PracticalSession } from '@/types/attendance';

// CRUD Jadwal & Sesi
export async function createSession(sessionData: Omit<PracticalSession, 'id'>): Promise<string>;
export async function getSessionsForAssistant(assistantId: string): Promise<PracticalSession[]>;
export async function getSessionsForStudent(studentId: string, studentClasses: string[]): Promise<PracticalSession[]>;
export async function updateSession(sessionId: string, updates: Partial<PracticalSession>): Promise<void>;
export async function deleteSession(sessionId: string): Promise<void>;
```

---

## 4. Alur Kerja & Checklist Implementasi

- [ ] **Langkah 1**: Buat branch `feat/bayu/auth-firestore-crud` dari `dev`.
- [ ] **Langkah 2**: Buat file konfigurasi `src/services/firebase.ts`.
- [ ] **Langkah 3**: Buat file `src/services/auth.ts` (fungsi registrasi, login, dan pembacaan role user dari Firestore `users/{uid}`).
- [ ] **Langkah 4**: Perbarui `src/app/index.tsx` dengan UI input Email & Password (tetap memakai komponen UI dari `@/components/ui/`).
- [ ] **Langkah 5**: Implementasikan auto-routing di `index.tsx`:
  - Jika `role === 'ASSISTANT'` $\rightarrow$ redirect ke `/assistant`.
  - Jika `role === 'STUDENT'` $\rightarrow$ redirect ke `/student`.
- [ ] **Langkah 6**: Buat `src/services/sessions.ts` untuk operasi CRUD data sesi di Firestore.
- [ ] **Langkah 7**: Jalankan `npx tsc --noEmit` & `npx expo lint`.
- [ ] **Langkah 8**: Ajukan Pull Request ke `dev`.
