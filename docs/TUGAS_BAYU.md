# Panduan Pengerjaan Tugas Sprint 1 — Crystiano Bayu Satya Alves (24060124140130)
## Role: UI Design System, Navigation & Praktikan Workflow

> Dokumen ini dirancang khusus sebagai instruksi dan PRD teknis untuk Crystiano Bayu Satya Alves (dan AI Coding Assistant Bayu).

---

## 1. Product Requirements Document (PRD) — Ruang Lingkup Bayu

### 1.1 Objektif Utama
Membangun fondasi antarmuka visual yang responsif berbasis Flexbox, struktur navigasi praktikan (Expo Router), halaman jadwal praktikum peserta, form presensi interaktif dengan validasi pencegahan presensi ganda (*anti-double attendance*), modal konfirmasi, serta halaman riwayat catatan kehadiran.

### 1.2 User Stories & Pemetaan SRS
- **Bayu - FR-02 :** Sebagai Praktikan, saya ingin melihat jadwal praktikum yang harus saya ikuti serta status keterbukaan sesi saat ini agar saya tahu kapan harus bersiap melakukan presensi.
- **Bayu - FR-05 :** Sebagai Praktikan, saya ingin mengisi dan mengirim formulir presensi saat sesi berstatus dibuka agar kehadiran saya tercatat pada sesi praktikum tersebut.
- **Bayu - FR-06 :** Sebagai Praktikan, saya ingin sistem memvalidasi dan mencegah saya melakukan presensi lebih dari satu kali pada sesi yang sama agar tidak terjadi duplikasi data absensi.
- **Bayu - FR-07 :** Sebagai Praktikan, saya ingin menerima umpan balik berupa modal/bottom sheet konfirmasi saat presensi berhasil dikirim beserta info waktu hadir agar saya yakin kehadiran telah tercatat.
- **Bayu - FR-09 :** Sebagai Praktikan, saya ingin melihat daftar riwayat dan catatan kehadiran saya sendiri pada praktikum yang telah diikuti agar saya dapat mengecek histori absensi pribadi.
- **Bayu - FR-10 :** Sebagai Pengguna (Praktikan/Asisten), saya ingin melihat tampilan status kosong (*empty state*) yang informatif ketika daftar jadwal, rekap, atau riwayat belum memiliki data.

---

## 2. Rencana Git Branch & Pull Request (PR)

### 📌 PR 1 (Bayu) — Design System & Navigation Layout
- **Nama Branch:** `feat/bayu/ui-components-nav`
- **Target Branch:** `dev`
- **Judul PR:** `feat(ui): responsive common components and navigation shell`
- **SRS Terkait:** `Bayu - FR-10`
- **Ruang Lingkup Perubahan:**
  - `src/components/common/CustomButton.tsx` (Button varian primary, outline, disabled)
  - `src/components/common/Card.tsx` (Card container responsif Flexbox)
  - `src/components/common/EmptyState.tsx` (Komponen visual empty state)
  - `src/components/common/FeedbackModal.tsx` (Modal feedback umum)
  - `src/app/praktikan/_layout.tsx` (Tab navigation shell praktikan)
- **Checklist PR:**
  - [ ] Seluruh komponen responsif menggunakan Flexbox di berbagai ukuran layar.
  - [ ] Tab navigator praktikan dapat berpindah layar dengan lancar.
  - [ ] Lolos typecheck (`npx tsc --noEmit`).

### 📌 PR 2 (Bayu) — Modul Presensi & Riwayat Praktikan
- **Nama Branch:** `feat/bayu/praktikan-workflow`
- **Target Branch:** `dev`
- **Judul PR:** `feat(praktikan): attendance form, anti-double validation, and history`
- **SRS Terkait:** `Bayu - FR-02`, `Bayu - FR-05`, `Bayu - FR-06`, `Bayu - FR-07`, `Bayu - FR-09`
- **Ruang Lingkup Perubahan:**
  - `src/app/praktikan/index.tsx` (Daftar sesi praktikum peserta)
  - `src/app/praktikan/presensi/[id].tsx` (Halaman & form aksi presensi)
  - `src/app/praktikan/riwayat.tsx` (Histori absensi akun praktikan aktif)
  - `src/components/praktikan/AttendanceForm.tsx` (Formulir input kehadiran)
  - `src/components/praktikan/HistoryItemCard.tsx` (Kartu catatan riwayat kehadiran)
- **Checklist PR:**
  - [ ] Tombol presensi hanya aktif jika status sesi `DIBUKA`.
  - [ ] Mencegah presensi ganda (tombol terkunci & bertuliskan "Sudah Hadir").
  - [ ] Modal konfirmasi sukses muncul setelah submit presensi.
  - [ ] Catatan kehadiran tersimpan dan muncul di halaman riwayat.

