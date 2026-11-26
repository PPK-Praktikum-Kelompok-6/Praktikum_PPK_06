# Panduan Tugas — Muhammad Zaidan Alfarizi (24060124130102)
## Modul Sprint 4 (Pertemuan 9): Manajemen Laboratorium oleh Aslab (Role Baru) & Dashboard Keberlangsungan Laboratorium

> **PETUNJUK KHUSUS AI ASSISTANT / PENGEMBANG (SPRINT 4):**  
> ⚠️ **Sprint 1, 2, & 3 SELESAI:** Jangan membongkar ulang UI Design System (`src/components/ui/*`, `src/constants/theme.ts`), modul Peta & Push Notification milik Ferdy, maupun alur sesi Asprak & perhitungan denda milik Bayu.  
> Fokus Anda di Sprint 4 adalah **Role Baru Aslab (`ASLAB`)**, **Manajemen Laboratorium (termasuk 3 Bulk/Single Insert Terpisah + Template Download + Staging ScrollView + Perpindahan Anggota + Konfigurasi Lokasi/Radius/Keterlambatan)**, serta **Dashboard Keberlangsungan Laboratorium** (`SRS-S4-01` & `SRS-S4-02`).

---

## 1. Product Requirements Document (PRD) — Sprint 4 Zaidan

### 1.1 Objektif Utama
Membangun ruang kerja khusus peran **Asisten Laboratorium (`ASLAB`)** yang berwenang penuh mengelola data laboratorium, distribusi praktikan & asprak per mata kuliah (baik *single* maupun *bulk insert* terpisah dengan pratinjau interaktif), perpindahan anggota antar laboratorium, konfigurasi cakupan lokasi presensi serta batas keterlambatan waktu, dan **Dashboard Keberlangsungan Laboratorium** secara *real-time* berbasis Cloud Firestore.

### 1.2 User Stories & Pemetaan SRS Sprint 4
- **`SRS-S4-01` (Manajemen Laboratorium oleh Aslab — Role Baru):**  
  Sebagai Aslab, saya ingin mengelola data laboratorium (single/bulk insert lab, praktikan, dan asprak secara terpisah, template download, staging editor dalam `ScrollView`, perpindahan anggota, serta konfigurasi lokasi, radius presensi, dan batas keterlambatan) agar distribusi praktikum per mata kuliah terorganisir dengan rapi.
- **`SRS-S4-02` (Dashboard Keberlangsungan Laboratorium):**  
  Sebagai Aslab, saya ingin memantau dashboard keberlangsungan laboratorium secara real-time (jumlah lab/praktikan, status kegiatan, informasi lokasi & waktu, jadwal berlangsung & mendatang, riwayat kegiatan, dan riwayat keuangan denda dengan filter harian/mingguan/bulanan) agar seluruh aktivitas praktikum dapat diawasi secara terstruktur.

---

## 2. Rincian Kebutuhan Fungsional Wajib

### 2.1 Manajemen Laboratorium (`SRS-S4-01`)
1. **CRUD Data Laboratorium:** Menambah, mengubah, dan mengelola nama lab, mata kuliah terkait, lokasi/gedung, koordinat (`latitude`, `longitude`), **cakupan lokasi / radius validasi presensi** (`radiusMeters`), serta **batasan keterlambatan waktu** (`gracePeriodMinutes` & nominal denda tetap `fineAmount`).
2. **3 Opsi Bulk / Single Insert TERPISAH** *(WAJIB dipisah menjadi 3 menu/tab tersendiri, BUKAN satu bulk gabungan)*:
   - **Opsi A — Insert Laboratorium (per 1 Mata Kuliah):** Membuat satu atau sejumlah laboratorium sekaligus berdasarkan satu mata kuliah yang dipilih.
   - **Opsi B — Insert Praktikan ke Laboratorium Tertentu:** Menambahkan satu atau banyak praktikan ke laboratorium target.
   - **Opsi C — Insert Asprak ke Laboratorium Tertentu:** Menambahkan satu atau banyak asprak ke laboratorium target.
