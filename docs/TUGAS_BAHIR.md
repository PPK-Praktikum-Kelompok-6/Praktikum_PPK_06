# Panduan Pengerjaan Tugas Sprint 1 — Bahir Ananda Wibowo (24060124140184)
## Role: Praktikan Workflow, Presensi Logic, Anti-Double Validation & History Record

> Dokumen ini dirancang khusus sebagai instruksi dan PRD teknis untuk Bahir Ananda Wibowo (dan AI Coding Assistant Bahir).

---

## 1. Product Requirements Document (PRD) — Ruang Lingkup Bahir

### 1.1 Objektif Utama
Membangun alur kerja praktikan secara lengkap, mencakup halaman detail presensi interaktif, validasi pencegahan presensi ganda (*anti-double attendance*), modal konfirmasi umpan balik presensi, serta halaman riwayat/catatan kehadiran pribadi praktikan beserta kartu bukti presensi.

### 1.2 User Stories & Pemetaan SRS
- **Bahir - FR-05 :** Sebagai Praktikan, saya ingin mengisi dan mengirim formulir presensi saat sesi berstatus dibuka agar kehadiran saya tercatat pada sesi praktikum tersebut.
- **Bahir - FR-06 :** Sebagai Praktikan, saya ingin sistem memvalidasi dan mencegah saya melakukan presensi lebih dari satu kali pada sesi yang sama agar tidak terjadi duplikasi data absensi.
- **Bahir - FR-07 :** Sebagai Praktikan, saya ingin menerima umpan balik berupa modal/bottom sheet konfirmasi saat presensi berhasil dikirim beserta info waktu hadir agar saya yakin kehadiran telah tercatat.
- **Bahir - FR-09 :** Sebagai Praktikan, saya ingin melihat daftar riwayat dan catatan kehadiran saya sendiri pada praktikum yang telah diikuti agar saya dapat mengecek histori absensi pribadi.

---

## 2. Rencana Git Branch & Pull Request (PR)

### 📌 PR 1 (Bahir) — Form Presensi, Validasi & Modal Konfirmasi
- **Nama Branch:** `feat/bahir/attendance-validation`
- **Target Branch:** `dev`
- **Judul PR:** `feat(student): attendance form, anti-double attendance validation, and confirmation modal`
- **SRS Terkait:** `Bahir - FR-05`, `Bahir - FR-06`, `Bahir - FR-07`
- **Ruang Lingkup Perubahan:**
  - `src/app/student/attendance/[id].tsx` (Halaman detail dan form presensi praktikan)
  - `src/features/attendance/components/AttendanceForm.tsx` (Formulir input kehadiran dan tombol submit)
  - `src/features/attendance/components/AttendanceSuccessCard.tsx` (Kartu/banner bukti kehadiran)
- **Checklist PR:**
  - [ ] Validasi status sesi: form hanya aktif dan dapat disubmit jika status sesi adalah `OPEN` (ditampilkan "Dibuka").
  - [ ] Validasi anti-double attendance: jika praktikan aktif sudah tercatat hadir, tombol dikunci dengan status "Sudah Hadir".
  - [ ] Menampilkan modal/feedback konfirmasi saat presensi berhasil disimpan ke Context.
  - [ ] Lolos typecheck (`npx tsc --noEmit`).

### 📌 PR 2 (Bahir) — Riwayat Presensi Praktikan
- **Nama Branch:** `feat/bahir/student-history`
- **Target Branch:** `dev`
- **Judul PR:** `feat(student): personal attendance history list and item cards`
- **SRS Terkait:** `Bahir - FR-09`
- **Ruang Lingkup Perubahan:**
  - `src/app/student/(tabs)/history.tsx` (Halaman riwayat presensi praktikan aktif)
  - `src/features/attendance/components/HistoryItemCard.tsx` (Kartu catatan riwayat per sesi)
- **Checklist PR:**
  - [ ] Menampilkan riwayat kehadiran sesuai `currentUser.id` yang aktif.
  - [ ] Menampilkan informasi detail pada tiap kartu: nama sesi, tanggal, ruang, dan jam presensi.
  - [ ] Menampilkan `EmptyState` jika akun praktikan yang login belum pernah melakukan presensi.
  - [ ] Lolos typecheck (`npx tsc --noEmit`).

---

## 3. Spesifikasi Teknis & Struktur File

### 3.1 File yang Menjadi Tanggung Jawab Bahir
> Aturan struktur & import: [ARCHITECTURE.md](ARCHITECTURE.md). Aturan "boleh presensi" (`canAttend`) ada di `src/store/rules.ts` (dibuat Zaidan); UI cukup memanggilnya lewat hook, jangan menulis ulang logikanya.
```
src/
├── app/
│   └── student/
│       ├── attendance/
│       │   └── [id].tsx              <-- Halaman form presensi & validasi
│       └── (tabs)/
│           └── history.tsx           <-- Halaman riwayat kehadiran pribadi
└── features/
    └── attendance/
        └── components/
            ├── AttendanceForm.tsx        <-- Form input presensi
            ├── AttendanceSuccessCard.tsx <-- Kartu bukti kehadiran setelah presensi
            └── HistoryItemCard.tsx       <-- Item list riwayat kehadiran
```

### 3.2 Integrasi dengan Store
Bahir mengonsumsi state dan method melalui hooks di `src/store/hooks.ts`:
```typescript
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';

const { currentUser } = useCurrentUser();   // User profile praktikan yang aktif
const { getSessionById } = useSessions();   // Fungsi ambil detail sesi
const {
  submitAttendance,       // Fungsi submit presensi: (sessionId, student, notes) => { success, message }
  isAlreadyAttended,      // Fungsi validasi: (sessionId, studentId) => boolean
  getAttendanceByStudent, // Fungsi mengambil riwayat: (studentId) => AttendanceRecord[]
} = useAttendance();
```

---

## 4. Checklist Eksekusi Step-by-Step

- [ ] **Langkah 1**: Pastikan branch `dev` sudah memuat komponen dasar dari Bayu dan store dari Zaidan.
- [ ] **Langkah 2**: Buat branch `feat/bahir/attendance-validation` dari `dev`.
- [ ] **Langkah 3**: Buat komponen `AttendanceForm.tsx` dan `AttendanceSuccessCard.tsx` di `src/features/attendance/components/`.
- [ ] **Langkah 4**: Implementasikan halaman `src/app/student/attendance/[id].tsx` dengan logika:
  - Cek apakah `isAlreadyAttended(session.id, currentUser.id) === true`.
  - Cek apakah `session.status !== 'OPEN'`.
  - Panggil `submitAttendance(...)` saat tombol ditekan.
- [ ] **Langkah 5**: Jalankan `npx tsc --noEmit` & ajukan **PR 1 Bahir** ke branch `dev`.
- [ ] **Langkah 6**: Buat branch `feat/bahir/student-history` dari `dev` terbaru.
- [ ] **Langkah 7**: Buat komponen `HistoryItemCard.tsx` di `src/features/attendance/components/`.
- [ ] **Langkah 8**: Buat halaman `src/app/student/(tabs)/history.tsx` yang memanggil `getAttendanceByStudent(currentUser.id)` dan menggunakan `EmptyState` (`@/components/ui/EmptyState`) jika data kosong.
- [ ] **Langkah 9**: Jalankan `npx tsc --noEmit` & ajukan **PR 2 Bahir** ke branch `dev`.