---

## 3. Spesifikasi Teknis & Struktur File

### 3.1 File yang Menjadi Tanggung Jawab Bayu
```
src/
├── app/
│   └── praktikan/
│       ├── _layout.tsx               <-- Tab bar praktikan (Jadwal, Riwayat)
│       ├── index.tsx                 <-- Daftar sesi praktikum aktif
│       ├── presensi/
│       │   └── [id].tsx              <-- Halaman form presensi & validasi
│       └── riwayat.tsx               <-- Halaman riwayat kehadiran pribadi
└── components/
    ├── common/
    │   ├── CustomButton.tsx          <-- Tombol reusable (Primary, Secondary, Disabled)
    │   ├── Card.tsx                  <-- Container kartu praktikum
    │   ├── EmptyState.tsx            <-- Komponen state kosong
    │   └── FeedbackModal.tsx         <-- Modal konfirmasi sukses/peringatan
    └── praktikan/
        ├── AttendanceForm.tsx        <-- Form input presensi
        ├── AttendanceSuccessCard.tsx <-- Kartu bukti kehadiran setelah presensi
        └── HistoryItemCard.tsx       <-- Item list riwayat kehadiran
```

### 3.2 Integrasi dengan Context
Bayu akan mengonsumsi state dan method yang disediakan oleh Zaidan di `AttendanceContext`:
```typescript
import { useAttendance } from '@/context/AttendanceContext';

const {
  currentUser,            // User profile praktikan yang aktif
  sessions,               // Daftar sesi
  submitAttendance,       // Fungsi submit presensi: (sessionId, student, notes)
  isAlreadyAttended,      // Fungsi pengecekan duplikasi: (sessionId, studentId) => boolean
  getAttendanceByStudent, // Fungsi mengambil riwayat: (studentId) => AttendanceRecord[]
  getSessionById          // Fungsi detail sesi
} = useAttendance();
```

### 3.3 Aturan Desain & Styling (Flexbox & Responsivitas)
1. Gunakan `StyleSheet.create` React Native murni dengan Flexbox (`flex: 1`, `flexDirection: 'row'/'column'`, `justifyContent`, `alignItems`, `gap`).
2. Hindari ukuran font atau padding yang hardcoded tanpa pertimbangan layar kecil (gunakan layout yang *stretch* dan *scrollable* dengan `ScrollView`).
3. Warna tema konsisten:
   - Primary: Biru `#1E40AF` / `#2563EB`
   - Sukses/Dibuka: Hijau `#16A34A` / `#DCFCE7`
   - Peringatan/Tutup: Abu-abu `#64748B` / Merah `#DC2626`
   - Background: `#F8FAFC`

---

## 4. Checklist Eksekusi Step-by-Step

- [ ] **Langkah 1**: Buat branch `feat/bayu/ui-components-nav` dari `dev`.
- [ ] **Langkah 2**: Buat komponen dasar di `src/components/common/` (`CustomButton.tsx`, `Card.tsx`, `EmptyState.tsx`, `FeedbackModal.tsx`).
- [ ] **Langkah 3**: Setup rute navigasi tab di `src/app/praktikan/_layout.tsx` (Tab 1: Jadwal Sesi, Tab 2: Riwayat Presensi).
- [ ] **Langkah 4**: Jalankan `npx tsc --noEmit` & ajukan **PR 1 Bayu** ke branch `dev`.
- [ ] **Langkah 5**: Buat branch `feat/bayu/praktikan-workflow` dari `dev` terbaru.
- [ ] **Langkah 6**: Buat halaman `src/app/praktikan/index.tsx` untuk menampilkan daftar sesi praktikum dari `sessions` di Context.
- [ ] **Langkah 7**: Buat halaman `src/app/praktikan/presensi/[id].tsx` yang memuat form presensi praktikan.
- [ ] **Langkah 8**: Terapkan logika tombol presensi:
  - Cek `isAlreadyAttended(session.id, currentUser.id)`. Jika `true`, kunci tombol dengan label "Sudah Hadir".
  - Cek `session.status !== 'DIBUKA'`. Jika sesi belum buka atau sudah tutup, nonaktifkan form.
- [ ] **Langkah 9**: Sambungkan aksi klik tombol dengan `submitAttendance()` dan tampilkan `FeedbackModal.tsx`.
- [ ] **Langkah 10**: Buat halaman `src/app/praktikan/riwayat.tsx` menggunakan `getAttendanceByStudent(currentUser.id)`. Tampilkan `EmptyState` jika belum ada riwayat.
- [ ] **Langkah 11**: Jalankan `npx tsc --noEmit` & ajukan **PR 2 Bayu** ke branch `dev`.
