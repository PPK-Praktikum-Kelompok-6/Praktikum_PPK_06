# Panduan Pengerjaan Tugas Sprint 1 — Zaidan
## Role: Core Architecture, State Management, Role System & Asisten Workflow

> Dokumen ini dirancang khusus sebagai instruksi dan PRD teknis untuk Zaidan (dan AI Coding Assistant Zaidan).

---

## 1. Product Requirements Document (PRD) — Ruang Lingkup Zaidan

### 1.1 Objektif Utama
Membangun fondasi logika aplikasi, manajemen state global berbasis React Context (in-memory dummy), mekanisme pergantian peran (*role switcher*), serta seluruh modul antarmuka dan interaksi dari sudut pandang **Asisten Praktikum**.

### 1.2 User Stories & Acceptance Criteria
1. **Sebagai Pengguna (Asisten/Praktikan)**:
   - *User Story*: Saya ingin dapat beralih peran antara "Asisten" dan "Praktikan" serta memilih akun dummy yang aktif.
   - *Acceptance Criteria*:
     - Terdapat tombol/modal pengalih peran yang selalu dapat diakses.
     - State peran tersimpan di root context dan mempengaruhi tampilan aktif.
2. **Sebagai Asisten Praktikum**:
   - *User Story 1*: Saya ingin melihat daftar jadwal sesi praktikum yang saya ampu beserta statusnya.
   - *Acceptance Criteria*:
     - Menampilkan list kartu sesi praktikum dengan detail: nama praktikum, kelas, ruang, jam pelaksanaan, dan badge status (`BELUM_DIMULAI`, `DIBUKA`, `DITUTUP`).
     - Terdapat filter atau tab status sesi.
   - *User Story 2*: Saya ingin membuka sesi praktikum ketika praktikum dimulai.
   - *Acceptance Criteria*:
     - Terdapat tombol "Buka Sesi" pada detail sesi.
     - Menampilkan modal konfirmasi sebelum sesi dibuka.
     - Setelah dikonfirmasi, status sesi berubah menjadi `DIBUKA` dan dapat diakses oleh praktikan.
   - *User Story 3*: Saya ingin melihat rekapitulasi kehadiran praktikan secara real-time.
   - *Acceptance Criteria*:
     - Menampilkan daftar praktikan yang telah melakukan presensi pada sesi tersebut (Nama, NIM, Timestamp presensi).
     - Menampilkan statistik ringkas (misal: "Hadir: 18 / 25 praktikan").
     - Terdapat *Empty State* yang informatif jika belum ada praktikan yang presensi.
   - *User Story 4*: Saya ingin menutup sesi praktikum ketika jam praktikum selesai.
   - *Acceptance Criteria*:
     - Terdapat tombol "Tutup Sesi" pada sesi yang sedang dibuka.
     - Menampilkan modal konfirmasi penutupan.
     - Setelah sesi ditutup, status berubah menjadi `DITUTUP`, dan tidak ada lagi yang bisa presensi.

---

## 2. Spesifikasi Teknis & Struktur File

### 2.1 File yang Menjadi Tanggung Jawab Zaidan
```
src/
├── types/
│   └── attendance.ts               <-- Definisi tipe data global
├── data/
│   └── mockData.ts                 <-- Dataset awal (Sesi, Asisten, Praktikan, Rekap)
├── context/
│   └── AttendanceContext.tsx       <-- Provider state in-memory & method manipulasi
├── app/
│   ├── _layout.tsx                 <-- Integrasi Provider root
│   ├── index.tsx                   <-- Dashboard awal / Role selector
│   └── asisten/
│       ├── _layout.tsx             <-- Tab bar asisten (Jadwal, Rekap)
│       ├── index.tsx               <-- Halaman jadwal asisten
│       ├── sesi/
│       │   └── [id].tsx            <-- Halaman detail sesi & kontrol buka/tutup
│       └── rekap.tsx               <-- Rekapitulasi sesi praktikum
└── components/
    ├── asisten/
    │   ├── SessionControlModal.tsx <-- Modal konfirmasi buka/tutup
    │   ├── AttendanceTable.tsx     <-- Tabel / list rekap peserta
    │   └── StatSummaryCard.tsx     <-- Kartu statistik kehadiran
    └── common/
        ├── RoleSelectorModal.tsx   <-- Modal ganti peran & user dummy
        ├── EmptyState.tsx          <-- Komponen state kosong
        └── StatusBadge.tsx         <-- Badge visual status sesi
```

### 2.2 Kontrak Data (TypeScript Interface)
Pastikan file `src/types/attendance.ts` memuat struktur berikut:
```typescript
export type SessionStatus = 'BELUM_DIMULAI' | 'DIBUKA' | 'DITUTUP';
export type UserRole = 'ASISTEN' | 'PRAKTIKAN';

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
  timestamp: string; // ISO string atau format "HH:mm:ss WIB"
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

### 2.3 Kontrak Method di `AttendanceContext`
```typescript
interface AttendanceContextType {
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

## 3. Checklist Eksekusi Step-by-Step

- [ ] **Langkah 1**: Buat tipe data di `src/types/attendance.ts`.
- [ ] **Langkah 2**: Buat dummy data di `src/data/mockData.ts` (minimal 3 sesi dengan berbagai status, 2 asisten, 5 praktikan).
- [ ] **Langkah 3**: Buat `AttendanceContext.tsx` dengan seluruh method state di atas. Bungkus `_layout.tsx` utama dengan Provider.
- [ ] **Langkah 4**: Buat komponen `RoleSelectorModal.tsx` dan `StatusBadge.tsx` di `src/components/common/`.
- [ ] **Langkah 5**: Buat rute `/asisten/index.tsx` untuk menampilkan daftar sesi asisten yang sedang login.
- [ ] **Langkah 6**: Buat rute `/asisten/sesi/[id].tsx` dengan tombol buka/tutup sesi + `SessionControlModal.tsx`.
- [ ] **Langkah 7**: Buat komponen `AttendanceTable.tsx` dan `StatSummaryCard.tsx` untuk menampilkan rekapitulasi kehadiran peserta.
- [ ] **Langkah 8**: Integrasikan `EmptyState.tsx` ketika rekap peserta masih kosong.
- [ ] **Langkah 9**: Uji coba fungsionalitas buka sesi dan tutup sesi serta pastikan status ter-update secara reaktif.
