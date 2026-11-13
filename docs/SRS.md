# Software Requirements Specification (SRS)
## Sistem Presensi Praktikum — Sprint 1 (Selesai) & Sprint 2 (Firebase + AI)

**Proyek:** Aplikasi Presensi Kegiatan Praktikum  
**Platform:** React Native (Expo SDK 58, Expo Router)  
**Target Pengguna:** Praktikan & Asisten Praktikum  
**Metodologi:** Scrum / Agile (Sprint 1 → Sprint 2)  

---

## 1. Pendahuluan

### 1.1 Tujuan
Dokumen ini mendefinisikan spesifikasi kebutuhan perangkat lunak (SRS) untuk dua sprint pengembangan aplikasi presensi praktikum:
- **Sprint 1 ✅ SELESAI** — UI, navigasi, dan simulasi interaksi berbasis *in-memory state* (dummy data).
- **Sprint 2 🚀 AKTIF** — Integrasi Firebase (Auth, Firestore, Security Rules), presensi *real-time*, sistem izin berbasis AI, dan penanganan *edge cases* UI.

### 1.2 Lingkup Masalah (Problem Statement)
Pencatatan kehadiran manual seringkali memakan waktu dan rentan kekeliruan. Asisten praktikum membutuhkan kemudahan dalam membuka/menutup sesi praktikum dan memantau kehadiran secara *real-time*, sedangkan praktikan membutuhkan informasi jadwal yang jelas serta proses presensi yang cepat dan transparan tanpa ada presensi ganda.

Sprint 2 memperluas solusi dengan menghubungkan aplikasi ke backend nyata (Firebase), menambah sistem izin ketidakhadiran yang didukung klasifikasi AI, dan memastikan keamanan data melalui Firebase Security Rules.

### 1.3 Batasan Sistem

#### Sprint 1 (Selesai)
- Menggunakan *in-memory local state* & dummy data (tidak ada koneksi backend).
- Menggunakan Flexbox untuk responsivitas tampilan mobile.
- Menggunakan Expo Router untuk manajemen rute dan navigasi.

#### Sprint 2 (Aktif)
- Backend: Firebase Authentication + Cloud Firestore.
- Klasifikasi alasan izin menggunakan external AI API (bukan penentu otomatis, hanya informasi pendukung).
- Firebase Security Rules wajib diterapkan; tidak ada akses data tanpa autentikasi yang valid.

---

## 2. Kebutuhan Pengguna & Skenario Alur

### 2.1 Peran Pengguna (User Roles)
1. **Asisten Praktikum (Assistant):**
   - Mengelola sesi (melihat jadwal, membuka sesi, menutup sesi praktikum).
   - Melakukan CRUD data Kelas, Peserta, dan Jadwal di Firestore.
   - Memantau rekapitulasi kehadiran praktikan secara *real-time*.
   - Melihat pengajuan izin praktikan beserta klasifikasi AI, lalu memberikan keputusan manual.
2. **Praktikan (Student):**
   - Login dengan akun Firebase dan melihat sesi yang berkaitan dengan akunnya.
   - Melakukan presensi ketika sesi dibuka (*open*).
   - Mengajukan izin ketidakhadiran dengan alasan, dan melihat statusnya.
   - Melihat riwayat/catatan kehadiran diri sendiri.

### 2.2 Skenario Alur (End-to-End Workflow)

**Alur 1 — Presensi Utama (Sprint 1 ✅ + Sprint 2 Real-Time)**
```
[Asisten]                 [Praktikan]
    │                          │
    ▼                          │
1. Buka Sesi Praktikum         │
    │ (Firestore: status=OPEN)  │
    │                          ▼
    │                   2. Masuk ke Sesi &
    │                      Lakukan Presensi
    │ (Real-time listener)     │
    ▼                          ▼
3. Lihat Rekap Real-Time  3. Lihat Konfirmasi &
   (tanpa reload)             Catatan Kehadiran
    ▼
4. Tutup Sesi (status=CLOSED)
```

**Alur 2 — Pengajuan Izin (Sprint 2 Baru)**
```
[Praktikan]                      [Asisten]
    │                                │
    ▼                                │
1. Ajukan Form Izin                  │
   (Alasan ketidakhadiran)           │
    │                                │
    ▼                                │
2. Sistem kirim alasan ke AI API     │
   → Klasifikasi disimpan di         │
     Firestore (informasi saja)      │
    │                                │
    ▼                                ▼
3. Praktikan lihat             4. Asisten lihat daftar
   status pengajuan               izin + hasil AI
                                  → Terima / Tolak manual
```

