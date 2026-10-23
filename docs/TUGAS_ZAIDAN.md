# Panduan Pengerjaan Tugas Sprint 1 — Muhammad Zaidan Alfarizi (24060124130102)
## Role: Core Architecture, State Management, Role System & Asisten Workflow

> Dokumen ini dirancang khusus sebagai instruksi dan PRD teknis untuk Muhammad Zaidan Alfarizi (dan AI Coding Assistant Zaidan).

---

## 1. Product Requirements Document (PRD) — Ruang Lingkup Zaidan

### 1.1 Objektif Utama
Membangun fondasi logika aplikasi, manajemen state global berbasis React Context (in-memory dummy), mekanisme pergantian peran (*role switcher*), serta seluruh modul antarmuka dan interaksi dari sudut pandang **Asisten Praktikum**.

### 1.2 User Stories & Pemetaan SRS
- **Zaidan - FR-01 :** Sebagai Pengguna (Asisten/Praktikan), saya ingin dapat mengganti peran dan memilih profil identitas dummy di aplikasi agar dapat mensimulasikan interaksi dua arah dengan mudah.
- **Zaidan - FR-02 :** Sebagai Asisten, saya ingin melihat daftar jadwal sesi praktikum yang saya ampu beserta informasi detail sesi (nama praktikum, kelas, waktu, status) agar saya dapat memantau jadwal mengajar.
- **Zaidan - FR-03 :** Sebagai Asisten, saya ingin membuka sesi praktikum yang belum dimulai melalui konfirmasi modal agar praktikan dapat mulai melakukan presensi kehadiran.
- **Zaidan - FR-04 :** Sebagai Asisten, saya ingin menutup sesi praktikum yang sedang berjalan melalui konfirmasi modal agar sesi dinyatakan selesai dan tidak ada lagi presensi yang masuk.
- **Zaidan - FR-08 :** Sebagai Asisten, saya ingin melihat rekapitulasi daftar praktikan yang sudah hadir beserta catatan waktu presensinya secara terorganisir agar dapat memantau kehadiran kelas.

---

## 2. Rencana Git Branch & Pull Request (PR)

### 📌 PR 1 (Zaidan) — Core State & Role Switcher
- **Nama Branch:** `feat/zaidan/core-state-role`
- **Target Branch:** `dev`
- **Judul PR:** `feat(core): implement app store, mock data, and role switcher`
- **SRS Terkait:** `Zaidan - FR-01`
- **Ruang Lingkup Perubahan:**
  - `src/types/attendance.ts` (Model data TypeScript)
  - `src/data/mockData.ts` (Dataset awal sesi praktikum, asisten, praktikan)
  - `src/store/AppProvider.tsx`, `reducer.ts`, `rules.ts`, `hooks.ts` (Provider in-memory state, aturan bisnis murni & hooks)
  - `src/features/role/components/RoleSelectorModal.tsx` (Modal ganti role & user active)
- **Checklist PR:**
  - [ ] Profil pengguna dan peran (Asisten vs Praktikan) dapat diganti secara interaktif.
  - [ ] `AppProvider` terpasang di root layout (`src/app/_layout.tsx`).
  - [ ] Lolos typecheck (`npx tsc --noEmit`).

### 📌 PR 2 (Zaidan) — Modul & Workflow Asisten
- **Nama Branch:** `feat/zaidan/assistant-workflow`
- **Target Branch:** `dev`
- **Judul PR:** `feat(assistant): schedule list, session control, and attendance recap`
- **SRS Terkait:** `Zaidan - FR-02`, `Zaidan - FR-03`, `Zaidan - FR-04`, `Zaidan - FR-08`
- **Ruang Lingkup Perubahan:**
  - `src/app/assistant/(tabs)/index.tsx` (Jadwal asisten & filter status sesi)
  - `src/app/assistant/session/[id].tsx` (Detail sesi dan kontrol status)
  - `src/features/sessions/components/SessionControlModal.tsx` (Modal konfirmasi buka/tutup)
  - `src/features/attendance/components/AttendanceTable.tsx` (Tabel / list rekap peserta)
- **Checklist PR:**
  - [ ] Status sesi dapat berubah dari `NOT_STARTED` $\rightarrow$ `OPEN` $\rightarrow$ `CLOSED`.
  - [ ] Terdapat modal konfirmasi sebelum aksi buka/tutup dieksekusi.
  - [ ] Rekapitulasi peserta ter-update secara reaktif dan mencatat timestamp presensi.

---

## 3. Spesifikasi Teknis & Struktur File

