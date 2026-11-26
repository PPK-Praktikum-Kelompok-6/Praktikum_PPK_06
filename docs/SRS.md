# Software Requirements Specification (SRS)
## Sistem Presensi Praktikum — Sprint 1–3 (Selesai) & Sprint 4 / Pertemuan 9 (Manajemen Lab Aslab, Denda Keterlambatan, & Payment Gateway Midtrans)

**Proyek:** Aplikasi Presensi Kegiatan Praktikum  
**Platform:** React Native (Expo SDK 58, Expo Router) + Cloud Firestore + Backend Payment Server (Midtrans Sandbox)  
**Target Pengguna:** Praktikan (`STUDENT`), Asisten Praktikum / Asprak (`ASSISTANT`), Asisten Laboratorium / Aslab (`ASLAB`), & Admin (`ADMIN`)  
**Metodologi:** Scrum / Agile (Sprint 1 → Sprint 2 → Sprint 3 → Sprint 4)

---

## 1. Pendahuluan

### 1.1 Tujuan
Dokumen ini mendefinisikan spesifikasi kebutuhan perangkat lunak (SRS) untuk seluruh tahapan pengembangan aplikasi presensi praktikum:
- **Sprint 1 ✅ SELESAI** — UI Design System, navigasi, dan simulasi interaksi berbasis *in-memory state* (dummy data).
- **Sprint 2 ✅ SELESAI** — Integrasi Firebase (Auth, Firestore, Security Rules), role Admin/Asisten/Praktikan, presensi *real-time*, dan sistem izin berbasis AI.
- **Sprint 3 ✅ SELESAI** — Presensi berbasis lokasi fisik (*Geolocation* & *Geofencing* radius laboratorium), halaman khusus presensi terpisah dari detail sesi, peta laboratorium interaktif (*Maps*) dengan informasi praktikum *real-time*, *Push Notification* terarah, serta penanganan *permissions* & kondisi perangkat.
- **Sprint 4 (Pertemuan 9) 🚀 AKTIF** — Penyempurnaan manajemen laboratorium oleh **Aslab (Role Baru)** termasuk 3 alur *bulk/single insert* terpisah dengan *template download* & *staging editor*, dashboard keberlangsungan laboratorium, fokus wewenang **Asprak**, perhitungan keterlambatan berbasis *grace period* & denda tetap, integrasi **Payment Gateway Midtrans (Sandbox)** dengan arsitektur *client–server–webhook*, notifikasi & riwayat pembayaran persisten, serta finalisasi konsistensi antarmuka.

### 1.2 Lingkup Masalah (Problem Statement)
Setelah Sprint 3 selesai, presensi berbasis lokasi, peta laboratorium, dan push notification telah berfungsi. Namun pada operasional praktikum nyata masih terdapat kebutuhan lanjutan yang diselesaikan pada Sprint 4:
1. **Pemisahan wewenang pengelolaan lab vs pelaksanaan sesi:** Sebelumnya manajemen lab, distribusi praktikan, dan pembukaan sesi masih tercampur di satu peran. Diperlukan peran baru **Aslab** khusus manajemen laboratorium & distribusi anggota, sementara **Asprak** fokus menjalankan sesi praktikum.
2. **Kebutuhan input massal yang fleksibel:** Penambahan banyak laboratorium per mata kuliah, praktikan, dan asprak satu per satu tidak efisien; dibutuhkan *bulk insert* terpisah dilengkapi file template dan pratinjau interaktif (*ScrollView* untuk accept/deny/edit/isi data kosong).
3. **Belum ada mekanisme sanksi keterlambatan & pembayaran digital:** Belum tersedia perhitungan keterlambatan dengan *grace period*, pencatatan denda nominal tetap (beserta pembebasan denda untuk izin disetujui), serta integrasi pembayaran online yang aman melalui Payment Gateway (Midtrans Sandbox) dengan verifikasi webhook backend.
4. **Pemantauan menyeluruh & finalisasi UI:** Aslab memerlukan dashboard keberlangsungan lab (termasuk riwayat keuangan denda dengan filter harian/mingguan/bulanan), dan seluruh peran memerlukan tampilan modern yang konsisten.