---

## 3. Spesifikasi Kebutuhan Fungsional

### 3.1 Sprint 1 — Selesai ✅

| Kode | Deskripsi | Peran | Kriteria Penerimaan |
|---|---|---|---|
| **FR-01** | Penggantian Peran & Identitas (dummy) | Asisten & Praktikan | Pengguna dapat berpindah peran dan memilih identitas dummy melalui UI. ✅ |
| **FR-02** | Tampilan Jadwal & Detail Sesi | Asisten & Praktikan | Menampilkan daftar sesi (nama, kelas, ruang, waktu, status). ✅ |
| **FR-03** | Pembukaan Sesi Praktikum | Asisten | Asisten dapat membuka sesi (`NOT_STARTED` → `OPEN`) via modal konfirmasi. ✅ |
| **FR-04** | Penutupan Sesi Praktikum | Asisten | Asisten dapat menutup sesi (`OPEN` → `CLOSED`). Presensi baru dikunci. ✅ |
| **FR-05** | Form Presensi Praktikan | Praktikan | Praktikan dapat presensi saat sesi `OPEN`. Waktu tercatat otomatis. ✅ |
| **FR-06** | Validasi Anti-Double Attendance | Praktikan | Presensi ulang dicegah. Tombol terkunci dengan status "Sudah Hadir". ✅ |
| **FR-07** | Feedback & Modal Konfirmasi | Semua | Modal umpan balik untuk setiap aksi penting. ✅ |
| **FR-08** | Rekap Kehadiran Peserta | Asisten | Daftar praktikan hadir beserta NIM dan timestamp. ✅ |
| **FR-09** | Riwayat Presensi Praktikan | Praktikan | Daftar riwayat presensi pribadi dengan empty state. ✅ |
| **FR-10** | Penanganan Empty State | Semua | Tampilan informatif saat data kosong. ✅ |

### 3.2 Sprint 2 — Aktif 🚀

| Kode SRS | Deskripsi | Peran | Kriteria Penerimaan | Pemilik |
|---|---|---|---|---|
| **SRS-AUTH-01** | Registrasi & Login via Firebase Authentication | Semua | Pengguna dapat mendaftar dan login dengan email/password. Sesi login persisten. | Bayu |
| **SRS-AUTH-02** | Routing berbasis peran setelah login | Sistem | Setelah login, sistem membaca `role` dari Firestore dan mengarahkan ke `/assistant` atau `/student` secara otomatis. | Bayu |
| **SRS-CRUD-01** | CRUD Kelas, Peserta, dan Jadwal (Firestore) | Asisten | Asisten dapat membuat, membaca, mengubah, dan menghapus data di Firestore. | Bayu |
| **SRS-CRUD-02** | Daftar sesi sesuai akun praktikan | Praktikan | Praktikan hanya melihat sesi yang berkaitan dengan akun/kelasnya. | Bayu |
| **SRS-PRES-01** | Buka & Tutup Sesi (Firestore) | Asisten | Asisten membuka/menutup sesi; status tersimpan di Firestore dan terlihat real-time. | Bahir |
| **SRS-PRES-02** | Presensi + Anti-Bocor (Firestore) | Praktikan | Praktikan presensi sekali per sesi; sistem memblokir upaya duplikasi. | Bahir |
| **SRS-SYNC-01** | Rekap Kehadiran Real-Time (Firestore Listener) | Asisten | Rekap hadir ter-update otomatis tanpa reload menggunakan `onSnapshot`. | Bahir |
| **SRS-SEC-01** | Firebase Security Rules | Sistem | Semua baca/tulis ke Firestore dilindungi Rules berbasis identitas & peran. Tidak ada akses anonim. | Bahir |
| **SRS-IZIN-01** | Form Pengajuan Izin Ketidakhadiran | Praktikan | Praktikan mengajukan izin dengan alasan untuk sesi tertentu dan melihat statusnya (`PENDING` / `APPROVED` / `REJECTED`). | Ferdy |
| **SRS-AI-01** | Klasifikasi Alasan Izin via AI API | Sistem | Alasan izin dikirim ke external AI API; hasilnya disimpan di Firestore sebagai informasi pendukung (bukan keputusan otomatis). | Ferdy |
| **SRS-IZIN-02** | Review Izin oleh Asisten + Keputusan Manual | Asisten | Asisten melihat daftar pengajuan izin beserta klasifikasi AI, lalu menerima atau menolak secara manual. | Ferdy |
| **SRS-UI-01** | Penanganan Kondisi Kegagalan & Edge Cases | Sistem | Sistem menampilkan feedback UI yang tepat untuk: input tidak valid, data kosong, belum login, dan layanan AI tidak merespons. | Ferdy |

