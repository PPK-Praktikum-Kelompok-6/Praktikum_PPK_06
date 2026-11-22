# Software Requirements Specification (SRS)
## Sistem Presensi Praktikum — Sprint 1 (Selesai), Sprint 2 (Selesai), & Sprint 3 (Geolocation, Maps & Push Notification)

**Proyek:** Aplikasi Presensi Kegiatan Praktikum  
**Platform:** React Native (Expo SDK 58, Expo Router)  
**Target Pengguna:** Praktikan, Asisten Praktikum, & Admin  
**Metodologi:** Scrum / Agile (Sprint 1 → Sprint 2 → Sprint 3)

---

## 1. Pendahuluan

### 1.1 Tujuan
Dokumen ini mendefinisikan spesifikasi kebutuhan perangkat lunak (SRS) untuk tiga sprint pengembangan aplikasi presensi praktikum:
- **Sprint 1 ✅ SELESAI** — UI Design System, navigasi, dan simulasi interaksi berbasis *in-memory state* (dummy data).
- **Sprint 2 ✅ SELESAI** — Integrasi Firebase (Auth, Firestore, Security Rules), role Admin/Asisten/Praktikan, presensi *real-time*, dan sistem izin berbasis AI.
- **Sprint 3 🚀 AKTIF** — Presensi berbasis lokasi fisik (*Geolocation* & *Geofencing* radius laboratorium), halaman khusus presensi terpisah dari detail sesi, peta laboratorium interaktif (*Maps*) dengan informasi praktikum *real-time*, *Push Notification* terarah, serta penanganan *permissions* & kondisi perangkat.

### 1.2 Lingkup Masalah (Problem Statement)
Setelah Sprint 2 selesai, sistem autentikasi, manajemen sesi, presensi, kelas, dan pengajuan izin telah terintegrasi secara *real-time* dengan Firebase. Namun terdapat dua permasalahan baru yang harus diselesaikan pada Sprint 3:
1. **Presensi belum memvalidasi lokasi fisik:** Praktikan masih dapat melakukan presensi dari mana saja selama sesi berstatus `OPEN`.
2. **Belum ada pemberitahuan proaktif & pemetaan lab:** Pengguna masih harus membuka aplikasi secara manual untuk mengetahui sesi yang baru dibuka, perubahan jadwal, atau keputusan pengajuan izin, serta belum tersedia peta interaktif persebaran laboratorium Informatika beserta aktivitas praktikumnya.

### 1.3 Batasan Sistem

#### Sprint 1 & Sprint 2 (Selesai)
- Autentikasi dan penyimpanan data utama menggunakan Firebase Authentication dan Cloud Firestore (bukan *local storage*).
- Antarmuka responsif berbasis Flexbox menggunakan token `src/constants/theme.ts` dan primitif `src/components/ui/*`.
- Firebase Security Rules melindungi akses baca/tulis sesuai identitas dan peran.

#### Sprint 3 (Aktif)
- **Geolocation & Maps:** Menggunakan `expo-location` dan `react-native-maps` (dikonfigurasi melalui `app.json` sesuai Expo SDK 58 CNG).
- **Validasi Lokasi Wajib di Proses Pencatatan:** Validasi radius laboratorium harus dieksekusi di dalam proses pencatatan presensi ke Firestore, bukan sekadar indikator visual di antarmuka. Presensi yang tidak memenuhi ketentuan sesi (`OPEN`) atau lokasi (`jarak <= radius`) **tidak boleh** dicatat sebagai kehadiran berhasil.
- **Push Notification Terarah:** Menggunakan Firebase Cloud Messaging (FCM) / `expo-notifications` + event Firestore; notifikasi hanya dikirim ke pengguna yang berkepentingan.
- **Anti-Double Attendance:** Tetap memastikan pengguna tidak dapat melakukan presensi lebih dari satu kali pada sesi yang sama.

---

## 2. Kebutuhan Pengguna & Skenario Alur

### 2.1 Peran Pengguna (User Roles)
1. **Asisten Praktikum (Assistant):**
   - Mengelola sesi (menambah, membuka, menutup, dan mengubah jadwal sesi praktikum).
   - Menentukan lokasi laboratorium (koordinat) dan radius presensi yang berlaku di Cloud Firestore.
   - Memantau rekapitulasi kehadiran praktikan secara *real-time*.
   - Meninjau pengajuan izin praktikan beserta klasifikasi AI dan memberikan keputusan manual (memicu notifikasi ke praktikan terkait).
   - Melihat peta laboratorium interaktif beserta aktivitas praktikum.