### 1.3 Batasan Sistem

#### Sprint 1, 2, & 3 (Selesai)
- Autentikasi dan penyimpanan data utama menggunakan Firebase Authentication dan Cloud Firestore.
- Antarmuka responsif berbasis Flexbox menggunakan token `src/constants/theme.ts` dan primitif `src/components/ui/*`.
- Validasi lokasi geofencing berjalan di dalam proses pencatatan presensi ke Firestore dengan anti-double attendance ketat (`attendance_${sessionId}_${studentId}`).
- Push notification terarah menggunakan `expo-notifications` / FCM + koleksi Firestore `notifications`.

#### Sprint 4 (Aktif)
- **Pemisahan 3 Bulk Insert:** Bulk insert laboratorium (berdasarkan 1 mata kuliah), bulk insert praktikan ke lab, dan bulk insert asprak ke lab **harus dipisah** (bukan satu fitur bulk gabungan) serta masing-masing menyediakan *downloadable file template*.
- **Tanpa Perpindahan Jadwal Praktikum:** Fitur perpindahan hanya mencakup perpindahan **praktikan** (antar lab) dan **aslab/asprak** saja, tidak perlu perpindahan jadwal praktikum.
- **Arsitektur Client–Server–Payment Gateway:** Integrasi Midtrans menggunakan lingkungan **Sandbox** (tanpa uang asli). **Secret Key / Server Key Midtrans tidak boleh disimpan di aplikasi React Native.** Status pembayaran **tidak boleh** ditentukan hanya dari respons sisi client, melainkan wajib diverifikasi oleh **backend melalui callback/webhook** yang valid.
- **Integritas Status Kehadiran vs Denda:**
  - Pembayaran denda **tidak boleh** mengubah status kehadiran praktikan (tetap terlambat).
  - Izin yang disetujui Asprak tetap dicatat sebagai **tidak hadir dengan izin (`EXCUSED_ABSENCE`)** dan **dibebaskan dari denda keterlambatan**; keputusan izin tidak boleh mengubah status menjadi hadir.
  - Setiap kejadian keterlambatan hanya boleh menghasilkan **tepat satu tagihan**.

---

## 2. Kebutuhan Pengguna & Skenario Alur

### 2.1 Peran Pengguna (User Roles)
1. **Asisten Laboratorium / Aslab (`ASLAB` — Role Baru Sprint 4):**
   - Mengelola data laboratorium (nama, lokasi, koordinat, radius/cakupan lokasi presensi, dan batasan keterlambatan waktu / *grace period* & nominal denda).
   - Melakukan single/bulk insert terpisah untuk: (1) sejumlah laboratorium berdasarkan 1 mata kuliah, (2) praktikan ke lab tertentu, dan (3) asprak ke lab tertentu, dengan *downloadable template* dan pratinjau `ScrollView` interaktif (accept/deny, update, isi data kosong).
   - Memindahkan praktikan antar laboratorium serta perpindahan aslab/asprak (tanpa perpindahan jadwal).
   - Memantau **Dashboard Keberlangsungan Laboratorium** (jumlah lab & praktikan, status kegiatan tiap lab, lokasi & waktu, jadwal berlangsung & mendatang, riwayat kegiatan lab, riwayat keuangan hasil denda) dengan filter **hari, minggu, dan bulan**.
2. **Asisten Praktikum / Asprak (`ASSISTANT`):**
   - Difokuskan pada pelaksanaan praktikum di kelas/laboratorium yang menjadi tanggung jawabnya.
   - Melihat daftar kelas, jadwal, dan sesi praktikum tanggung jawabnya.
   - Membuka sesi saat praktikum dimulai, memantau & mengelola presensi praktikan (termasuk status tepat waktu/terlambat dan persetujuan izin → `EXCUSED_ABSENCE`), dan menutup sesi saat selesai secara *real-time*.
   - **Tidak memiliki kewenangan** mengelola distribusi praktikan antar lab maupun konfigurasi seluruh laboratorium.
