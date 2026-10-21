# Petunjuk Pengerjaan & Pembagian Tugas Sprint 1
 
Proyek ini dikembangkan secara kolaboratif oleh 3 programmer dengan pembagian modul dan tanggung jawab mandiri yang seimbang (*evenly split*).
 
## Anggota Tim
1. **Muhammad Zaidan Alfarizi** (24060124130102) — *Core Architecture, Global State Management & Asisten Workflow*
2. **Crystiano Bayu Satya Alves** (24060124140130) — *UI Design System, Navigation Shell & Praktikan Session Explorer*
3. **Bahir Ananda Wibowo** (24060124140184) — *Praktikan Workflow, Presensi Logic, Anti-Double Validation & History Record*
 
---
 
## Ringkasan Pembagian Modul & Tanggung Jawab
 
| Programmer | Fokus Modul | Fitur / Komponen Utama | SRS Terkait | Dokumen Panduan |
|---|---|---|---|---|
| **Zaidan** | Core Architecture & Workflow Asisten | Types, Dummy Data, `AttendanceContext`, Role Switcher Modal, Jadwal & Detail Sesi Asisten, Kontrol Sesi (Buka/Tutup), Rekapitulasi Kehadiran Peserta | FR-01, FR-02, FR-03, FR-04, FR-08 | [TUGAS_ZAIDAN.md](file:///c:/Users/TaiBalap/Documents/GitHub/Praktikum_PPK_06/docs/TUGAS_ZAIDAN.md) |
| **Bayu** | UI Design System & Session Explorer | Design Tokens, Base Components (`CustomButton`, `Card`, `EmptyState`, `FeedbackModal`), Shell Tab Navigasi Praktikan, Daftar Sesi Praktikan & `SessionCard` | FR-02, FR-07, FR-10 | [TUGAS_BAYU.md](file:///c:/Users/TaiBalap/Documents/GitHub/Praktikum_PPK_06/docs/TUGAS_BAYU.md) |
| **Bahir** | Presensi Logic & Histori Praktikan | Form Presensi Praktikan (`AttendanceForm`), Validasi Anti-Double Attendance, Feedback Berhasil Presensi (`AttendanceSuccessCard`), Halaman Riwayat Presensi & `HistoryItemCard` | FR-05, FR-06, FR-07, FR-09 | [TUGAS_BAHIR.md](file:///c:/Users/TaiBalap/Documents/GitHub/Praktikum_PPK_06/docs/TUGAS_BAHIR.md) |
 
---
 
## Instruksi Pengerjaan (Default Instructions)
 
Setiap programmer (beserta AI coding assistant masing-masing) merujuk langsung ke dokumen tugas individu berikut:
 
- 📘 **Panduan Lengkap Zaidan:** [docs/TUGAS_ZAIDAN.md](file:///c:/Users/TaiBalap/Documents/GitHub/Praktikum_PPK_06/docs/TUGAS_ZAIDAN.md)  
  *(Mencakup PRD, User Stories, Spesifikasi Teknis, Branching Strategy, Panduan PR, dan Checklist Eksekusi untuk Core State, Role System & Asisten Workflow)*
 
- 📗 **Panduan Lengkap Bayu:** [docs/TUGAS_BAYU.md](file:///c:/Users/TaiBalap/Documents/GitHub/Praktikum_PPK_06/docs/TUGAS_BAYU.md)  
  *(Mencakup PRD, User Stories, Spesifikasi Teknis, Branching Strategy, Panduan PR, dan Checklist Eksekusi untuk UI Design System, Navigation Shell & Praktikan Session Explorer)*
 
- 📙 **Panduan Lengkap Bahir:** [docs/TUGAS_BAHIR.md](file:///c:/Users/TaiBalap/Documents/GitHub/Praktikum_PPK_06/docs/TUGAS_BAHIR.md)  
  *(Mencakup PRD, User Stories, Spesifikasi Teknis, Branching Strategy, Panduan PR, dan Checklist Eksekusi untuk Form Presensi, Validasi Anti-Double Attendance & Riwayat Kehadiran)*
 
- 📄 **Spesifikasi Kebutuhan Sistem:** [docs/SRS.md](file:///c:/Users/TaiBalap/Documents/GitHub/Praktikum_PPK_06/docs/SRS.md)
 
---
 
## Aturan Kolaborasi & Branching Umum
1. Base branch utama integrasi adalah `dev`. Jangan langsung push atau commit ke `main`.
2. Format penamaan branch: `feat/<nama-programmer>/<nama-fitur>`.
3. Sebelum membuat PR, pastikan kode lolos typecheck dengan perintah:
   ```bash
   npx tsc --noEmit
   ```
4. Setelah seluruh PR dari Zaidan, Bayu, dan Bahir selesai dan teruji pada branch `dev`, lakukan demo integrasi end-to-end sebelum merge ke `main`.
