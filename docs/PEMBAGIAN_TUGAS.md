# Petunjuk Pengerjaan & Pembagian Tugas Sprint 1

Proyek ini dikembangkan secara kolaboratif oleh 2 programmer dengan pembagian modul dan tanggung jawab mandiri.

## Anggota Tim
1. **Muhammad Zaidan Alfarizi** (24060124130102)
2. **Crystiano Bayu Satya Alves** (24060124140130)

---

## Instruksi Pengerjaan (Default Instructions)

Setiap programmer (beserta AI coding assistant masing-masing) merujuk langsung ke dokumen tugas individu berikut:

- 📘 **Panduan Lengkap Zaidan:** [docs/TUGAS_ZAIDAN.md](file:///c:/Users/TaiBalap/Documents/GitHub/Praktikum_PPK_06/docs/TUGAS_ZAIDAN.md)  
  *(Mencakup PRD, User Stories, Spesifikasi Teknis, Branching Strategy, Panduan PR, dan Checklist Eksekusi untuk Asisten Workflow & Core State)*

- 📗 **Panduan Lengkap Bayu:** [docs/TUGAS_BAYU.md](file:///c:/Users/TaiBalap/Documents/GitHub/Praktikum_PPK_06/docs/TUGAS_BAYU.md)  
  *(Mencakup PRD, User Stories, Spesifikasi Teknis, Branching Strategy, Panduan PR, dan Checklist Eksekusi untuk Praktikan Workflow & UI System)*

- 📄 **Spesifikasi Kebutuhan Sistem:** [docs/SRS.md](file:///c:/Users/TaiBalap/Documents/GitHub/Praktikum_PPK_06/docs/SRS.md)

---

## Aturan Kolaborasi & Branching Umum
1. Base branch utama integrasi adalah `dev`. Jangan langsung push atau commit ke `main`.
2. Format penamaan branch: `feat/<nama-programmer>/<nama-fitur>`.
3. Sebelum membuat PR, pastikan kode lolos typecheck dengan perintah:
   ```bash
   npx tsc --noEmit
   ```
4. Setelah seluruh PR dari Zaidan dan Bayu selesai dan teruji pada branch `dev`, lakukan demo integrasi end-to-end sebelum merge ke `main`.