3. **Praktikan (`STUDENT`):**
   - Melihat jadwal sesi, melakukan check-in berbasis lokasi, mengajukan izin, dan melihat riwayat kehadiran.
   - Melihat daftar tagihan denda keterlambatan beserta rinciannya.
   - Melakukan pembayaran denda melalui Midtrans Sandbox (via backend) dan memantau status (`pending`, `success`, `failed`).
   - Menerima notifikasi saat tagihan baru dibuat, pembayaran berhasil, atau pembayaran gagal.
   - Melihat **Halaman Riwayat Pembayaran** yang tersimpan persisten di Firestore.
4. **Admin (`ADMIN`):**
   - Pengelola hak akses tingkat sistem & persetujuan administratif.

### 2.2 Skenario Alur Utama Sprint 4

**Alur 1 — Manajemen Lab, Bulk Insert Terpisah, & Dashboard Aslab (Zaidan)**
```
[Aslab (Role Baru)]
    │
    ├──► 1. Unduh Template Bulk Insert (Lab / Praktikan / Asprak — terpisah)
    │         → Unggah file → Tiap baris tampil sebagai list interaktif (ScrollView)
    │         → Aslab review: Accept / Deny / Edit / Isi data kosong → Simpan ke Firestore
    │
    ├──► 2. Konfigurasi Lab: Lokasi, Koordinat, Cakupan Radius Presensi,
    │         Batasan Keterlambatan (Grace Period) & Nominal Denda
    │         + Pindahkan Praktikan / Aslab antar Lab (tanpa pindah jadwal)
    │
    └──► 3. Pantau Dashboard Keberlangsungan Lab (Filter: Hari / Minggu / Bulan)
              → Jumlah Lab & Praktikan, Status Tiap Lab, Lokasi & Waktu,
                Jadwal Berlangsung & Mendatang, Riwayat Kegiatan & Keuangan Denda
```

**Alur 2 — Pengelolaan Sesi Asprak, Grace Period, Denda & Excused Absence (Bayu)**
```
[Asprak]                                     [Praktikan]
    │                                             │
    ▼                                             │
1. Buka Sesi Praktikum (Real-Time Sync)           │
   (Mulai = T0, Grace Period = G menit)           │
    │                                             ▼
    │                                      2. Lakukan Presensi (Waktu = T_absen)
    │                                             │
    │                                      ┌──────┴────────────────────────┐
    │                                      ▼                               ▼
    │                            T_absen <= T0 + G               T_absen > T0 + G
    │                            Status: ON_TIME                 Status: LATE
    │                            (Tanpa Denda)                   → Generate 1 Tagihan Denda
    │                                                              (Nominal Tetap, ID unik)
    │                                                              → Trigger Notif Tagihan Baru
    ▼
3. Jika Praktikan Ajukan Izin & Disetujui Asprak:
   → Status: EXCUSED_ABSENCE (Tidak Hadir dengan Izin, BUKAN Hadir)
   → Dibebaskan dari Denda Keterlambatan
```

