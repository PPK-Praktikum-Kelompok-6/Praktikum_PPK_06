# Praktikum PPK 06: Aplikasi Presensi Praktikum

Aplikasi mobile berbasis React Native (Expo) dan Firebase untuk manajemen praktikum, presensi berbasis lokasi, perizinan AI, serta pengelolaan denda & pembayaran digital dengan 4 peran pengguna:
- **Aslab (`ASLAB` — Sprint 4):** Mengelola data laboratorium (single/bulk insert terpisah + template & staging editor), distribusi & perpindahan anggota, konfigurasi radius & batas keterlambatan, serta memantau Dashboard Keberlangsungan Laboratorium.
- **Asprak (`ASSISTANT`):** Mengelola pelaksanaan sesi praktikum tanggung jawabnya (buka/tutup sesi real-time, pantau & kelola presensi, tinjau izin → *excused absence*).
- **Praktikan (`STUDENT`):** Melihat jadwal, melakukan check-in berbasis lokasi (geofencing), melihat peta lab interaktif, mengajukan izin, menerima notifikasi, membayar denda keterlambatan via Midtrans Sandbox, dan memantau riwayat presensi & pembayaran.
- **Admin (`ADMIN`):** Mengelola hak akses sistem dan persetujuan administratif.

**Status Pengembangan:** Sprint 1–3 ✅ Selesai · **Sprint 4 (Pertemuan 9) 🚀 Aktif**  
**Stack:** Expo SDK 58 · Expo Router · React Native · TypeScript · Firebase (Auth & Firestore) · Midtrans Sandbox (Backend Webhook)

## Menjalankan

```bash
npm install
npx expo start      # scan QR dengan Expo Go / Development Build, atau tekan "w" untuk web
```

Sebelum membuat PR:

```bash
npx tsc --noEmit    # typecheck
npx expo lint       # lint + aturan import arsitektur
```

## Struktur

```text
Praktikum_PPK_06/
├── backend/              # server payment gateway Midtrans Sandbox & webhook (Sprint 4)
├── docs/                 # dokumentasi SRS, arsitektur, design system, & pembagian tugas
└── src/
    ├── app/              # rute (Expo Router): admin/, aslab/, assistant/, student/
    ├── features/         # komponen per domain: role, sessions, attendance, permits, maps, labs, fines
    ├── services/         # Firebase Auth/Firestore, AI, geolocation/labs, notifications, fines, payments
    ├── store/            # state global, aturan bisnis, hooks
    ├── components/ui/    # komponen UI reusable
    └── types/  data/  constants/  utils/
```

Detail struktur, aturan kode, kontrak data, dan kepemilikan file ada di **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Dokumentasi

- [docs/PEMBAGIAN_TUGAS.md](docs/PEMBAGIAN_TUGAS.md): pembagian tugas & alur branching (Sprint 1–4)
- [docs/SRS.md](docs/SRS.md): spesifikasi kebutuhan perangkat lunak (Sprint 1–4)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): struktur, kontrak data, & aturan arsitektur
- [docs/DESIGN.md](docs/DESIGN.md): design system & token UI
- [docs/DAFTAR_AKUN_TESTING.md](docs/DAFTAR_AKUN_TESTING.md): kredensial akun & skenario pengujian
- Panduan per anggota (Sprint 4): [docs/TUGAS_ZAIDAN.md](docs/TUGAS_ZAIDAN.md) · [docs/TUGAS_BAYU.md](docs/TUGAS_BAYU.md) · [docs/TUGAS_FERDY.md](docs/TUGAS_FERDY.md) · [docs/TUGAS_BAHIR.md](docs/TUGAS_BAHIR.md)

## Alur Git

Base branch adalah `dev`; jangan push langsung ke `main`. Nama branch: `feat/<nama>/<fitur>` atau `chore/<nama>/<tugas>`.
