# Panduan Tugas — Bahir Ananda Wibowo (24060124150184)
## Peran Sprint 4 (Pertemuan 9): Project Manager (PM), QA Lead, Security Rules & Finalisasi Integrasi

> **STATUS SPRINT SEBELUMNYA:**  
> - ✅ **Sprint 1 SELESAI:** Form Presensi, Validasi Anti-Double Attendance, & Riwayat Presensi (`FR-05`, `FR-06`, `FR-07`, `FR-09`).  
> - ✅ **Sprint 2 SELESAI:** Presensi Atomik Firestore, Rekap Real-Time (`onSnapshot`), & Firebase Security Rules (`SRS-PRES-01`, `SRS-PRES-02`, `SRS-SYNC-01`, `SRS-SEC-01`).  
> - ✅ **Sprint 3 SELESAI:** QA Lead, Maintainer Presensi Real-Time, & Firestore Rules koleksi `labs` dan `notifications`.  
> - 🚀 **Sprint 4 AKTIF:** Project Manager (PM), QA Lead, Maintainer `firestore.rules` & `eslint.config.js`, serta Finalisasi Konsistensi UI/UX lintas seluruh peran.

---

## 1. Tanggung Jawab Utama Sprint 4 (PM & QA Lead)

### 1.1 Manajemen Proyek & Koordinasi Kontrak Data
1. **Menyusun & menjaga dokumentasi Sprint 4 (Pertemuan 9):**
   - `docs/PEMBAGIAN_TUGAS.md`, `docs/SRS.md`, `docs/ARCHITECTURE.md`, `docs/TUGAS_ZAIDAN.md`, `docs/TUGAS_BAYU.md`, `docs/TUGAS_FERDY.md`, `docs/DAFTAR_AKUN_TESTING.md`, dan `README.md`.
2. **Menjaga keselarasan kontrak data antar 3 programmer:**
   - **Zaidan ↔ Bayu:** `LabLocation.gracePeriodMinutes` & `LabLocation.fineAmount` (`src/types/lab.ts`) dipakai oleh `src/utils/lateness.ts` dan `src/services/fines.ts`.
   - **Bayu ↔ Ferdy:** `FineRecord` (`src/types/fine.ts`) dibuat oleh Bayu saat presensi terlambat, lalu dibaca & dibayar oleh Ferdy melalui Midtrans Sandbox backend; Bayu memanggil `notifyFineCreated` milik Ferdy.
   - **Ferdy ↔ Zaidan:** Koleksi `fines` & `payments` (status `PAID`/`success`) dibaca oleh Dashboard Keuangan Denda milik Zaidan (`SRS-S4-02`).

### 1.2 Pembaruan Keamanan & Aturan Proyek (Saat Fase Integrasi)
1. **Firebase Security Rules (`firestore.rules`):**
   - Tambahkan helper `isAslab()` (`role == 'ASLAB'`).
   - Batasi tulis koleksi `labs` (CRUD lab, distribusi praktikan/asprak, konfigurasi radius & denda) hanya untuk `ASLAB` / `ADMIN` — pastikan `ASSISTANT` (Asprak) **tidak bisa** mengubah konfigurasi seluruh lab atau distribusi praktikan.
   - Lindungi koleksi `fines` dan `payments`:
     - Praktikan hanya boleh **read** tagihan & riwayat pembayaran miliknya sendiri (`studentId == request.auth.uid`).
     - Pembaruan status pembayaran (`payments`) dan pelunasan tagihan (`fines.status = 'PAID'`) **dilarang** ditulis langsung dari client React Native (hanya boleh oleh Backend Admin SDK via webhook Midtrans yang terverifikasi).
2. **ESLint Architecture Guard (`eslint.config.js`):**
   - Pastikan folder feature baru Sprint 4 (`'labs'`, `'fines'`) terdaftar di array `features` agar aturan impor searah (`shared → features → app`) tetap terjaga.

### 1.3 QA End-to-End & Finalisasi Antarmuka
Memverifikasi seluruh kriteria penerimaan Sprint 4 sebelum merge ke `main`:
- [ ] **Audit Keamanan Payment:** Tidak ada `MIDTRANS_SERVER_KEY` di `src/` atau `.env` client (`EXPO_PUBLIC_*`); status pembayaran hanya berubah setelah callback/webhook backend.
- [ ] **Audit 3 Bulk Insert Terpisah (Zaidan):** Ketiga opsi bulk (Lab per MK, Praktikan ke Lab, Asprak ke Lab) terpisah, memiliki downloadable template, dan menampilkan `ScrollView` staging (accept/deny/edit/isi field kosong).
- [ ] **Audit Perpindahan & Dashboard Aslab (Zaidan):** Perpindahan hanya praktikan & aslab/asprak (tanpa perpindahan jadwal); dashboard memuat seluruh metrik + keuangan denda + filter Hari/Minggu/Bulan.
- [ ] **Audit RBAC Asprak (Bayu):** Asprak hanya melihat & mengelola kelas/sesi tanggung jawabnya (buka/tutup real-time, kelola presensi) tanpa akses distribusi/konfigurasi seluruh lab.
- [ ] **Audit Keterlambatan, Denda, & Excused Absence (Bayu):**
  - Presensi tepat pada akhir *grace period* → `ON_TIME`, tanpa denda.
  - Presensi melewati *grace period* → `LATE`, tepat 1 tagihan denda nominal tetap (tidak duplikat).
  - Setelah denda dibayar → status kehadiran tetap `LATE` (tidak berubah).
  - Izin disetujui Asprak → tercatat `EXCUSED_ABSENCE` (bukan hadir) & bebas denda (`WAIVED`).
- [ ] **Audit Notifikasi & Persistensi Riwayat Bayar (Ferdy):** Notifikasi muncul untuk tagihan baru, bayar sukses, dan bayar gagal; riwayat pembayaran tetap tampil setelah aplikasi ditutup dan dibuka kembali.
- [ ] **Audit Finalisasi UI & Build:** Seluruh layar konsisten dengan `docs/DESIGN.md` (tanpa hardcoded hex), `npx tsc --noEmit` & `npx expo lint` lolos 0 error.

---

## 2. Alur Review & Integrasi PR Sprint 4

1. **PR 1 — Zaidan (`feat/zaidan/aslab-lab-management-dashboard`):** Review kontrak `src/types/lab.ts`, fitur Aslab, & dashboard.
2. **PR 2 — Bayu (`feat/bayu/asprak-session-lateness-fines`):** Review `src/utils/lateness.ts`, `src/services/fines.ts`, pembatasan RBAC Asprak, & integrasi *excused absence*.
3. **PR 3 — Ferdy (`feat/ferdy/midtrans-payment-notifications`):** Review `backend/` Midtrans Sandbox + webhook signature verification, notifikasi, & riwayat pembayaran persisten.
4. **PR 4 — Bahir (`chore/bahir/sprint4-rules-qa`):** Pembaruan `firestore.rules`, `eslint.config.js`, pengecekan akhir UI/UX, dan merge integrasi `dev` → `main`.
