# Petunjuk Pengerjaan & Pembagian Tugas

Proyek ini dikembangkan secara kolaboratif oleh 3 programmer + 1 anggota baru (Sprint 2) dengan pembagian modul yang seimbang.

## Anggota Tim & Peran
1. **Muhammad Zaidan Alfarizi** (24060124130102) — **Project Manager (PM)**, *System Architect & QA Lead*
2. **Crystiano Bayu Satya Alves** (24060124140130) — *Software Engineer: Autentikasi Firebase, RBAC, & Manajemen Data Utama*
3. **Bahir Ananda Wibowo** (24060124140184) — *Software Engineer: Sistem Presensi, Sinkronisasi Real-Time, & Keamanan*
4. **Ferdy Prasetya Putra** (24060124140145) — *Software Engineer: Integrasi AI, Sistem Izin, & State Management Edge Cases*

---

## Sprint 1 — SELESAI ✅

> Kode Sprint 1 sudah selesai dan **tidak perlu diubah**. AI cukup membaca bagian Sprint 2 miliknya saja di dokumen tugas masing-masing.

| Programmer | Modul Sprint 1 | SRS |
|---|---|---|
| **Zaidan** | Core Architecture, Store (in-memory), Role Switcher, Workflow Asisten | FR-01–04, FR-08 |
| **Bayu** | UI Design System, Navigation Shell, SessionCard, Daftar Sesi Praktikan | FR-02, FR-07, FR-10 |
| **Bahir** | Form Presensi, Anti-Double Validation, Riwayat Presensi | FR-05, FR-06, FR-07, FR-09 |

---

## Sprint 2 — Pembagian Tugas Baru 🚀

| Programmer | Fokus Modul | SRS Terkait | Dokumen Panduan |
|---|---|---|---|
| **Bayu** | Autentikasi Firebase, RBAC & Routing Login, CRUD Firestore (Kelas, Peserta, Jadwal) | SRS-AUTH-01, SRS-AUTH-02, SRS-CRUD-01, SRS-CRUD-02 | [TUGAS_BAYU.md](TUGAS_BAYU.md) |
| **Bahir** | Presensi + Anti-Bocor ke Firestore, Rekap Real-Time (`onSnapshot`), Firebase Security Rules | SRS-PRES-01, SRS-PRES-02, SRS-SYNC-01, SRS-SEC-01 | [TUGAS_BAHIR.md](TUGAS_BAHIR.md) |
| **Ferdy** | Form Izin Ketidakhadiran, Klasifikasi AI, Review Izin Asisten, Penanganan Edge Cases UI | SRS-IZIN-01, SRS-AI-01, SRS-IZIN-02, SRS-UI-01 | [TUGAS_FERDY.md](TUGAS_FERDY.md) |

> **Zaidan** pada Sprint 2 berperan sebagai reviewer arsitektur dan membantu integrasi `services/` ke dalam `store/`. Tidak ada file baru Sprint 2 yang dikerjakan Zaidan secara mandiri.

---

## Dokumen Referensi

- 📘 **Panduan Zaidan Sprint 1:** [docs/TUGAS_ZAIDAN.md](TUGAS_ZAIDAN.md) *(sudah selesai, hanya referensi)*
- 📗 **Panduan Bayu Sprint 2:** [docs/TUGAS_BAYU.md](TUGAS_BAYU.md)
- 📙 **Panduan Bahir Sprint 2:** [docs/TUGAS_BAHIR.md](TUGAS_BAHIR.md)
- 📒 **Panduan Ferdy Sprint 2:** [docs/TUGAS_FERDY.md](TUGAS_FERDY.md)
- 📄 **SRS Lengkap:** [docs/SRS.md](SRS.md)
- 🏗️ **Arsitektur & Aturan Kode:** [docs/ARCHITECTURE.md](ARCHITECTURE.md)

---

## Aturan Kolaborasi & Branching

1. Base branch integrasi adalah `dev`. Jangan langsung push ke `main`.
2. Format branch: `feat/<nama>/<fitur>`.
3. **Jangan sentuh kode Sprint 1** yang sudah berjalan. Sprint 2 menambahkan file baru di `services/`, bukan mengedit `store/` atau komponen UI lama.
4. Sebelum membuat PR, pastikan lolos typecheck dan lint:
   ```bash
   npx tsc --noEmit
   npx expo lint
   ```
5. Setelah seluruh PR Sprint 2 terintegrasi di `dev`, demo end-to-end sebelum merge ke `main`.
