# Petunjuk Pengerjaan & Pembagian Tugas

Proyek ini dikembangkan secara kolaboratif oleh 4 anggota tim dengan pembagian modul yang seimbang pada setiap sprint.

## Anggota Tim & Peran (Sprint 4 — Pertemuan 9 Aktif)
1. **Muhammad Zaidan Alfarizi** (`24060124130102`) — **Software Engineer 1 (Sprint 4)**: *Manajemen Laboratorium oleh Aslab (Role Baru, 3 Bulk/Single Insert Terpisah, Template Download, Staging ScrollView, Perpindahan Anggota, Konfigurasi Lokasi/Radius/Keterlambatan) & Dashboard Keberlangsungan Laboratorium* (`SRS-S4-01`, `SRS-S4-02`)
2. **Crystiano Bayu Satya Alves** (`24060124140130`) — **Software Engineer 2 (Sprint 4)**: *Pengelolaan Sesi Real-Time oleh Asprak (Pembatasan Wewenang RBAC), Perhitungan Keterlambatan (Grace Period), & Pengelolaan Denda / Excused Absence* (`SRS-S4-03`, `SRS-S4-04`)
3. **Ferdy Prasetya Putra** (`24060124140145`) — **Software Engineer 3 (Sprint 4)**: *Integrasi Payment Gateway Midtrans Sandbox (Client–Server–Webhook), Notifikasi Tagihan/Pembayaran, & Riwayat Pembayaran Persisten* (`SRS-S4-05`, `SRS-S4-06`)
4. **Bahir Ananda Wibowo** (`24060124150184`) — **Project Manager (PM), QA Lead, & Integrator (Sprint 4)**: *Koordinasi Arsitektur & Kontrak Data, Finalisasi Konsistensi UI/UX, Pembaruan Firestore Security Rules, & Verifikasi End-to-End Sprint 4*

---

## Sprint 1 — SELESAI ✅

> Kode Sprint 1 sudah selesai dan **tidak perlu diubah**.

| Programmer | Modul Sprint 1 | SRS |
|---|---|---|
| **Zaidan** | Core Architecture, Store (in-memory), Role Switcher, Workflow Asisten | FR-01–04, FR-08 |
| **Bayu** | UI Design System, Navigation Shell, SessionCard, Daftar Sesi Praktikan | FR-02, FR-07, FR-10 |
| **Bahir** | Form Presensi, Anti-Double Validation, Riwayat Presensi | FR-05, FR-06, FR-07, FR-09 |

---

## Sprint 2 — SELESAI ✅

> Seluruh modul Sprint 2 (Firebase Auth, RBAC, Admin Governance, Firestore CRUD, Presensi Real-Time `onSnapshot`, Security Rules, & Pengajuan Izin AI) telah selesai dan terintegrasi di `main`.

| Programmer | Modul Sprint 2 | SRS |
|---|---|---|
| **Bayu** | Autentikasi Firebase, RBAC & Routing Login/Logout, CRUD Firestore (Kelas, Peserta, Jadwal) | SRS-AUTH-01, SRS-AUTH-02, SRS-CRUD-01, SRS-CRUD-02 |
| **Bahir** | Presensi + Anti-Bocor ke Firestore, Rekap Real-Time (`onSnapshot`), Firebase Security Rules | SRS-PRES-01, SRS-PRES-02, SRS-SYNC-01, SRS-SEC-01 |
| **Ferdy** | Form Izin Ketidakhadiran, Klasifikasi AI (sesuai panduan repo), Review Izin Asisten, Edge Cases UI | SRS-IZIN-01, SRS-AI-01, SRS-IZIN-02, SRS-UI-01 |
| **Zaidan** | Project Manager (PM), System Architect, QA Lead, & Integrasi Role Admin / Firestore Sync | PM & QA |

---

## Sprint 3 — SELESAI ✅

