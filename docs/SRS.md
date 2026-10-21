# Software Requirements Specification (SRS)
## Sistem Presensi Praktikum Mandiri (Sprint 1)

**Proyek:** Aplikasi Presensi Kegiatan Praktikum  
**Platform:** React Native (Expo SDK 57, Expo Router)  
**Target Pengguna:** Praktikan & Asisten Praktikum  
**Metodologi:** Scrum / Agile (Sprint 1)  

---

## 1. Pendahuluan

### 1.1 Tujuan
Dokumen ini mendefinisikan spesifikasi kebutuhan perangkat lunak (SRS) untuk Sprint 1 dari aplikasi presensi praktikum. Fokus sprint ini adalah membangun antarmuka pengguna (UI), alur navigasi praktikum, dan simulasi interaksi berbasis *state* lokal (dummy data) untuk dua sudut pandang peran: **Praktikan** dan **Asisten**.

### 1.2 Lingkup Masalah (Problem Statement)
Pencatatan kehadiran manual seringkali memakan waktu dan rentan kekeliruan. Asisten praktikum membutuhkan kemudahan dalam membuka/menutup sesi praktikum dan memantau kehadiran secara *real-time*, sedangkan praktikan membutuhkan informasi jadwal yang jelas serta proses presensi yang cepat dan transparan tanpa ada presensi ganda.

### 1.3 Batasan Sistem (Sprint 1 Constraints)
- Belum terhubung ke Database/Backend eksternal (menggunakan *in-memory local state* & dummy data).
- Data presensi antara praktikan dan asisten dikelola via state/dummy yang merepresentasikan alur nyata.
- Menggunakan Flexbox untuk responsivitas tampilan perangkat mobile.
- Menggunakan Expo Router untuk manajemen rute dan navigasi.

---

## 2. Kebutuhan Pengguna & Skenario Alur

### 2.1 Peran Pengguna (User Roles)
1. **Asisten Praktikum (Assistant):**
   - Mengelola sesi (melihat jadwal, membuka sesi, menutup sesi praktikum).
   - Memantau rekapitulasi kehadiran praktikan beserta cap waktu (*timestamp*).
2. **Praktikan (Student):**
   - Melihat jadwal dan detail sesi praktikum (mata kuliah, kelas, ruangan, waktu, status).
   - Melakukan presensi ketika sesi dibuka (*open*).
   - Melihat riwayat/catatan kehadiran diri sendiri.

### 2.2 Skenario Alur Utama (End-to-End Workflow)
```
[Asisten]                 [Praktikan]
    │                          │
    ▼                          │
1. Buka Sesi Praktikum         │
    │                          │
    │ (Status Sesi: DIBUKA)    │
    │                          ▼
    │                   2. Masuk ke Sesi &
    │                      Lakukan Presensi
    │                          │
    │ (Catat Waktu & Status)   │
    ▼                          ▼
3. Lihat Rekapitulasi   3. Lihat Konfirmasi &
   Kehadiran Peserta       Catatan Kehadiran
    │                          │
    ▼                          │
4. Tutup Sesi Praktikum        │
    │ (Status Sesi: DITUTUP)   │
    ▼                          ▼
(Sesi Selesai - Tidak bisa presensi lagi)
```

---

## 3. Spesifikasi Kebutuhan Fungsional (Functional Requirements)

| Kode Kebutuhan | Deskripsi Kebutuhan | Peran | Kriteria Penerimaan (Acceptance Criteria) |
|---|---|---|---|
| **FR-01** | Penggantian Peran & Identitas | Asisten & Praktikan | Pengguna dapat berpindah peran (Asisten/Praktikan) dan memilih identitas dummy dengan mudah melalui UI (selector/modal). |
| **FR-02** | Tampilan Jadwal & Detail Sesi | Asisten & Praktikan | Menampilkan daftar sesi dengan informasi: Nama Praktikum, Kode/Kelas, Ruang, Waktu (Jam Mulai - Selesai), dan Status Sesi (`Belum Dimulai`, `Dibuka`, `Selesai/Ditutup`). |
| **FR-03** | Pembukaan Sesi Praktikum | Asisten | Asisten dapat membuka sesi yang belum dimulai melalui tombol aksi + modal konfirmasi. Status sesi berubah menjadi `DIBUKA`. |
| **FR-04** | Penutupan Sesi Praktikum | Asisten | Asisten dapat menutup sesi praktikum yang sedang aktif melalui konfirmasi. Status berubah menjadi `DITUTUP`. Presensi baru otomatis dikunci. |
| **FR-05** | Form Presensi Praktikan | Praktikan | Praktikan dapat mengisi/mengonfirmasi presensi saat sesi berstatus `DIBUKA`. Sistem mencatat waktu kehadiran lokal secara otomatis. |
| **FR-06** | Validasi Anti-Double Attendance | Praktikan | Praktikan yang sudah presensi pada sesi tertentu dicegah untuk melakukan presensi ulang. Sistem menampilkan status "Sudah Hadir". |
| **FR-07** | Feedback & Modal Konfirmasi | Praktikan & Asisten | Setiap aksi penting (Buka/Tutup Sesi, Submit Presensi) memunculkan Modal/Bottom Sheet umpan balik sukses/peringatan. |
| **FR-08** | Rekap Kehadiran Peserta | Asisten | Asisten dapat melihat daftar nama praktikan, NIM, dan waktu presensi untuk sesi yang dipilih. Terdapat indikator empty state jika belum ada yang hadir. |
| **FR-09** | Riwayat Presensi Praktikan | Praktikan | Praktikan dapat melihat riwayat presensi yang telah ia lakukan beserta waktu presensinya. Terdapat empty state jika belum ada riwayat. |
| **FR-10** | Penanganan Status Kosong (Empty State) | Asisten & Praktikan | Menyediakan visual atau teks informatif ketika jadwal kosong, rekap kosong, atau riwayat presensi kosong. |