3. **Downloadable File Template:** Setiap opsi bulk insert menyediakan tombol **Unduh Template** (format `.csv`) berisi header kolom yang valid agar Aslab mudah mengisi data massal.
4. **Interactive Bulk Staging (`ScrollView`):**
   - Setelah file diunggah/diparsing, **tiap baris (row) data berubah menjadi item kartu di dalam `ScrollView`** (bukan langsung masuk database).
   - Aslab dapat mengatur tiap baris secara fleksibel: **Accept / Deny** per baris, **edit/update** nilai field, serta **mengisi data yang masih kosong** (dengan indikator validasi visual untuk field wajib yang kosong) sebelum menekan tombol *Simpan Data yang Disetujui* ke Firestore.
5. **Perpindahan Anggota (Tanpa Perpindahan Jadwal):**
   - Memindahkan **praktikan** dari satu laboratorium ke laboratorium lainnya.
   - Memindahkan **aslab / asprak** antar laboratorium.
   - **Tidak perlu** membuat fitur perpindahan jadwal praktikum.

### 2.2 Dashboard Keberlangsungan Laboratorium (`SRS-S4-02`)
Memanfaatkan data jadwal, sesi, lab, dan denda yang tersimpan di **Cloud Firestore**, menampilkan minimal:
- **Jumlah laboratorium dan jumlah praktikan** yang dikelola.
- **Status kegiatan praktikum pada setiap laboratorium** (`OPEN` / berlangsung, `NOT_STARTED` / menunggu, `CLOSED` / selesai).
- **Informasi lokasi dan waktu pelaksanaan** tiap kegiatan.
- **Jadwal praktikum yang sedang berlangsung maupun yang akan datang.**
- **Riwayat kegiatan laboratorium** yang telah selesai.
- **Riwayat keuangan hasil dari denda praktikum** (membaca koleksi `fines` / `payments` dengan status `PAID` / `success`).
- **Filter Periode Waktu:** `Hari` | `Minggu` | `Bulan` yang memfilter jadwal, riwayat kegiatan, dan ringkasan keuangan denda secara konsisten.

---

## 3. File yang Dikerjakan Zaidan (Sprint 4)

> Aturan struktur & batas impor: [docs/ARCHITECTURE.md](ARCHITECTURE.md) §2, §3, dan §9.  
> ⚠️ **Koordinasi ESLint:** Pastikan `'labs'` terdaftar pada array `features` di `eslint.config.js` bersama PM (Bahir).

```text
src/
├── types/
│   └── lab.ts                                      <-- [UPDATE] Tambah courseName, gracePeriodMinutes, fineAmount, assignedStudentIds, assignedAssistantIds
├── utils/
│   └── bulkTemplate.ts                             <-- [BARU] Generator CSV template + parser 3 jenis bulk insert + validasi baris kosong
├── services/
│   └── labs.ts                                     <-- [UPDATE] Single/bulk insert terpisah, transfer praktikan/aslab, & agregasi dashboard
├── features/
│   └── labs/components/                            <-- [BARU] Komponen domain Aslab
│       ├── LabDashboardStats.tsx                   <-- Ringkasan jumlah lab/praktikan, status lab, & riwayat keuangan denda
│       ├── LabPeriodFilter.tsx                     <-- Segmented filter: Hari | Minggu | Bulan
│       ├── LabConfigModal.tsx                      <-- Form lokasi, koordinat, cakupan radius presensi, grace period & nominal denda
│       ├── BulkInsertStagingList.tsx               <-- List ScrollView per row: Accept/Deny, inline Edit, indikator & pengisian field kosong
│       └── MemberTransferCard.tsx                  <-- Panel pindah praktikan antar lab & pindah aslab/asprak
└── app/
    ├── index.tsx                                   <-- [UPDATE] Auto-redirect role 'ASLAB' ke '/aslab'
    └── aslab/                                      <-- [BARU] Rute khusus role ASLAB
        └── (tabs)/
            ├── _layout.tsx                         <-- Guard role ASLAB + FloatingTabBar (Dashboard | Lab | Bulk | Pindah)
            ├── index.tsx                           <-- Dashboard Keberlangsungan Laboratorium (SRS-S4-02)
            ├── labs.tsx                            <-- Daftar & Pengelolaan Lab + Konfigurasi Radius/Keterlambatan
            ├── bulk.tsx                            <-- 3 Tab Bulk/Single Insert Terpisah + Download Template + Staging ScrollView
            └── transfer.tsx                        <-- Perpindahan Praktikan & Aslab/Asprak antar Lab
```