2. **Praktikan (Student):**
   - Login dengan akun Firebase dan melihat jadwal sesi sesuai kelas/akunnya.
   - Melihat detail sesi, lalu masuk ke **halaman khusus presensi** untuk melakukan presensi berbasis lokasi (dalam radius lab saat sesi `OPEN`).
   - Membuka **halaman Maps** untuk melihat posisi diri secara *live* dan memilih marker lab guna melihat praktikum berlangsung & berikutnya.
   - Mengajukan izin ketidakhadiran dan menerima *push notification* ketika sesi dibuka, jadwal berubah, atau izin diterima/ditolak.
   - Melihat riwayat kehadiran pribadi.
3. **Admin (Pengelola Sistem — Sprint 2):**
   - Mengelola kelas, persetujuan pendaftaran akun, serta persetujuan perubahan/penghapusan jadwal sesi.

### 2.2 Skenario Alur Utama Sprint 3 (3 Objektif Demo)

**Alur 1 — Presensi Berbasis Lokasi (Zaidan)**
```
[Asisten]                          [Praktikan]
    │                                   │
    ▼                                   │
1. Atur Lokasi Lab & Radius             │
   + Buka Sesi (status = OPEN)          │
    │ (Tersimpan di Firestore)          │
    │                                   ▼
    │                            2. Buka Detail Sesi
    │                               → Masuk Halaman Khusus Presensi
    │                                   │
    │                                   ▼
    │                            3. Aplikasi Cek GPS & Radius Lab
    │                               (Validasi: OPEN && dalam radius)
    │                                   │
    │ (Real-time onSnapshot)            ▼
    ▼                            4. Presensi Tercatat di Firestore
5. Asisten Lihat Rekap              (atau ditolak jika di luar radius)
   Kehadiran Real-Time
```

**Alur 2 — Peta & Informasi Laboratorium Interaktif (Ferdy)**
```
[Pengguna (Praktikan / Asisten)]
    │
    ▼
1. Buka Halaman Maps
    │
    ▼
2. Aplikasi Minta Izin Lokasi → Tampilkan Marker Lab Informatika
   + Marker Posisi Pengguna (Live Tracking)
    │
    ▼
3. Pengguna Ketuk Salah Satu Marker Laboratorium
    │
    ▼
4. Tampilkan Info Aktivitas Lab dari Firestore:
   • Praktikum Sedang Berlangsung (OPEN)
   • Praktikum Berikutnya (NOT_STARTED)
   (Nama Praktikum, Kelas, Waktu, Status Sesi)
```

**Alur 3 — Push Notification Kegiatan Terarah (Ferdy)**
```
[Asisten]                                [Praktikan Terkait]
    │                                            │
    ▼                                            │
1. Buka Sesi / Ubah Jadwal /                     │
   Terima atau Tolak Pengajuan Izin              │
    │                                            │
    ▼                                            │
2. Sistem Memicu Event Notifikasi                │
   (Targeted hanya ke praktikan terkait)         │
    │                                            ▼
    └────────────── Push Notification ───► 3. Terima Pemberitahuan
                   (FCM / Expo Notif)         → Ketuk Notif (Deep Link)
                                              → Masuk Halaman Terkait
```

---

## 3. Spesifikasi Kebutuhan Fungsional

### 3.1 Sprint 1 — Selesai ✅

| Kode | Deskripsi | Peran | Kriteria Penerimaan |
|---|---|---|---|
| **FR-01** | Penggantian Peran & Identitas | Asisten & Praktikan | Pengguna dapat berpindah peran dan identitas melalui UI. ✅ |
| **FR-02** | Tampilan Jadwal & Detail Sesi | Asisten & Praktikan | Menampilkan daftar sesi (nama, kelas, ruang, waktu, status). ✅ |
| **FR-03** | Pembukaan Sesi Praktikum | Asisten | Asisten dapat membuka sesi (`NOT_STARTED` → `OPEN`) via modal konfirmasi. ✅ |
| **FR-04** | Penutupan Sesi Praktikum | Asisten | Asisten dapat menutup sesi (`OPEN` → `CLOSED`). Presensi baru dikunci. ✅ |
| **FR-05** | Form Presensi Praktikan | Praktikan | Praktikan dapat presensi saat sesi `OPEN`. Waktu tercatat otomatis. ✅ |
| **FR-06** | Validasi Anti-Double Attendance | Praktikan | Presensi ulang dicegah. Tombol terkunci dengan status "Sudah Hadir". ✅ |
| **FR-07** | Feedback & Modal Konfirmasi | Semua | Modal umpan balik untuk setiap aksi penting. ✅ |
| **FR-08** | Rekap Kehadiran Peserta | Asisten | Daftar praktikan hadir beserta NIM dan timestamp. ✅ |
| **FR-09** | Riwayat Presensi Praktikan | Praktikan | Daftar riwayat presensi pribadi dengan empty state. ✅ |
| **FR-10** | Penanganan Empty State | Semua | Tampilan informatif saat data kosong. ✅ |