### 3.1 File yang Menjadi Tanggung Jawab Zaidan
> Aturan struktur & import: [ARCHITECTURE.md](ARCHITECTURE.md).
```
src/
├── types/
│   └── attendance.ts               <-- Definisi tipe data global
├── data/
│   └── mockData.ts                 <-- Dataset awal (Sesi, Asisten, Praktikan, Rekap)
├── store/
│   ├── AppProvider.tsx             <-- Provider state in-memory (Context + useReducer)
│   ├── reducer.ts                  <-- Transisi state
│   ├── rules.ts                    <-- Aturan bisnis murni: canOpen, canClose, canAttend
│   └── hooks.ts                    <-- useCurrentUser, useSessions, useAttendance
├── app/
│   ├── _layout.tsx                 <-- Integrasi AppProvider di root
│   ├── index.tsx                   <-- Dashboard awal / Role selector
│   └── assistant/
│       ├── (tabs)/
│       │   ├── _layout.tsx         <-- Tab bar asisten (Jadwal, Rekap)
│       │   ├── index.tsx           <-- Halaman jadwal asisten
│       │   └── recap.tsx           <-- Rekapitulasi sesi praktikum
│       └── session/
│           └── [id].tsx            <-- Halaman detail sesi & kontrol buka/tutup
└── features/
    ├── role/components/
    │   └── RoleSelectorModal.tsx   <-- Modal ganti peran & user dummy
    ├── sessions/components/
    │   ├── SessionControlModal.tsx <-- Modal konfirmasi buka/tutup
    │   └── StatusBadge.tsx         <-- Badge visual status sesi
    └── attendance/components/
        ├── AttendanceTable.tsx     <-- Tabel / list rekap peserta
        └── StatSummaryCard.tsx     <-- Kartu statistik kehadiran
```
`EmptyState` dibuat Bayu di `src/components/ui/EmptyState.tsx`; Zaidan cukup memakainya.

### 3.2 Kontrak Data (TypeScript Interface)
Pastikan file `src/types/attendance.ts` memuat struktur berikut:
```typescript
export type SessionStatus = 'NOT_STARTED' | 'OPEN' | 'CLOSED'; // label UI: Belum Dimulai | Dibuka | Ditutup
export type UserRole = 'ASSISTANT' | 'STUDENT';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  identifier: string; // NIM atau Kode Asisten (misal: "AST-01", "220101")
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  timestamp: string; // Format "HH:mm:ss WIB" atau ISO string
  notes?: string;
}

export interface PracticalSession {
  id: string;
  courseName: string;
  classCode: string;
  room: string;
  timeSlot: string;
  date: string;
  status: SessionStatus;
  assistantId: string;
  assistantName: string;
  totalStudents: number;
}
```

### 3.3 Kontrak Method di Store
State disimpan di `AppProvider` (Context + `useReducer`). Komponen **tidak** memakai `useContext` langsung, tetapi lewat 3 hooks di `src/store/hooks.ts` yang membagi kontrak di bawah: `useCurrentUser` (currentUser, setCurrentUser), `useSessions` (sessions, getSessionById, openSession, closeSession), `useAttendance` (attendanceRecords, submitAttendance, isAlreadyAttended, getAttendanceBySession, getAttendanceByStudent). Validasi di `openSession`/`closeSession`/`submitAttendance` memanggil fungsi murni di `src/store/rules.ts`.
```typescript
interface AppStoreType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  sessions: PracticalSession[];
  attendanceRecords: AttendanceRecord[];
  openSession: (sessionId: string) => boolean;
  closeSession: (sessionId: string) => boolean;
  submitAttendance: (sessionId: string, student: UserProfile, notes?: string) => { success: boolean; message: string };
  isAlreadyAttended: (sessionId: string, studentId: string) => boolean;
  getSessionById: (sessionId: string) => PracticalSession | undefined;
  getAttendanceBySession: (sessionId: string) => AttendanceRecord[];
  getAttendanceByStudent: (studentId: string) => (AttendanceRecord & { session?: PracticalSession })[];
}
```

---

## 4. Checklist Eksekusi Step-by-Step

- [ ] **Langkah 1**: Buat branch `feat/zaidan/core-state-role` dari `dev`.
- [ ] **Langkah 2**: Buat tipe data di `src/types/attendance.ts`.
- [ ] **Langkah 3**: Buat dummy data di `src/data/mockData.ts` (minimal 3 sesi dengan berbagai status, 2 asisten, 5 praktikan).
- [ ] **Langkah 4**: Buat store di `src/store/` (`AppProvider.tsx`, `reducer.ts`, `rules.ts`, `hooks.ts`) dengan seluruh method di atas. Bungkus `_layout.tsx` utama dengan `AppProvider`.
- [ ] **Langkah 5**: Buat komponen `RoleSelectorModal.tsx` di `src/features/role/components/` dan `StatusBadge.tsx` di `src/features/sessions/components/`.
- [ ] **Langkah 6**: Jalankan `npx tsc --noEmit` & ajukan **PR 1 Zaidan** ke branch `dev`.
- [ ] **Langkah 7**: Buat branch `feat/zaidan/assistant-workflow` dari `dev` terbaru.
- [ ] **Langkah 8**: Buat rute `src/app/assistant/(tabs)/index.tsx` untuk menampilkan daftar sesi asisten yang sedang login.
- [ ] **Langkah 9**: Buat rute `src/app/assistant/session/[id].tsx` dengan tombol buka/tutup sesi + `SessionControlModal.tsx`.
- [ ] **Langkah 10**: Buat komponen `AttendanceTable.tsx` dan `StatSummaryCard.tsx` di `src/features/attendance/components/` untuk menampilkan rekapitulasi kehadiran peserta.
- [ ] **Langkah 11**: Integrasikan `EmptyState` (`@/components/ui/EmptyState`) ketika rekap peserta masih kosong.
- [ ] **Langkah 12**: Jalankan `npx tsc --noEmit` & ajukan **PR 2 Zaidan** ke branch `dev`.
