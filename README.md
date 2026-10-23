# Praktikum PPK 06: Aplikasi Presensi Praktikum

Aplikasi mobile untuk mencatat kehadiran praktikum dengan dua peran:
- **Asisten** membuka dan menutup sesi, lalu melihat rekap kehadiran.
- **Praktikan** melihat jadwal, melakukan presensi saat sesi dibuka, dan melihat riwayat kehadirannya.

Sprint 1 memakai data dummy dan state lokal (belum ada database).

**Stack:** Expo SDK 57 · Expo Router · React Native · TypeScript

## Menjalankan

```bash
npm install
npx expo start      # scan QR dengan Expo Go, atau tekan "w" untuk web
```

Sebelum membuat PR:

```bash
npx tsc --noEmit    # typecheck
npx expo lint       # lint + aturan import arsitektur
```

## Struktur

```
src/
├── app/          # rute (Expo Router): assistant/, student/
├── features/     # komponen per domain: role, sessions, attendance
├── store/        # state global, aturan bisnis, hooks
├── components/ui # komponen UI reusable
├── types/  data/  constants/  utils/
```

Detail struktur, aturan kode, dan kepemilikan file ada di **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Dokumentasi

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): struktur & aturan arsitektur
- [docs/SRS.md](docs/SRS.md): spesifikasi kebutuhan
- [docs/PEMBAGIAN_TUGAS.md](docs/PEMBAGIAN_TUGAS.md): pembagian tugas Sprint 1
- [docs/TUGAS_ZAIDAN.md](docs/TUGAS_ZAIDAN.md) · [docs/TUGAS_BAYU.md](docs/TUGAS_BAYU.md) · [docs/TUGAS_BAHIR.md](docs/TUGAS_BAHIR.md)

## Alur Git

Base branch adalah `dev`; jangan push langsung ke `main`. Nama branch: `feat/<nama>/<fitur>`.