> Seluruh modul Sprint 3 (Halaman Khusus Presensi, Geofencing Radius Laboratorium, Peta Interaktif + Live Tracking, Push Notification Terarah, & Penanganan Izin Perangkat) telah selesai dan terintegrasi di `main`.

| Programmer | Modul Sprint 3 | SRS |
|---|---|---|
| **Zaidan** | Halaman Khusus Presensi (`/student/check-in/[id]`), Validasi Lokasi & Geofencing Radius (Haversine), Pengelolaan Koordinat & Radius Lab di Firestore | `SRS-S3-01`, `SRS-S3-02`, `SRS-S3-03` |
| **Ferdy** | Peta Laboratorium Interaktif (Marker Lab + Live User Tracking), Aktivitas Lab Real-Time di Peta, Push Notification Terarah, Penanganan Izin & Kondisi Perangkat | `SRS-S3-04`, `SRS-S3-05`, `SRS-S3-06`, `SRS-S3-07` |
| **Bayu & Bahir** | Project Manager (PM) / Maintainer & QA Lead, Integrasi Firestore Rules & E2E Demo | PM & QA |

---

## Sprint 4 — Pembagian Tugas Aktif 🚀 (Pertemuan 9)

Pada Sprint 4 (Pertemuan 9), aplikasi disempurnakan dengan **role baru Aslab**, **manajemen laboratorium (single & bulk insert terpisah)**, **dashboard keberlangsungan laboratorium**, **pemisahan wewenang Asprak**, **perhitungan keterlambatan berbasis grace period & denda tetap**, **integrasi Payment Gateway Midtrans Sandbox (alur client–server–webhook)**, **notifikasi & riwayat pembayaran**, serta **finalisasi antarmuka**.

Pembagian modul dirancang tanpa tumpang tindih file (*zero merge conflict*):

| Programmer | Fokus Modul Sprint 4 | SRS Terkait | Dokumen Panduan |
|---|---|---|---|
| **Muhammad Zaidan Alfarizi** | **Role Baru Aslab (`ASLAB`) & Manajemen Lab:** Single/bulk insert terpisah (Lab per mata kuliah, Praktikan ke lab, Asprak ke lab), downloadable template, staging list `ScrollView` (accept/deny/edit/isi kosong), perpindahan praktikan & aslab/asprak (tanpa pindah jadwal), set cakupan lokasi/radius & batas keterlambatan, serta **Dashboard Keberlangsungan Lab** (jumlah lab/praktikan, status kegiatan, lokasi/waktu, jadwal berlangsung & mendatang, riwayat kegiatan, riwayat keuangan denda, filter hari/minggu/bulan). | `SRS-S4-01`, `SRS-S4-02` | [TUGAS_ZAIDAN.md](TUGAS_ZAIDAN.md) |
| **Crystiano Bayu Satya Alves** | **Pengelolaan Sesi Asprak & Sistem Keterlambatan/Denda:** Fokus wewenang Asprak (daftar kelas/jadwal/sesi tanggung jawab, buka/tutup sesi real-time, pantau & kelola presensi; tanpa akses distribusi praktikan/konfigurasi seluruh lab), **Perhitungan Keterlambatan (Grace Period)**, pembuatan **1 tagihan denda nominal tetap** per kejadian terlambat, pembayaran denda tidak mengubah status hadir, serta **Excused Absence** (izin disetujui bebas denda & tetap tercatat tidak hadir dengan izin). | `SRS-S4-03`, `SRS-S4-04` | [TUGAS_BAYU.md](TUGAS_BAYU.md) |
| **Ferdy Prasetya Putra** | **Midtrans Payment Gateway (Sandbox) & Notifikasi/Riwayat Pembayaran:** Daftar tagihan & rincian denda praktikan, pembuatan transaksi melalui **backend server** (secret key aman di backend), redirect ke halaman/metode pembayaran Midtrans Snap Sandbox, verifikasi **callback/webhook** backend (status `pending`, `success`, `failed`), pembaruan status tagihan otomatis, integrasi notifikasi (tagihan baru, bayar berhasil, bayar gagal), dan **halaman riwayat pembayaran persisten** (Firestore). | `SRS-S4-05`, `SRS-S4-06` | [TUGAS_FERDY.md](TUGAS_FERDY.md) |
| **Bahir Ananda Wibowo** | **Project Manager (PM) & QA Lead:** Mengawal kontrak data lintas modul (`src/types/fine.ts`, `src/types/lab.ts`, `src/types/attendance.ts`), sinkronisasi `firestore.rules`, review PR, finalisasi konsistensi UI/UX, serta pengujian end-to-end Sprint 4. | PM, QA & Integrasi | [TUGAS_BAHIR.md](TUGAS_BAHIR.md) |