---

## 4. Kebutuhan Non-Fungsional

1. **Usability & UX:**
   - Antarmuka responsif menggunakan Flexbox di berbagai ukuran layar.
   - Pembedaan visual status yang jelas (badge warna per status).
   - Dialog interaksi menggunakan Modal yang intuitif.
2. **Performance:**
   - Transisi layar mulus (<100ms) menggunakan Expo Router.
   - Update state real-time tanpa reload (Firestore `onSnapshot`).
3. **Security:**
   - Firebase Security Rules wajib membatasi akses berdasarkan `uid` dan `role`.
   - Tidak ada data sensitif yang tersimpan di local state setelah logout.
4. **Maintainability:**
   - Struktur folder mengikuti arsitektur yang sudah ada (feature-based, thin routes).
   - Sprint 2 mengganti `store/` (in-memory) dengan `services/` (Firebase), **tanpa mengubah komponen UI yang sudah selesai**.

---

## 5. Arsitektur Informasi & Susunan Navigasi

> Detail lengkap, aturan import, dan kepemilikan file: [ARCHITECTURE.md](ARCHITECTURE.md).

```
src/
├── app/                              (RUTE saja, tanpa logika bisnis)
│   ├── _layout.tsx                   (Root Stack + Provider)
│   ├── index.tsx                     (Login / Role Select)
│   ├── assistant/
│   │   ├── (tabs)/_layout.tsx        (Tab Asisten: Jadwal | Rekap | Izin)
│   │   ├── (tabs)/index.tsx          (Daftar Jadwal & Manajemen Sesi)
│   │   ├── (tabs)/recap.tsx          (Rekap Keseluruhan Real-Time)
│   │   ├── (tabs)/permits.tsx        (📋 BARU S2: Daftar Izin Praktikan + Review)
│   │   └── session/[id].tsx          (Detail Sesi + Kontrol Buka/Tutup)
│   └── student/
│       ├── (tabs)/_layout.tsx        (Tab Praktikan: Jadwal | Riwayat | Izin)
│       ├── (tabs)/index.tsx          (Jadwal Praktikum Aktif)
│       ├── (tabs)/history.tsx        (Riwayat Kehadiran Pribadi)
│       ├── (tabs)/permit.tsx         (📋 BARU S2: Form & Status Izin Praktikan)
│       └── attendance/[id].tsx       (Form Presensi)
├── features/
│   ├── role/components/              (RoleSelectorModal)
│   ├── sessions/components/          (SessionCard, StatusBadge, SessionControlModal, CreateSessionModal)
│   ├── attendance/components/        (AttendanceForm, AttendanceSuccessCard, AttendanceTable, HistoryItemCard)
│   └── permits/components/           (📋 BARU S2: PermitForm, PermitStatusCard, PermitReviewCard)
├── services/                         (📋 BARU S2: Firebase client — auth.ts, sessions.ts, attendance.ts, permits.ts)
├── store/                            (In-memory state Sprint 1 — dipertahankan sebagai fallback)
├── components/ui/                    (CustomButton, Card, EmptyState, FeedbackModal, ...)
├── constants/theme.ts
├── types/                            (attendance.ts + 📋 BARU S2: permit.ts)
├── data/mockData.ts                  (Sprint 1 dummy data — tidak diubah)
└── utils/
```

---

## 6. Kriteria Keberhasilan

### Sprint 1 ✅ Sudah Tercapai
1. Alur Asisten: Tambah sesi → Buka → Status `OPEN`.
2. Alur Praktikan: Presensi → Konfirmasi → Anti-duplikasi.
3. Rekap: Asisten melihat daftar hadir real-time (in-memory).
4. Tutup sesi: Status `CLOSED` → Presensi dikunci.

### Sprint 2 🚀 Target Demo
1. **Auth:** Login dengan Firebase → Routing otomatis ke dashboard sesuai peran.
2. **CRUD:** Asisten membuat sesi baru di Firestore; sesi muncul di HP praktikan secara real-time.
3. **Presensi Real-Time:** Praktikan presensi → Rekap asisten ter-update tanpa reload.
4. **Security:** Akses Firestore ditolak jika tidak login atau mencoba akses data peran lain.
5. **Izin:** Praktikan mengajukan izin → AI mengklasifikasi → Asisten melihat klasifikasi & memutuskan.
6. **Edge Cases:** Semua kondisi gagal (offline, AI timeout, input kosong) menampilkan feedback UI yang tepat.
