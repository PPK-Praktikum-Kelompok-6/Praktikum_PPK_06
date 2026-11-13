# Panduan Peran & Tugas — Muhammad Zaidan Alfarizi (24060124130102)
## Peran Sprint 2: Project Manager (PM), System Architect & QA Lead
## Status Sprint 1: Core Architecture & Asisten Workflow (100% Selesai & Lolos Verifikasi) ✅

> **CATATAN TANGGUNG JAWAB UTAMA:**  
> Pada Sprint 2, **Muhammad Zaidan Alfarizi bertindak sebagai Project Manager (PM)** yang mengoordinasikan pembagian modul, menyusun spesifikasi kebutuhan sistem (SRS), menetapkan arsitektur teknis, dan mengawasi jalannya integrasi tim (Bayu, Bahir, dan Ferdy).  
> Kode implementasi Sprint 1 Zaidan sudah **stabil dan terkunci (*freeze*)**.

---

## 1. Tanggung Jawab Zaidan sebagai Project Manager (PM) — Sprint 2

Sebagai PM dalam tim proyek praktikum ini, Zaidan memegang kendali atas 5 pilar manajemen proyek:

1. **Sprint Planning & Backlog Management:**
   - Memecah kebutuhan sistem (SRS) menjadi 3 modul utama yang terdistribusi merata ke 3 developer (Bayu, Bahir, Ferdy).
   - Menetapkan kontrak antarmuka TypeScript dan dokumentasi teknis mandiri agar developer tidak mengalami *blocking* atau konflik merge.
2. **Architectural Guarding & Tech Standards:**
   - Menjaga integritas *Pragmatic Feature-Based Architecture (Bulletproof React)* dan aturan rute *Expo Router*.
   - Memastikan tidak ada *circular dependency* atau impor antar-fitur yang melanggar standar arsitektur proyek.
3. **Branching Strategy & Pull Request (PR) Quality Gate:**
   - Mengelola cabang integrasi `dev` dan mengawasi kepatuhan format branch (`feat/<nama>/<fitur>`).
   - Bertindak sebagai reviewer utama (*Code Reviewer*) sebelum branch fitur di-merge ke `dev` dan `main`.
4. **Monitoring & Risk Management:**
   - Memastikan integrasi Firebase dan layanan eksternal AI tidak merusak antarmuka dan alur presensi yang sudah berfungsi dari Sprint 1.
   - Menetapkan strategi penanganan kegagalan (*graceful degradation*) jika kuota atau koneksi API eksternal bermasalah.
5. **Sprint Review & Demo Deliverable:**
   - Mengoordinasikan pengujian akhir end-to-end (integrasi Auth + Presensi Real-Time + Pengajuan Izin AI).
   - Memimpin demo produk dan menyusun skrip presentasi evaluasi praktikum.

---

## 2. Matriks Pendelegasian Tugas oleh PM (Sprint 2)

| Developer | Modul yang Didelegasikan oleh PM | Target Deliverable | Dokumen Panduan |
|---|---|---|---|
| **Crystiano Bayu Satya Alves** | Fondasi Autentikasi Firebase, RBAC & Firestore CRUD | `firebase.ts`, `auth.ts`, `sessions.ts`, Form Login & Routing Otomatis | [docs/TUGAS_BAYU.md](TUGAS_BAYU.md) |
| **Bahir Ananda Wibowo** | Presensi Firestore Anti-Bocor & Real-Time Sync | `services/attendance.ts`, listener `onSnapshot`, `firestore.rules` | [docs/TUGAS_BAHIR.md](TUGAS_BAHIR.md) |
| **Ferdy Prasetya Putra** | Sistem Izin Ketidakhadiran, Integrasi AI & Edge Cases | `types/permit.ts`, `services/permits.ts`, tab izin, error handling UI | [docs/TUGAS_FERDY.md](TUGAS_FERDY.md) |

---

## 3. Checklist Eksekusi Project Manager (PM Checklist)

- [x] **Inisiasi Sprint 2**: Menyusun dokumen pembagian tugas dan penyesuaian SRS berdasarkan konsultasi kebutuhan praktikum.
- [x] **Arsitektur & Kontrak Data**: Menetapkan struktur folder baru (`src/services/` dan `src/features/permits/`) serta kontrak tipe data TypeScript.
- [ ] **Sprint Kick-Off**: Membagikan panduan tugas mandiri kepada Bayu, Bahir, dan Ferdy.
- [ ] **Code Review & QA**:
  - [ ] Review PR Bayu (`feat/bayu/auth-firestore-crud`).
  - [ ] Review PR Bahir (`feat/bahir/attendance-realtime-rules`).
  - [ ] Review PR Ferdy (`feat/ferdy/permit-ai-handling`).
- [ ] **Uji Integrasi End-to-End**: Verifikasi seluruh alur (Registrasi/Login $\rightarrow$ Buka Sesi $\rightarrow$ Presensi Real-time $\rightarrow$ Pengajuan Izin AI $\rightarrow$ Review Asisten).
- [ ] **Final Merge**: Penggabungan cabang `dev` ke `main` untuk rilis akhir praktikum.

---

## 4. Rekam Jejak Kode Sprint 1 (Completed Technical Base)

*Seluruh modul fondasi di bawah ini telah diselesaikan oleh Zaidan pada Sprint 1 dan bertindak sebagai base sistem aplikasi:*

| Komponen / Modul | File Implementasi | Status |
|---|---|---|
| Model Data Global | `src/types/attendance.ts` | ✅ Selesai |
| Dataset Awal Praktikum | `src/data/mockData.ts` | ✅ Selesai |
| In-Memory App Store | `src/store/AppProvider.tsx`, `reducer.ts`, `rules.ts`, `hooks.ts` | ✅ Selesai |
| Modal Ganti Peran | `src/features/role/components/RoleSelectorModal.tsx` | ✅ Selesai |
| Jadwal & Manajemen Asisten | `src/app/assistant/(tabs)/index.tsx`, `recap.tsx` | ✅ Selesai |
| Detail & Kontrol Buka/Tutup | `src/app/assistant/session/[id].tsx`, `SessionControlModal.tsx` | ✅ Selesai |
| Form Tambah Sesi Manual | `src/features/sessions/components/CreateSessionModal.tsx` | ✅ Selesai |