### 3.2 Sprint 2 — Selesai ✅

| Kode SRS | Deskripsi | Peran | Kriteria Penerimaan | Pemilik |
|---|---|---|---|---|
| **SRS-AUTH-01** | Registrasi & Login via Firebase Authentication | Semua | Pengguna mendaftar, login, dan logout dengan email/password. ✅ | Bayu |
| **SRS-AUTH-02** | Routing berbasis peran setelah login | Sistem | Sistem membaca `role` dari Firestore dan mengarahkan otomatis sesuai peran. ✅ | Bayu |
| **SRS-CRUD-01** | CRUD Kelas, Peserta, dan Jadwal (Firestore) | Asisten/Admin | Operasi Create, Read, Update, Delete tersimpan di Firestore. ✅ | Bayu |
| **SRS-CRUD-02** | Daftar sesi sesuai akun praktikan | Praktikan | Praktikan hanya melihat sesi yang berkaitan dengan akun/kelasnya. ✅ | Bayu |
| **SRS-PRES-01** | Buka & Tutup Sesi (Firestore) | Asisten | Status sesi tersimpan di Firestore dan tersinkron real-time. ✅ | Bahir |
| **SRS-PRES-02** | Presensi + Anti-Bocor (Firestore) | Praktikan | Presensi sekali per sesi via transaksi atomik Firestore. ✅ | Bahir |
| **SRS-SYNC-01** | Rekap Kehadiran Real-Time (`onSnapshot`) | Asisten | Rekap hadir ter-update otomatis tanpa reload. ✅ | Bahir |
| **SRS-SEC-01** | Firebase Security Rules | Sistem | Akses Firestore dibatasi sesuai identitas & peran di `firestore.rules`. ✅ | Bahir |
| **SRS-IZIN-01** | Form Pengajuan Izin Ketidakhadiran | Praktikan | Praktikan mengajukan izin dan memantau status (`PENDING`/`APPROVED`/`REJECTED`). ✅ | Ferdy |
| **SRS-AI-01** | Klasifikasi Alasan Izin via Model AI | Sistem | Alasan izin diklasifikasi sebagai informasi pendukung bagi asisten. ✅ | Ferdy |
| **SRS-IZIN-02** | Review Izin oleh Asisten + Keputusan Manual | Asisten | Asisten melihat hasil klasifikasi AI dan memutuskan terima/tolak manual. ✅ | Ferdy |
| **SRS-UI-01** | Penanganan Kondisi Kegagalan & Edge Cases | Sistem | Feedback UI ramah untuk input tidak valid, data kosong, & fallback AI. ✅ | Ferdy |

### 3.3 Sprint 3 — Aktif 🚀 (Pembagian Khusus Zaidan & Ferdy)

