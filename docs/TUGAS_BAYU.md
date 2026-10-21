# Panduan Pengerjaan Tugas Sprint 1 — Bayu
## Role: UI Design System, Navigation & Praktikan Workflow

> Dokumen ini dirancang khusus sebagai instruksi dan PRD teknis untuk Bayu (dan AI Coding Assistant Bayu).

---

## 1. Product Requirements Document (PRD) — Ruang Lingkup Bayu

### 1.1 Objektif Utama
Membangun fondasi antarmuka visual yang responsif berbasis Flexbox, struktur navigasi praktikan (Expo Router), halaman jadwal praktikum peserta, form presensi interaktif dengan validasi pencegahan presensi ganda (*anti-double attendance*), modal konfirmasi, serta halaman riwayat catatan kehadiran.

### 1.2 User Stories & Acceptance Criteria
1. **Sebagai Praktikan**:
   - *User Story 1*: Saya ingin melihat daftar jadwal praktikum yang harus saya ikuti beserta informasi apakah sesinya sudah dibuka oleh asisten.
   - *Acceptance Criteria*:
     - Menampilkan daftar praktikum dengan atribut: Nama praktikum, kode kelas, waktu/jam, nama asisten pengampu, dan badge status sesi (`BELUM_DIMULAI`, `DIBUKA`, `DITUTUP`).
     - Kartu sesi dapat diklik untuk menuju halaman presensi.
   - *User Story 2*: Saya ingin melakukan presensi kehadiran ketika asisten telah membuka sesi.
   - *Acceptance Criteria*:
     - Tombol "Kirim Presensi" aktif **hanya** jika status sesi adalah `DIBUKA`.
     - Jika status `BELUM_DIMULAI` atau `DITUTUP`, tombol dinonaktifkan dengan pesan peringatan yang jelas.
     - Praktikan dapat menambahkan catatan singkat opsional (misal: "Hadir di Lab 2").
     - Ketika tombol ditekan, muncul modal konfirmasi berhasil beserta informasi cap waktu (*timestamp*).
   - *User Story 3*: Saya tidak boleh bisa melakukan presensi dua kali pada sesi yang sama.
   - *Acceptance Criteria*:
     - Sistem memvalidasi apakah `studentId` praktikan yang sedang aktif sudah tercatat di sesi tersebut.
     - Jika sudah presensi, tombol presensi digantikan dengan status "Anda Sudah Melakukan Presensi" dengan tanda centang hijau.
   - *User Story 4*: Saya ingin melihat catatan/riwayat kehadiran diri saya sendiri.
   - *Acceptance Criteria*:
     - Menampilkan list histori kehadiran khusus milik akun praktikan yang sedang login.
     - Menampilkan nama praktikum, tanggal, jam presensi dilakukan, dan status kehadiran.
     - Menampilkan visual *Empty State* yang ramah jika praktikan belum pernah melakukan presensi sama sekali.

---

## 2. Spesifikasi Teknis & Struktur File

### 2.1 File yang Menjadi Tanggung Jawab Bayu
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
    │   └── FeedbackModal.tsx         <-- Modal konfirmasi sukses/peringatan
    └── praktikan/
        ├── AttendanceForm.tsx        <-- Form input presensi
        ├── AttendanceSuccessCard.tsx <-- Kartu bukti kehadiran setelah presensi
        └── HistoryItemCard.tsx       <-- Item list riwayat kehadiran
```

### 2.2 Integrasi dengan Context
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

### 2.3 Aturan Desain & Styling (Flexbox & Responsivitas)
1. Gunakan `StyleSheet.create` React Native murni dengan Flexbox (`flex: 1`, `flexDirection: 'row'/'column'`, `justifyContent`, `alignItems`, `gap`).
2. Hindari ukuran font atau padding yang hardcoded tanpa pertimbangan layar kecil (gunakan layout yang *stretch* dan *scrollable* dengan `ScrollView`).
3. Warna tema konsisten:
   - Primary: Biru `#1E40AF` / `#2563EB`
   - Sukses/Dibuka: Hijau `#16A34A` / `#DCFCE7`
   - Peringatan/Tutup: Abu-abu `#64748B` / Merah `#DC2626`
   - Background: `#F8FAFC`

---

## 3. Checklist Eksekusi Step-by-Step

- [ ] **Langkah 1**: Buat komponen dasar di `src/components/common/` (`CustomButton.tsx`, `Card.tsx`, `FeedbackModal.tsx`).
- [ ] **Langkah 2**: Setup rute navigasi tab di `src/app/praktikan/_layout.tsx` (Tab 1: Jadwal Sesi, Tab 2: Riwayat Presensi).
- [ ] **Langkah 3**: Buat halaman `src/app/praktikan/index.tsx` untuk menampilkan daftar sesi praktikum dari `sessions` di Context.
- [ ] **Langkah 4**: Buat halaman `src/app/praktikan/presensi/[id].tsx` yang memuat form presensi praktikan.
- [ ] **Langkah 5**: Terapkan logika tombol presensi:
  - Cek `isAlreadyAttended(session.id, currentUser.id)`. Jika `true`, tampilkan pesan sudah hadir dan kunci tombol.
  - Cek `session.status !== 'DIBUKA'`. Jika sesi belum buka atau sudah tutup, nonaktifkan form.
- [ ] **Langkah 6**: Sambungkan aksi klik tombol dengan fungsi `submitAttendance()` dan tampilkan `FeedbackModal.tsx` sebagai umpan balik sukses presensi.
- [ ] **Langkah 7**: Buat halaman `src/app/praktikan/riwayat.tsx` menggunakan fungsi `getAttendanceByStudent(currentUser.id)`.
- [ ] **Langkah 8**: Tampilkan `EmptyState` jika daftar riwayat kehadiran masih bernilai kosong.
- [ ] **Langkah 9**: Pastikan seluruh tata letak responsif dan rapi pada perangkat mobile.