---

## 4. Spesifikasi Teknis & Kontrak Data

### 4.1 Ekstensi `LabLocation` (`src/types/lab.ts`)
```typescript
export interface LabLocation {
  id: string;
  name: string;
  building: string;
  courseName?: string;              // Mata kuliah yang dikelola di lab ini
  latitude: number;
  longitude: number;
  radiusMeters: number;             // Cakupan lokasi presensi (meter)
  gracePeriodMinutes: number;       // Batasan keterlambatan waktu (menit), dikonsumsi Bayu
  fineAmount: number;               // Nominal denda tetap per keterlambatan (IDR), dikonsumsi Bayu & Ferdy
  assignedStudentIds?: string[];    // Daftar praktikan di lab ini
  assignedAssistantIds?: string[];  // Daftar asprak di lab ini
  aslabId?: string;                 // UID Aslab penanggung jawab
  updatedBy?: string;
  updatedAt?: string;
}
```

### 4.2 Struktur Baris Staging Bulk Insert (`src/utils/bulkTemplate.ts`)
```typescript
export type BulkInsertKind = 'LABS' | 'STUDENTS' | 'ASSISTANTS';
export type BulkRowDecision = 'PENDING' | 'ACCEPTED' | 'DENIED';

export interface BulkStagingRow<T extends Record<string, string>> {
  rowId: string;
  data: T;
  decision: BulkRowDecision;
  missingFields: string[];
}
```
- **Template 1 (`LABS`):** `name,building,latitude,longitude,radiusMeters,gracePeriodMinutes,fineAmount` (dikaitkan dengan 1 mata kuliah yang dipilih di UI).
- **Template 2 (`STUDENTS`):** `studentName,studentNim,email` (dimasukkan ke 1 laboratorium target).
- **Template 3 (`ASSISTANTS`):** `assistantName,assistantCode,email` (dimasukkan ke 1 laboratorium target).

### 4.3 Paket Expo yang Direkomendasikan (CNG)
Pasang hanya via `npx expo install`:
```bash
npx expo install expo-document-picker expo-file-system expo-sharing
```
Sediakan fallback yang aman untuk platform web (`Platform.OS === 'web'`) saat mengunduh/membaca file CSV.

---

## 5. Checklist Eksekusi Step-by-Step (Sprint 4)

- [ ] **Langkah 1**: Buat branch `feat/zaidan/aslab-lab-management-dashboard` dari `dev`.
- [ ] **Langkah 2**: Perbarui `src/types/lab.ts` sesuai kontrak bersama (koordinasi dengan Bayu & Ferdy terkait `gracePeriodMinutes` & `fineAmount`).
- [ ] **Langkah 3**: Buat `src/utils/bulkTemplate.ts` untuk 3 template CSV terpisah, parser baris, dan deteksi field kosong.
- [ ] **Langkah 4**: Perluas `src/services/labs.ts` untuk single/bulk insert terpisah, transfer praktikan & aslab/asprak antar lab, dan query dashboard berdasarkan periode (`day` | `week` | `month`).
- [ ] **Langkah 5**: Bangun komponen di `src/features/labs/components/` menggunakan primitif `src/components/ui/*` dan token `Colors.*` (`src/constants/theme.ts`).
- [ ] **Langkah 6**: Implementasikan seluruh rute di `src/app/aslab/(tabs)/` dan tambahkan redirect `ASLAB` di `src/app/index.tsx`.
- [ ] **Langkah 7**: Verifikasi bahwa ketiga bulk insert terpisah, download template berfungsi, `ScrollView` staging mendukung accept/deny/edit/isi field kosong, dan filter dashboard Hari/Minggu/Bulan berjalan akurat.
- [ ] **Langkah 8**: Jalankan `npx tsc --noEmit` & `npx expo lint`, lalu ajukan Pull Request ke `dev`.