| Kode SRS | Deskripsi | Peran | Kriteria Penerimaan | Pemilik |
|---|---|---|---|---|
| **SRS-S3-01** | **Halaman Khusus Presensi** *(+ Opsional QR Code)* | Praktikan | Tersedia halaman khusus presensi (`/student/check-in/[id]`) yang terpisah dari halaman detail sesi (`/student/attendance/[id]`). Menampilkan info sesi, status sesi, hasil pemeriksaan lokasi, dan aksi presensi *(opsional: QR Code ditampilkan asisten & dipindai praktikan)*. | **Zaidan** |
| **SRS-S3-02** | **Validasi Lokasi Presensi (Geofencing Radius)** | Praktikan & Sistem | Menggunakan GPS perangkat & rumus jarak untuk memvalidasi apakah praktikan berada di dalam radius lab. Presensi hanya tercatat jika sesi `OPEN` **dan** berada dalam radius yang diizinkan. Menampilkan hasil pemeriksaan lokasi (di dalam radius, di luar radius + jarak meter, atau lokasi tidak diperoleh). | **Zaidan** |
| **SRS-S3-03** | **Pengelolaan Lokasi & Radius Laboratorium (Firestore)** | Asisten | Setiap lab memiliki koordinat (`latitude`, `longitude`) dan `radiusMeters` di Cloud Firestore (`labs` / `sessions`). Asisten dapat menentukan/mengubah lokasi lab dan radius yang berlaku untuk sesi praktikum. | **Zaidan** |
| **SRS-S3-04** | **Peta Laboratorium Interaktif (Maps + Live User Marker)** | Praktikan & Asisten | Halaman Maps menampilkan marker seluruh laboratorium Informatika dan marker lokasi pengguna yang diperbarui secara langsung mengikuti perubahan lokasi perangkat selama halaman dibuka. Pengguna dapat memilih marker lab. | **Ferdy** |
| **SRS-S3-05** | **Informasi Aktivitas Laboratorium di Peta (Real-Time)** | Praktikan & Asisten | Memilih marker lab menampilkan **praktikum yang sedang berlangsung** dan **praktikum berikutnya** dari Firestore (nama praktikum, kelas, waktu pelaksanaan, status sesi). Perubahan jadwal/status sesi langsung tercermin pada info lab. | **Ferdy** |
| **SRS-S3-06** | **Push Notification Kegiatan Terarah (FCM / Expo Notif)** | Sistem & Praktikan | Mengirim push notification khusus kepada pengguna terkait saat: (1) sesi praktikum dibuka, (2) jadwal praktikum berubah, dan (3) pengajuan izin diterima/ditolak oleh asisten. Mendukung Android Channels, foreground/background handling, dan deep link ke layar tujuan. | **Ferdy** |
| **SRS-S3-07** | **Penanganan Izin Akses & Kondisi Perangkat** | Semua | Meminta izin akses lokasi dan notifikasi sesuai kebutuhan. Menangani dan menampilkan informasi UI yang jelas saat izin ditolak, GPS tidak aktif, lokasi belum tersedia, koneksi gangguan, atau notifikasi tidak dapat diterima (*in-app fallback*). | **Ferdy** |

---

## 4. Kebutuhan Non-Fungsional

1. **Usability & UX:**
   - Antarmuka tetap konsisten menggunakan primitif `src/components/ui/*` dan token `Colors.*` di `src/constants/theme.ts` (tanpa hardcoded hex).
   - Pesan status lokasi, jarak meter, dan panduan aktivasi izin/GPS ditampilkan jelas dalam Bahasa Indonesia.
2. **Performance & Real-Time Consistency:**
   - Seluruh data lab, jadwal, sesi, presensi, dan notifikasi bersumber dari Cloud Firestore agar konsisten antar perangkat.
   - *Location watcher* (`watchPositionAsync`) dan Firestore `onSnapshot` wajib di-*cleanup* (`remove()` / `unsubscribe()`) saat layar *unmount* untuk menghindari kebocoran memori dan boros baterai.
3. **Security & Validation Integrity:**
   - Validasi radius lokasi dilakukan di level logika pencatatan presensi (`submitAttendanceToFirestore`), bukan hanya menonaktifkan tombol UI.
   - Anti-double attendance tetap berlaku ketat (`attendance_${sessionId}_${studentId}`).
4. **Maintainability:**
   - Mengikuti arsitektur *Pragmatic Feature-Based* (`docs/ARCHITECTURE.md`) dan aturan `eslint.config.js`.

---

## 5. Arsitektur Informasi & Susunan Navigasi (Sprint 1–3)

> Detail lengkap, aturan import, dan kepemilikan file: [ARCHITECTURE.md](ARCHITECTURE.md).

