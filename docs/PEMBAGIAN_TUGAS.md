# Petunjuk Pengerjaan & Pembagian Tugas

Proyek ini dikembangkan secara kolaboratif oleh 4 anggota tim dengan pembagian modul yang seimbang pada setiap sprint.

## Anggota Tim & Peran (Sprint 3 Aktif)
1. **Muhammad Zaidan Alfarizi** (`24060124130102`) — **Software Engineer 1 (Sprint 3)**: *Halaman Khusus Presensi, Validasi Lokasi & Geofencing Radius, serta Pengelolaan Lokasi Laboratorium (Firestore)*
2. **Ferdy Prasetya Putra** (`24060124140145`) — **Software Engineer 2 (Sprint 3)**: *Peta Laboratorium Interaktif (Maps), Informasi Aktivitas Lab Real-Time, Push Notification Terarah, & Penanganan Izin/Kondisi Perangkat*
3. **Crystiano Bayu Satya Alves** (`24060124140130`) — *Project Manager (PM), Maintainer Auth/CRUD & UI Design System*
4. **Bahir Ananda Wibowo** (`24060124150184`) — *QA Lead, Maintainer Presensi Real-Time & Firestore Security Rules*

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

## Sprint 3 — Pembagian Tugas Baru 🚀 (Khusus Zaidan & Ferdy)

Pada Sprint 3, pengembangan fitur baru (Geolocation, Maps Laboratorium Interaktif, dan Push Notification) dikerjakan penuh secara seimbang oleh **Muhammad Zaidan Alfarizi** dan **Ferdy Prasetya Putra**, tanpa tumpang tindih file (*zero merge conflict*).

| Programmer | Fokus Modul Sprint 3 | SRS Terkait | Objektif Demo | Dokumen Panduan |
|---|---|---|---|---|
| **Zaidan** | Halaman Khusus Presensi (terpisah dari Detail Sesi + opsional QR), Validasi Lokasi & Geofencing Radius (Haversine), Pengelolaan Koordinat & Radius Laboratorium di Firestore | `SRS-S3-01`, `SRS-S3-02`, `SRS-S3-03` | **Alur Demo 1** (Presensi Berbasis Lokasi) | [TUGAS_ZAIDAN.md](TUGAS_ZAIDAN.md) |
| **Ferdy** | Peta Laboratorium Interaktif (Marker Lab + Live User Tracking), Informasi Aktivitas Lab Real-Time di Peta, Push Notification Terarah, Penanganan Izin Akses & Kondisi Perangkat | `SRS-S3-04`, `SRS-S3-05`, `SRS-S3-06`, `SRS-S3-07` | **Alur Demo 2** (Peta & Info Lab) & **Alur Demo 3** (Notifikasi Kegiatan) | [TUGAS_FERDY.md](TUGAS_FERDY.md) |

> 📌 **Peran Bayu & Bahir pada Sprint 3:** Bertindak sebagai *Project Manager (PM) / Maintainer* dan *QA Lead* untuk mengawal integrasi akhir dengan modul Sprint 1–2, pembaruan `firestore.rules` (koleksi `labs` & `notifications`), serta pengujian end-to-end 3 alur demo.

---

## Sumber Referensi Teknis Resmi Sprint 3 (Dari Asisten Praktikum)

Seluruh implementasi Maps/Geolocation dan Push Notification mengacu pada dua artikel referensi berikut (diadaptasi ke **Expo SDK 58 / Continuous Native Generation** via `app.json` tanpa membuat folder `android/` & `ios/` manual):

1. **Push Notification (Rich Notifications, FCM, Permissions, Channels & Deep Linking):**  
   https://medium.com/@silverskytechnology/rich-push-notifications-in-react-native-a-complete-guide-797dd9747366
2. **Google Maps & Real-Time Location Tracking (`react-native-maps`, Marker & Watch Position):**  
   https://medium.com/@silverskytechnology/implementing-google-maps-and-routes-tracking-in-react-native-a-starter-guide-9768282594b8

---

## Dokumen Referensi

- 📘 **Panduan Zaidan Sprint 3 (AKTIF):** [docs/TUGAS_ZAIDAN.md](TUGAS_ZAIDAN.md)
- 📒 **Panduan Ferdy Sprint 3 (AKTIF):** [docs/TUGAS_FERDY.md](TUGAS_FERDY.md)
- 📗 **Panduan Bayu Sprint 2:** [docs/TUGAS_BAYU.md](TUGAS_BAYU.md) *(selesai, referensi)*
- 📙 **Panduan Bahir Sprint 2:** [docs/TUGAS_BAHIR.md](TUGAS_BAHIR.md) *(selesai, referensi)*
- 📄 **SRS Lengkap (Sprint 1–3):** [docs/SRS.md](SRS.md)
- 🏗️ **Arsitektur & Aturan Kode:** [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- 🎨 **Design System & Token UI:** [docs/DESIGN.md](DESIGN.md)
- 🧪 **Daftar Akun Testing:** [docs/DAFTAR_AKUN_TESTING.md](DAFTAR_AKUN_TESTING.md)

---

## Aturan Kolaborasi & Branching (Sprint 3)

1. Base branch integrasi adalah `dev` (atau sesuai koordinasi PM). Jangan langsung push ke `main` sebelum lolos review.
2. Format branch Sprint 3:
   - Zaidan: `feat/zaidan/location-checkin-labs`
   - Ferdy: `feat/ferdy/maps-push-notifications`
3. **Wajib gunakan `npx expo install <package>`** untuk memasang paket Expo/React Native (`expo-location`, `react-native-maps`, `expo-notifications`).
4. **Jangan merusak komponen UI Sprint 1** (`src/components/ui/*`, `src/constants/theme.ts`) dan tetap gunakan token warna `Colors.*` (tanpa hardcoded hex).
5. Jika menambahkan folder feature baru (mis. `src/features/maps`), daftarkan `'maps'` di `eslint.config.js`.
6. Sebelum membuat PR, pastikan lolos typecheck dan lint:
   ```bash
   npx tsc --noEmit
   npx expo lint
   ```
7. Setelah PR Zaidan dan Ferdy terintegrasi, lakukan demo end-to-end 3 alur utama Sprint 3 sebelum merge ke `main`.