---

## Dokumen Referensi

- 📘 **Panduan Zaidan Sprint 4 (AKTIF):** [docs/TUGAS_ZAIDAN.md](TUGAS_ZAIDAN.md)
- 📗 **Panduan Bayu Sprint 4 (AKTIF):** [docs/TUGAS_BAYU.md](TUGAS_BAYU.md)
- 📒 **Panduan Ferdy Sprint 4 (AKTIF):** [docs/TUGAS_FERDY.md](TUGAS_FERDY.md)
- 📙 **Panduan Bahir Sprint 4 — PM & QA (AKTIF):** [docs/TUGAS_BAHIR.md](TUGAS_BAHIR.md)
- 📄 **SRS Lengkap (Sprint 1–4):** [docs/SRS.md](SRS.md)
- 🏗️ **Arsitektur & Aturan Kode:** [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- 🎨 **Design System & Token UI:** [docs/DESIGN.md](DESIGN.md)
- 🧪 **Daftar Akun Testing:** [docs/DAFTAR_AKUN_TESTING.md](DAFTAR_AKUN_TESTING.md)

---

## Aturan Kolaborasi & Branching (Sprint 4)

1. Base branch integrasi adalah `dev` (atau sesuai koordinasi PM). Jangan langsung push ke `main` sebelum lolos review PM & QA.
2. Format branch Sprint 4:
   - Zaidan: `feat/zaidan/aslab-lab-management-dashboard`
   - Bayu: `feat/bayu/asprak-session-lateness-fines`
   - Ferdy: `feat/ferdy/midtrans-payment-notifications`
   - Bahir (PM/QA/Docs/Rules): `chore/bahir/sprint4-docs-rules-qa`
3. **Urutan Integrasi Kontrak Data:**
   - Sepakati kontrak tipe data bersama (`src/types/lab.ts`, `src/types/attendance.ts`, `src/types/fine.ts`, `src/types/notification.ts`) di awal sprint agar ketiga branch dapat dikembangkan paralel tanpa konflik.
4. **Wajib gunakan `npx expo install <package>`** bila menambah paket Expo/React Native (misal `expo-document-picker`, `expo-file-system`, `expo-sharing`, `react-native-webview`).
5. **Keamanan Payment Gateway:** **DILARANG KERAS** menaruh `MIDTRANS_SERVER_KEY` di dalam kode React Native (`src/`) atau file `.env` berawalan `EXPO_PUBLIC_`. Seluruh pembuatan transaksi Snap dan verifikasi webhook wajib berjalan di backend.
6. **Konsistensi UI & ESLint:**
   - Tetap gunakan primitif `src/components/ui/*` dan token `Colors.*` di `src/constants/theme.ts` (tanpa hardcoded hex).
   - Jika menambahkan folder feature baru (`src/features/labs`, `src/features/fines`), daftarkan namanya di `eslint.config.js`.
7. Sebelum membuat PR, wajib lolos typecheck dan lint:
   ```bash
   npx tsc --noEmit
   npx expo lint
   ```