```text
src/
├── app/                              (RUTE saja, tanpa logika bisnis)
│   ├── _layout.tsx                   (Root Stack + Provider + Notification Listener)
│   ├── index.tsx                     (Login / Registrasi Firebase + Auto-Redirect RBAC)
│   ├── admin/(tabs)/                 (Dashboard Admin, Kelas, Approvals)
│   ├── assistant/
│   │   ├── (tabs)/_layout.tsx        (Tab Asisten: Jadwal | Rekap | Izin | 📍 Peta Lab)
│   │   ├── (tabs)/index.tsx          (Daftar Jadwal & Manajemen Sesi)
│   │   ├── (tabs)/recap.tsx          (Rekap Keseluruhan Real-Time)
│   │   ├── (tabs)/permits.tsx        (Daftar Izin Praktikan + Review)
│   │   ├── (tabs)/maps.tsx           (📋 BARU S3 Ferdy: Peta Lab Interaktif & Aktivitas)
│   │   └── session/[id].tsx          (Detail Sesi + Buka/Tutup + Konfigurasi Lokasi/Radius Lab)
│   └── student/
│       ├── (tabs)/_layout.tsx        (Tab Praktikan: Jadwal | Riwayat | Izin | 📍 Peta Lab)
│       ├── (tabs)/index.tsx          (Jadwal Praktikum Aktif)
│       ├── (tabs)/history.tsx        (Riwayat Kehadiran Pribadi)
│       ├── (tabs)/permit.tsx         (Form & Status Izin Praktikan)
│       ├── (tabs)/maps.tsx           (📋 BARU S3 Ferdy: Peta Lab Interaktif & Aktivitas)
│       ├── attendance/[id].tsx       (Detail Sesi Praktikan → Tombol ke Halaman Presensi)
│       └── check-in/[id].tsx         (📋 BARU S3 Zaidan: Halaman Khusus Presensi + Validasi Lokasi)
├── features/
│   ├── role/components/              (RoleSelectorModal)
│   ├── sessions/components/          (SessionCard, StatusBadge, SessionControlModal, CreateSessionModal)
│   ├── attendance/components/        (AttendanceForm, AttendanceSuccessCard, AttendanceTable, HistoryItemCard,
│   │                                  📋 S3 Zaidan: LocationStatusBanner, LabLocationConfigModal)
│   ├── permits/components/           (PermitForm, PermitStatusCard, PermitReviewCard)
│   └── maps/components/              (📋 BARU S3 Ferdy: InteractiveLabMap, LabActivitySheet, PermissionAlertCard)
├── services/                         (firebase, auth, admin, sessions, attendance, permits, ai,
│                                      📋 S3 Zaidan: labs.ts | 📋 S3 Ferdy: permissions.ts, notifications.ts)
├── types/                            (attendance.ts, permit.ts,
│                                      📋 S3 Zaidan: lab.ts | 📋 S3 Ferdy: notification.ts)
└── utils/                            (formatTime.ts, 📋 S3 Zaidan: geo.ts)
```

---

## 6. Referensi Teknis Sprint 3 (Dari Asisten Praktikum)

1. **Rich Push Notifications in React Native (Silversky Technology):**  
   https://medium.com/@silverskytechnology/rich-push-notifications-in-react-native-a-complete-guide-797dd9747366
2. **Implementing Google Maps and Routes Tracking in React Native (Silversky Technology):**  
   https://medium.com/@silverskytechnology/implementing-google-maps-and-routes-tracking-in-react-native-a-starter-guide-9768282594b8

---

## 7. Kriteria Keberhasilan (Target Demo Sprint 3 🚀)

1. **Alur 1 — Presensi Berbasis Lokasi (Zaidan):** Asisten mengatur lokasi/radius lab dan membuka sesi → Praktikan membuka detail sesi lalu masuk ke **halaman khusus presensi** → Aplikasi memeriksa lokasi perangkat & radius laboratorium → Presensi berhasil dicatat ke Firestore apabila dalam radius (dan ditolak bila di luar radius) → Asisten melihat rekap kehadiran secara real-time.
2. **Alur 2 — Peta & Informasi Laboratorium (Ferdy):** Pengguna membuka halaman **Maps** → Aplikasi menampilkan posisi perangkat pengguna secara *live* dan marker laboratorium Informatika → Pengguna mengetuk salah satu marker lab → Aplikasi menampilkan praktikum yang sedang berlangsung dan praktikum berikutnya dari data Cloud Firestore.
3. **Alur 3 — Notifikasi Kegiatan (Ferdy):** Asisten membuka sesi, mengubah jadwal, atau memberikan keputusan izin → Sistem mengirimkan *push notification* terarah → Pengguna terkait menerima pemberitahuan mengenai perubahan tersebut.
4. **Penanganan Permissions & Integrasi Penuh:** Penolakan izin lokasi/notifikasi, GPS mati, atau gangguan jaringan ditangani dengan feedback UI yang jelas, dan seluruh fitur Sprint 1, 2, serta 3 terintegrasi konsisten di Firebase tanpa error.
