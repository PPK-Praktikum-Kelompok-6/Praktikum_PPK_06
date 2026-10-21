# Panduan Pengerjaan Tugas Sprint 1 — Crystiano Bayu Satya Alves (24060124140130)
## Role: UI Design System, Navigation Shell & Praktikan Session Explorer

> Dokumen ini dirancang khusus sebagai instruksi dan PRD teknis untuk Crystiano Bayu Satya Alves (dan AI Coding Assistant Bayu).

---

## 1. Product Requirements Document (PRD) — Ruang Lingkup Bayu

### 1.1 Objektif Utama
Membangun fondasi antarmuka visual yang responsif berbasis Flexbox, reusable component system, shell navigasi tab praktikan (Expo Router), daftar sesi praktikum peserta beserta indikator status keterbukaan sesi, serta penanganan status kosong (*empty state*).

### 1.2 User Stories & Pemetaan SRS
- **Bayu - FR-02 :** Sebagai Praktikan, saya ingin melihat jadwal praktikum yang harus saya ikuti serta status keterbukaan sesi saat ini agar saya tahu kapan harus bersiap melakukan presensi.
- **Bayu - FR-07 :** Sebagai Pengguna (Praktikan/Asisten), saya ingin menerima umpan balik berupa modal dialog responsif (*FeedbackModal*) saat terjadi tindakan penting agar mendapatkan konfirmasi visual yang jelas.
- **Bayu - FR-10 :** Sebagai Pengguna (Praktikan/Asisten), saya ingin melihat tampilan status kosong (*empty state*) yang informatif ketika daftar jadwal, rekap, atau riwayat belum memiliki data.

---

## 2. Rencana Git Branch & Pull Request (PR)

### 📌 PR 1 (Bayu) — Design System & Navigation Layout
- **Nama Branch:** `feat/bayu/ui-components-nav`
- **Target Branch:** `dev`
- **Judul PR:** `feat(ui): responsive common components and navigation shell`
- **SRS Terkait:** `Bayu - FR-10`, `Bayu - FR-07`
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

### 📌 PR 2 (Bayu) — Modul Jadwal & Detail Sesi Praktikan
- **Nama Branch:** `feat/bayu/praktikan-session-explorer`
- **Target Branch:** `dev`
- **Judul PR:** `feat(praktikan): session list screen and session card component`
- **SRS Terkait:** `Bayu - FR-02`, `Bayu - FR-10`
- **Ruang Lingkup Perubahan:**
  - `src/app/praktikan/index.tsx` (Daftar sesi praktikum peserta yang disaring)
  - `src/components/praktikan/SessionCard.tsx` (Kartu sesi praktikum untuk praktikan)
- **Checklist PR:**
  - [ ] Menampilkan daftar sesi praktikum secara interaktif dari data Context.
  - [ ] Menampilkan status badge sesi (Belum Dimulai, Dibuka, Selesai).
  - [ ] Integrasi navigasi dari kartu sesi menuju halaman presensi praktikan.
  - [ ] Menampilkan `EmptyState` jika tidak ada sesi yang terjadwal.
  - [ ] Lolos typecheck (`npx tsc --noEmit`).

---

## 3. Spesifikasi Teknis & Struktur File

### 3.1 File yang Menjadi Tanggung Jawab Bayu
```
src/
├── app/
│   └── praktikan/
│       ├── _layout.tsx               <-- Tab bar praktikan (Jadwal, Riwayat)
│       └── index.tsx                 <-- Daftar sesi praktikum aktif
└── components/
    ├── common/
    │   ├── CustomButton.tsx          <-- Tombol reusable (Primary, Secondary, Disabled)
    │   ├── Card.tsx                  <-- Container kartu praktikum
    │   ├── EmptyState.tsx            <-- Komponen state kosong
    │   └── FeedbackModal.tsx         <-- Modal konfirmasi sukses/peringatan
    └── praktikan/
        └── SessionCard.tsx           <-- Kartu sesi praktikum untuk praktikan
```

### 3.2 Integrasi dengan Context
Bayu akan mengonsumsi state dan method yang disediakan oleh Zaidan di `AttendanceContext`:
```typescript
import { useAttendance } from '@/context/AttendanceContext';

const {
  currentUser,            // User profile praktikan yang aktif
  sessions,               // Daftar sesi praktikum
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
- [ ] **Langkah 5**: Buat branch `feat/bayu/praktikan-session-explorer` dari `dev` terbaru.
- [ ] **Langkah 6**: Buat komponen `SessionCard.tsx` di `src/components/praktikan/` untuk merepresentasikan detail sesi, badge status, dan tombol aksi menuju presensi.
- [ ] **Langkah 7**: Buat halaman `src/app/praktikan/index.tsx` untuk menampilkan daftar sesi praktikum dari `sessions` di Context.
- [ ] **Langkah 8**: Sambungkan kartu sesi dengan routing navigasi ke `/praktikan/presensi/[id]` (modul yang dikembangkan oleh Bahir).
- [ ] **Langkah 9**: Tampilkan `EmptyState` jika daftar sesi praktikum kosong.
- [ ] **Langkah 10**: Jalankan `npx tsc --noEmit` & ajukan **PR 2 Bayu** ke branch `dev`.