---

## 4. Kebutuhan Non-Fungsional (Non-Functional Requirements)

1. **Usability & UX:**
   - Antarmuka responsif menggunakan Flexbox di berbagai orientasi layar smartphone.
   - Pembedaan visual status yang jelas (misal: badge warna hijau untuk sesi `DIBUKA`, abu-abu untuk `DITUTUP`, kuning untuk `MENUNGGU`).
   - Dialog interaksi menggunakan Modal atau BottomSheet yang intuitif.
2. **Performance:**
   - Transisi layar mulus (<100ms) menggunakan Expo Router.
   - Update state instan tanpa lag atau re-render berlebih.
3. **Maintainability:**
   - Struktur folder rapi memisahkan `components`, `hooks`, `types`, `mock/dummy`, dan rute `app`.
   - Kode modular ditulis dengan TypeScript (*strict type-checking*).

---

## 5. Arsitektur Informasi & Susunan Navigasi

### 5.1 Struktur Rute Aplikasi (Expo Router)
```
src/
├── app/
│   ├── _layout.tsx               (Root Layout + Shared Role Context Provider)
│   ├── index.tsx                 (Dashboard Utama / Role Switcher)
│   ├── asisten/
│   │   ├── _layout.tsx           (Tab Navigator Asisten)
│   │   ├── index.tsx             (Daftar Jadwal & Manajemen Sesi)
│   │   ├── sesi/[id].tsx         (Detail Sesi + Kontrol Buka/Tutup + Rekapitulasi)
│   │   └── rekap.tsx             (Rekap Keseluruhan Praktikum)
│   └── praktikan/
│       ├── _layout.tsx           (Tab Navigator Praktikan)
│       ├── index.tsx             (Jadwal Praktikum Aktif & Sesi Tersedia)
│       ├── presensi/[id].tsx     (Detail Sesi + Form Aksi Presensi)
│       └── riwayat.tsx           (Catatan/Riwayat Kehadiran Diri Sendiri)
├── components/
│   ├── common/                   (Badge, Button, Header, EmptyState, RoleSwitchModal)
│   ├── asisten/                  (SessionActionModal, AttendanceTable, StatCard)
│   └── praktikan/                (AttendanceSuccessModal, SessionCard)
├── constants/
│   └── Colors.ts
├── context/
│   └── AttendanceContext.tsx     (In-Memory State Management untuk Sesi & Presensi)
├── types/
│   └── attendance.ts             (Interface Session, Student, AttendanceRecord)
└── data/
    └── mockData.ts               (Dummy Data Sesi, Praktikan, dan Asisten)
```

---

## 6. Kriteria Keberhasilan Sprint 1 (Sprint Acceptance Criteria)
1. **Dapat didemonstrasikan secara *live*:**
   - Alur 1: Switch peran ke Asisten -> Buka sesi praktikum baru -> Status berubah jadi `DIBUKA`.
   - Alur 2: Switch peran ke Praktikan -> Masuk ke sesi terbuka -> Lakukan presensi -> Muncul feedback konfirmasi -> Coba klik lagi (dicegah).
   - Alur 3: Switch kembali ke Asisten -> Masuk ke sesi tersebut -> Rekap kehadiran menampilkan praktikan yang baru saja absen beserta jam presensi.
   - Alur 4: Asisten menutup sesi -> Status menjadi `DITUTUP` -> Praktikan tidak lagi bisa presensi.
2. Seluruh tampilan menggunakan Flexbox dan komponen modular, bersih dari linter error dan type error.