**Alur 3 — Pembayaran Denda Midtrans Sandbox & Notifikasi (Ferdy)**
```
[Praktikan App (RN)]          [Backend Server]             [Midtrans Sandbox]
        │                            │                             │
        │── 1. Request Bayar ───────►│                             │
        │      (fineId, studentId)   │── 2. Create Snap Tx ───────►│
        │                            │      (pakai SERVER_KEY)     │
        │◄── 3. snapToken / URL ─────│◄─ 4. Snap Redirect URL ─────│
        │                            │                             │
        │── 5. Selesaikan Pembayaran di Halaman Midtrans ─────────►│
        │                            │                             │
        │                            │◄─ 6. HTTP Webhook Callback ─│
        │                            │   (Verifikasi Signature Key)│
        │                            │                             │
        │                            │── 7. Update Firestore:      │
        │                            │   • payment status          │
        │                            │     (pending/success/failed)│
        │                            │   • fine status (PAID/dll)  │
        │                            │   • status hadir TIDAK ubah │
        │◄── 8. Push Notification ───│   • kirim notif hasil bayar │
        │    + Riwayat Pembayaran    │                             │
        │      Tersimpan Permanen    │                             │
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

### 3.3 Sprint 3 — Selesai ✅

| Kode SRS | Deskripsi | Peran | Kriteria Penerimaan | Pemilik |
|---|---|---|---|---|
| **SRS-S3-01** | Halaman Khusus Presensi *(+ Opsional QR Code)* | Praktikan | Halaman `/student/check-in/[id]` terpisah dari detail sesi `/student/attendance/[id]`. ✅ | Zaidan |
| **SRS-S3-02** | Validasi Lokasi Presensi (Geofencing Radius) | Praktikan & Sistem | Validasi jarak GPS (Haversine) dalam proses pencatatan Firestore. ✅ | Zaidan |
| **SRS-S3-03** | Pengelolaan Lokasi & Radius Laboratorium (Firestore) | Asisten | Koordinat & radius lab tersimpan di Cloud Firestore (`labs` / `sessions`). ✅ | Zaidan |
| **SRS-S3-04** | Peta Laboratorium Interaktif (Maps + Live User Marker) | Praktikan & Asisten | Marker seluruh lab Informatika + live user tracking. ✅ | Ferdy |
| **SRS-S3-05** | Informasi Aktivitas Laboratorium di Peta (Real-Time) | Praktikan & Asisten | Ketuk marker lab menampilkan praktikum berlangsung & berikutnya dari Firestore. ✅ | Ferdy |
| **SRS-S3-06** | Push Notification Kegiatan Terarah (FCM / Expo Notif) | Sistem & Praktikan | Notifikasi terarah saat sesi dibuka, jadwal berubah, dan izin diputuskan. ✅ | Ferdy |
| **SRS-S3-07** | Penanganan Izin Akses & Kondisi Perangkat | Semua | Penanganan izin lokasi/notifikasi ditolak, GPS mati, offline, & fallback UI. ✅ | Ferdy |

### 3.4 Sprint 4 (Pertemuan 9) — Aktif 🚀

| Kode SRS | Deskripsi | Peran | Kriteria Penerimaan | Pemilik |
|---|---|---|---|---|
| **SRS-S4-01** | **Manajemen Laboratorium oleh Aslab (Role Baru `ASLAB`)** | Aslab | Sebagai Aslab, saya dapat: (1) menambah & mengelola data lab (nama, lokasi, koordinat, cakupan/radius presensi, batasan keterlambatan waktu & nominal denda); (2) melakukan **3 bulk/single insert terpisah** — lab per satu mata kuliah, praktikan ke lab tertentu, dan asprak ke lab tertentu — masing-masing disertai **downloadable file template**; (3) meninjau hasil parsing bulk dalam **list `ScrollView` interaktif** (accept/deny per baris, edit/update, mengisi field kosong) sebelum simpan; (4) memindahkan praktikan antar lab serta memindahkan aslab/asprak tanpa perpindahan jadwal praktikum. | **Zaidan** |
| **SRS-S4-02** | **Dashboard Keberlangsungan Laboratorium** | Aslab | Sebagai Aslab, saya dapat memantau seluruh lab yang dikelola dari data jadwal & sesi Firebase secara real-time, menampilkan: (1) jumlah laboratorium dan praktikan, (2) status kegiatan praktikum pada tiap lab, (3) informasi lokasi dan waktu pelaksanaan, (4) jadwal praktikum berlangsung maupun yang akan datang, (5) riwayat kegiatan laboratorium, dan (6) riwayat keuangan hasil dari denda praktikum; dilengkapi filter **hari, minggu, dan bulan**. | **Zaidan** |
| **SRS-S4-03** | **Pengelolaan Sesi Real-Time oleh Asprak** | Asprak (`ASSISTANT`) | Sebagai Asprak, saya difokuskan untuk: (1) melihat daftar kelas, jadwal, dan sesi praktikum yang menjadi tanggung jawab saya, (2) membuka sesi saat praktikum dimulai, (3) memantau & mengelola presensi praktikan, dan (4) menutup sesi saat selesai dengan sinkronisasi real-time ke aplikasi praktikan. Asprak **tidak memiliki akses** ke manajemen distribusi praktikan antar lab maupun konfigurasi seluruh laboratorium. | **Bayu** |
| **SRS-S4-04** | **Perhitungan Keterlambatan (Grace Period) & Pengelolaan Denda** | Sistem & Asprak | Sistem menghitung keterlambatan dari `timestamp` presensi vs waktu mulai sesi dengan mekanisme **grace period** yang dapat dikonfigurasi (`<= batas toleransi` → `ON_TIME`; `> batas toleransi` → `LATE`). Setiap kejadian keterlambatan menghasilkan **tepat satu tagihan denda nominal tetap** yang terhubung ke praktikan, sesi, dan catatan presensi. Pembayaran denda **tidak mengubah status kehadiran**. Praktikan dengan izin disetujui Asprak dicatat sebagai **`EXCUSED_ABSENCE`** (tidak hadir dengan izin, bukan hadir) dan **dibebaskan dari denda**. | **Bayu** |
| **SRS-S4-05** | **Integrasi Payment Gateway Midtrans (Sandbox)** | Praktikan & Sistem | Menampilkan daftar tagihan dan rincian nominal denda praktikan; membuat transaksi pembayaran melalui **backend server** (secret key hanya di backend); mengarahkan praktikan ke halaman/metode pembayaran Midtrans Sandbox; menangani respons & **verifikasi callback/webhook** di backend; menampilkan status pembayaran (`pending`, `success`, `failed`); memperbarui status tagihan hanya berdasarkan hasil verifikasi backend; menyediakan riwayat transaksi praktikan. | **Ferdy** |
| **SRS-S4-06** | **Notifikasi & Riwayat Pembayaran Persisten** | Praktikan & Sistem | Terintegrasi dengan sistem notifikasi Sprint 3 agar praktikan menerima pemberitahuan saat: (1) tagihan denda baru dibuat, (2) pembayaran berhasil, dan (3) pembayaran gagal/butuh penyelesaian lanjutan. Menyediakan halaman **Riwayat Pembayaran** yang menampilkan informasi sesi, tanggal tagihan, nominal, waktu transaksi, dan status pembayaran secara persisten (tetap ada setelah aplikasi ditutup dan dibuka kembali). | **Ferdy** |

---

## 4. Kebutuhan Non-Fungsional

1. **Usability & Finalisasi Antarmuka:**
   - Tampilan modern, konsisten, dan mudah digunakan oleh seluruh peran (`ASLAB`, `ASSISTANT`, `STUDENT`, `ADMIN`) menggunakan primitif `src/components/ui/*` dan token `src/constants/theme.ts` (tanpa hardcoded hex).
   - Pesan status keterlambatan, rincian denda, status pembayaran, dan pratinjau bulk insert tampil jelas dalam Bahasa Indonesia.
2. **Payment Security (Client–Server–Webhook):**
   - `MIDTRANS_SERVER_KEY` dan kredensial sensitif backend **wajib** disimpan hanya di server/backend environment, dilarang keras tersimpan di bundle React Native.
   - Pembaruan status tagihan (`UNPAID` → `PAID` / `FAILED`) hanya sah setelah verifikasi *signature key* webhook Midtrans di backend.
3. **Data Integrity & Idempotency:**
   - Pembuatan tagihan denda menggunakan ID deterministik (`fine_${sessionId}_${studentId}`) sehingga satu kejadian keterlambatan mustahil menghasilkan tagihan ganda.
   - Pembayaran denda dan persetujuan izin tidak melanggar aturan status kehadiran.
4. **Performance & Real-Time Consistency:**
   - Seluruh data lab, jadwal, sesi, presensi, denda, dan riwayat pembayaran tersimpan di Cloud Firestore dan di-cleanup dengan benar (`unsubscribe()`).
5. **Maintainability:**
   - Mematuhi arsitektur *Pragmatic Feature-Based* (`docs/ARCHITECTURE.md`) dan aturan impor `eslint.config.js`.

---

## 5. Arsitektur Informasi & Susunan Navigasi (Sprint 1–4)

> Detail lengkap, aturan import, kontrak data, dan kepemilikan file: [ARCHITECTURE.md](ARCHITECTURE.md).

```text
Praktikum_PPK_06/
├── backend/                          (📋 BARU S4 Ferdy: Server Payment Gateway Midtrans + Webhook Handler)
└── src/
    ├── app/                          (RUTE saja, tanpa logika bisnis)
    │   ├── _layout.tsx               (Root Stack + Provider + Notification Listener)
    │   ├── index.tsx                 (Login / Registrasi Firebase + Auto-Redirect RBAC termasuk ASLAB)
    │   ├── admin/(tabs)/             (Dashboard Admin, Kelas, Approvals)
    │   ├── aslab/                    (📋 BARU S4 Zaidan: Role Aslab)
    │   │   ├── (tabs)/_layout.tsx    (Tab Aslab: Dashboard | Kelola Lab | Bulk Insert | Pindah Anggota)
    │   │   ├── (tabs)/index.tsx      (Dashboard Keberlangsungan Lab + Filter Hari/Minggu/Bulan + Keuangan Denda)
    │   │   ├── (tabs)/labs.tsx       (CRUD Lab: Lokasi, Koordinat, Radius Presensi, Batas Keterlambatan & Denda)
    │   │   ├── (tabs)/bulk.tsx       (3 Opsi Bulk Insert Terpisah + Template Download + Staging ScrollView)
    │   │   └── (tabs)/transfer.tsx   (Perpindahan Praktikan antar Lab & Perpindahan Aslab/Asprak)
    │   ├── assistant/                (Fokus Asprak — diperjelas wewenang oleh Bayu S4)
    │   │   ├── (tabs)/_layout.tsx    (Tab Asprak: Jadwal | Rekap | Izin | Peta Lab)
    │   │   ├── (tabs)/index.tsx      (Kelas, Jadwal, & Sesi Tanggung Jawab Asprak)
    │   │   ├── (tabs)/recap.tsx      (Rekap Real-Time: Tepat Waktu / Terlambat / Izin + Status Denda)
    │   │   ├── (tabs)/permits.tsx    (Review Izin → EXCUSED_ABSENCE & Bebas Denda)
    │   │   ├── (tabs)/maps.tsx       (Peta Lab Interaktif)
    │   │   └── session/[id].tsx      (Detail Sesi + Buka/Tutup Real-Time + Kelola Presensi Praktikan)
    │   └── student/
    │       ├── (tabs)/_layout.tsx    (Tab Praktikan: Jadwal | Riwayat | Izin | Peta Lab | Denda/Bayar)
    │       ├── (tabs)/index.tsx      (Jadwal Praktikum Aktif)
    │       ├── (tabs)/history.tsx    (Riwayat Kehadiran + Indikator Tepat Waktu / Terlambat / Izin)
    │       ├── (tabs)/permit.tsx     (Form & Status Izin)
    │       ├── (tabs)/maps.tsx       (Peta Lab Interaktif)
    │       ├── (tabs)/fines.tsx      (📋 BARU S4 Ferdy: Daftar Tagihan Denda & Riwayat Pembayaran Persisten)
    │       ├── attendance/[id].tsx   (Detail Sesi Praktikan)
    │       ├── check-in/[id].tsx     (Halaman Khusus Presensi + Geofencing + Evaluasi Keterlambatan)
    │       └── payment/[fineId].tsx  (📋 BARU S4 Ferdy: Checkout Midtrans Sandbox & Status Pembayaran)
    ├── features/
    │   ├── role/components/          (RoleSelectorModal)
    │   ├── sessions/components/      (SessionCard, StatusBadge, SessionControlModal, CreateSessionModal)
    │   ├── attendance/components/    (AttendanceForm, AttendanceSuccessCard, AttendanceTable, HistoryItemCard,
    │   │                              LocationStatusBanner, LabLocationConfigModal)
    │   ├── permits/components/       (PermitForm, PermitStatusCard, PermitReviewCard)
    │   ├── maps/components/          (InteractiveLabMap, LabActivitySheet, PermissionAlertCard)
    │   ├── labs/components/          (📋 BARU S4 Zaidan: LabDashboardCards, LabFilterBar, LabConfigForm,
    │   │                              BulkInsertStagingList, MemberTransferPanel)
    │   └── fines/components/         (📋 BARU S4 Bayu/Ferdy: LatenessBadge, FineSummaryCard,
    │                                  PaymentStatusBadge, PaymentHistoryCard)
    ├── services/                     (firebase, auth, admin, sessions, attendance, permits, ai, labs,
    │                                  permissions, notifications,
    │                                  📋 S4 Bayu: fines.ts | 📋 S4 Ferdy: payments.ts)
    ├── types/                        (attendance.ts, permit.ts, lab.ts, notification.ts,
    │                                  📋 S4 Bersama: fine.ts)
    └── utils/                        (formatTime.ts, geo.ts,
                                       📋 S4 Zaidan: bulkTemplate.ts | 📋 S4 Bayu: lateness.ts)
```

---

## 6. Kriteria Keberhasilan (Target Demo Sprint 4 🚀)

1. **Alur 1 — Manajemen Lab & Dashboard Aslab (Zaidan):**
   - Login sebagai `ASLAB` → Unduh template bulk insert (Lab / Praktikan / Asprak terpisah) → Import file → Baris data tampil di `ScrollView` interaktif (bisa accept, deny, edit, isi field kosong) → Simpan ke Firestore.
   - Aslab mengatur lokasi, koordinat, radius presensi, dan batas keterlambatan (*grace period*) + nominal denda, serta memindahkan praktikan/aslab antar lab.
   - Dashboard Aslab menampilkan statistik real-time (jumlah lab & praktikan, status lab, jadwal berlangsung/mendatang, riwayat kegiatan, riwayat keuangan denda) dan merespons filter **Hari / Minggu / Bulan**.
2. **Alur 2 — Pengelolaan Sesi Asprak, Keterlambatan, & Denda (Bayu):**
   - Login sebagai `ASSISTANT` (Asprak) → Melihat hanya kelas/sesi tanggung jawabnya (tanpa akses manajemen lab/distribusi praktikan) → Membuka & menutup sesi secara real-time.
   - Praktikan presensi sebelum/tepat akhir *grace period* tercatat `ON_TIME` (tanpa denda); presensi melewati *grace period* tercatat `LATE` dan menghasilkan **tepat 1 tagihan denda nominal tetap**.
   - Praktikan dengan izin yang disetujui Asprak tercatat `EXCUSED_ABSENCE` (tidak diubah menjadi hadir) dan bebas dari denda.
3. **Alur 3 — Pembayaran Midtrans Sandbox, Webhook, & Notifikasi (Ferdy):**
   - Praktikan menerima notifikasi tagihan baru → Membuka daftar tagihan → Membayar via Midtrans Sandbox yang dibuat oleh backend server (tanpa secret key di RN).
   - Backend memverifikasi callback/webhook Midtrans → Status pembayaran (`pending`/`success`/`failed`) dan status tagihan terbarui otomatis → Status kehadiran praktikan tetap tidak berubah (`LATE`).
   - Praktikan menerima notifikasi hasil pembayaran dan dapat melihat riwayat pembayaran secara persisten meskipun aplikasi ditutup dan dibuka kembali.
4. **Finalisasi UI & Integrasi Penuh (Bahir — PM/QA):**
   - Seluruh layar untuk 4 peran konsisten dengan `docs/DESIGN.md`, `firestore.rules` memproteksi koleksi baru (`fines`, `payments`) & hak akses `ASLAB` vs `ASSISTANT`, serta `npx tsc --noEmit` dan `npx expo lint` lolos tanpa error.
