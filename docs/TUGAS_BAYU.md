# Panduan Tugas — Crystiano Bayu Satya Alves (24060124140130)
## Modul Sprint 4 (Pertemuan 9): Pengelolaan Sesi oleh Asprak, Perhitungan Keterlambatan (Grace Period), & Pengelolaan Denda

> **PETUNJUK KHUSUS AI ASSISTANT / PENGEMBANG (SPRINT 4):**  
> ⚠️ **Sprint 1, 2, & 3 SELESAI:** Jangan membongkar ulang fondasi UI Design System (`src/components/ui/*`, `src/constants/theme.ts`), modul Manajemen Lab & Dashboard Aslab milik Zaidan (`src/app/aslab/**`, `src/features/labs/*`), maupun modul Payment Gateway Midtrans & Riwayat Pembayaran milik Ferdy (`backend/**`, `src/services/payments.ts`, `src/app/student/(tabs)/fines.tsx`).  
> Fokus Anda di Sprint 4 adalah **Pengelolaan Sesi Real-Time oleh Asprak (pemisahan wewenang RBAC vs Aslab)**, **Perhitungan Keterlambatan berbasis Grace Period**, serta **Pengelolaan Denda Nominal Tetap & Excused Absence** (`SRS-S4-03` & `SRS-S4-04`).

---

## 1. Product Requirements Document (PRD) — Sprint 4 Bayu

### 1.1 Objektif Utama
1. **Memfokuskan peran Asprak (`ASSISTANT`):** Memastikan Asprak hanya melihat dan mengelola pelaksanaan praktikum (kelas, jadwal, buka/tutup sesi *real-time*, pemantauan & pengelolaan presensi praktikan) di kelas/lab tanggung jawabnya — tanpa wewenang mengelola distribusi praktikan antar lab maupun konfigurasi seluruh laboratorium (yang kini menjadi wewenang `ASLAB`).
2. **Membangun logika keterlambatan & denda yang presisi:** Menghitung keterlambatan presensi dengan mekanisme *grace period* terkonfigurasi, menghasilkan tepat satu tagihan denda nominal tetap per kejadian terlambat, menjaga agar pembayaran denda tidak mengubah status kehadiran, serta memastikan izin yang disetujui Asprak tercatat sebagai **`EXCUSED_ABSENCE`** dan dibebaskan dari denda.

### 1.2 User Stories & Pemetaan SRS Sprint 4
- **`SRS-S4-03` (Pengelolaan Sesi oleh Asprak):**  
  Sebagai Asprak, saya ingin melihat jadwal/kelas tanggung jawab saya, membuka/menutup sesi praktikum secara real-time, serta memantau dan mengelola presensi praktikan agar pelaksanaan praktikum berjalan tertib (tanpa akses distribusi praktikan maupun konfigurasi seluruh laboratorium).
- **`SRS-S4-04` (Perhitungan Keterlambatan & Pengelolaan Denda):**  
  Sebagai Sistem/Asprak, saya ingin menghitung keterlambatan presensi berdasarkan *grace period*, menghasilkan satu tagihan denda nominal tetap secara otomatis bagi yang terlambat, serta membebaskan denda bagi praktikan yang disetujui izinnya (*excused absence*) tanpa mengubah status kehadiran.

---

## 2. Aturan Bisnis Wajib (Tidak Boleh Dilanggar)

1. **Evaluasi Grace Period (`src/utils/lateness.ts`):**
   - Ambil waktu mulai sesi (`sessionStartTime` — dari jadwal/waktu buka sesi) dan `gracePeriodMinutes` (dari konfigurasi sesi/lab yang diatur Aslab, dengan fallback default kebijakan praktikum).
   - Hitung batas akhir toleransi: `deadline = sessionStartTime + gracePeriodMinutes * 60_000`.
   - Jika `checkInTime <= deadline` → status **`ON_TIME`** (`lateMinutes = 0`), **tidak ada denda**.
   - Jika `checkInTime > deadline` → status **`LATE`** (`lateMinutes = Math.ceil((checkInTime - deadline) / 60_000)`), **wajib membuat tagihan denda**.
2. **Aturan Tagihan Denda (`src/services/fines.ts`):**
   - Nominal denda bersifat **tetap** (`fineAmount` dari konfigurasi lab/sesi, misal Rp 10.000 per kejadian).
   - **Idempotent / Maksimal 1 Tagihan per Kejadian:** Gunakan ID dokumen deterministik `fine_${sessionId}_${studentId}` dengan transaksi/pengecekan keberadaan dokumen agar satu kejadian keterlambatan **tidak pernah** menghasilkan lebih dari satu tagihan.
   - Setiap tagihan wajib menyimpan relasi lengkap: `studentId`, `studentName`, `studentNim`, `sessionId`, `sessionName`, `classCode`, dan `attendanceId`.
   - Setelah tagihan dibuat, panggil helper notifikasi milik Ferdy (`notifyFineCreated`) agar praktikan mendapat pemberitahuan tagihan baru.
   - **Pembayaran denda tidak mengubah status kehadiran:** Di layar rekap Asprak maupun riwayat Praktikan, status kehadiran praktikan yang sudah membayar denda tetap tampil sebagai **Terlambat (`LATE`)** (bukan berubah menjadi `ON_TIME`).
3. **Aturan Izin Disetujui (*Excused Absence*):**
   - Saat Asprak menyetujui pengajuan izin (`APPROVED`) pada `src/services/permits.ts`:
     - Catat/tandai status kehadiran praktikan pada sesi tersebut sebagai **`EXCUSED_ABSENCE`** (*Tidak Hadir dengan Izin*) — **TIDAK BOLEH** mengubah status menjadi hadir (`ON_TIME`/`LATE`).
     - **Bebaskan dari denda keterlambatan:** Jangan buat tagihan denda, dan jika sebelumnya sempat ada tagihan denda belum dibayar untuk sesi tersebut, ubah status denda menjadi `WAIVED`.
4. **Pembatasan Wewenang Asprak (`ASSISTANT`):**
   - Di antarmuka Asprak (`src/app/assistant/**`), sembunyikan/hapus akses konfigurasi global seluruh laboratorium dan perpindahan distribusi praktikan antar lab (kewenangan tersebut dipindahkan ke `ASLAB`).
   - Filter daftar kelas, jadwal, dan sesi secara ketat hanya untuk kelas/lab yang menjadi tanggung jawab Asprak yang sedang login, dengan sinkronisasi status sesi (`NOT_STARTED` → `OPEN` → `CLOSED`) *real-time* (`onSnapshot`) ke aplikasi praktikan.

---

## 3. File yang Dikerjakan Bayu (Sprint 4)

> Aturan struktur & batas impor: [docs/ARCHITECTURE.md](ARCHITECTURE.md) §2, §3, dan §9.

```text
src/
├── types/
│   └── attendance.ts                               <-- [UPDATE] Tambah 'ASLAB' di UserRole; tambah AttendancePunctuality & field lateMinutes/fineId
├── utils/
│   └── lateness.ts                                 <-- [BARU] Pure function evaluateLateness(checkInIso, sessionStartIso, gracePeriodMinutes)
├── services/
│   ├── fines.ts                                    <-- [BARU] createLateFineIfNotExists(), waiveFineForExcusedAbsence(), query fines per sesi
│   ├── attendance.ts                               <-- [UPDATE] Evaluasi grace period saat submitAttendanceToFirestore() + panggil createLateFineIfNotExists()
│   └── permits.ts                                  <-- [UPDATE] Saat izin APPROVED → catat EXCUSED_ABSENCE (bukan hadir) + panggil waiveFineForExcusedAbsence()
├── features/
│   └── fines/components/
│       └── LatenessBadge.tsx                       <-- [BARU] Badge status: Tepat Waktu | Terlambat (+X mnt) | Izin (Bebas Denda)
└── app/
    ├── assistant/
    │   ├── (tabs)/index.tsx                        <-- [UPDATE] Fokus kelas/jadwal/sesi tanggung jawab Asprak (tanpa akses manajemen semua lab)
    │   ├── (tabs)/recap.tsx                        <-- [UPDATE] Tampilkan status Tepat Waktu / Terlambat / Izin + status denda per praktikan
    │   └── session/[id].tsx                        <-- [UPDATE] Buka/tutup sesi real-time, pantau & kelola presensi, sembunyikan config lab global
    └── student/
        └── check-in/[id].tsx                       <-- [UPDATE] Tampilkan informasi hasil evaluasi keterlambatan & info tagihan jika terlambat
```

---

## 4. Spesifikasi Teknis & Kontrak Data

### 4.1 Pure Helper Keterlambatan (`src/utils/lateness.ts`)
```typescript
import { AttendancePunctuality } from '@/types/attendance';

export interface LatenessEvaluation {
  status: Extract<AttendancePunctuality, 'ON_TIME' | 'LATE'>;
  isLate: boolean;
  lateMinutes: number;
  graceDeadlineIso: string;
}

/**
 * Pure business rule (tanpa React/Firestore):
 * - checkIn <= sessionStart + gracePeriodMinutes  => ON_TIME (isLate: false)
 * - checkIn >  sessionStart + gracePeriodMinutes  => LATE (isLate: true)
 */
export function evaluateLateness(
  checkInIso: string,
  sessionStartIso: string,
  gracePeriodMinutes: number
): LatenessEvaluation;
```

### 4.2 Service Denda (`src/services/fines.ts`)
Mengonsumsi kontrak `FineRecord` dari `src/types/fine.ts` (berkoordinasi dengan Ferdy):
```typescript
import { FineRecord } from '@/types/fine';

/**
 * Membuat tepat 1 tagihan denda dengan ID deterministik `fine_${sessionId}_${studentId}`.
 * Jika dokumen sudah ada, tidak membuat duplikat.
 */
export async function createLateFineIfNotExists(
  input: Omit<FineRecord, 'id' | 'status' | 'createdAt'>
): Promise<FineRecord>;

/**
 * Membebaskan denda (status: 'WAIVED') jika praktikan memperoleh persetujuan izin dari Asprak.
 */
export async function waiveFineForExcusedAbsence(
  sessionId: string,
  studentId: string
): Promise<void>;
```

---

## 5. Checklist Eksekusi Step-by-Step (Sprint 4)

- [ ] **Langkah 1**: Buat branch `feat/bayu/asprak-session-lateness-fines` dari `dev`.
- [ ] **Langkah 2**: Perbarui `src/types/attendance.ts` (tambah `'ASLAB'`, `AttendancePunctuality`, serta field `attendanceStatus`, `lateMinutes`, `fineId`).
- [ ] **Langkah 3**: Buat pure function `src/utils/lateness.ts` untuk evaluasi *grace period* (pastikan kasus batas tepat di akhir masa toleransi tetap `ON_TIME`).
- [ ] **Langkah 4**: Buat `src/services/fines.ts` dengan proteksi ID deterministik `fine_${sessionId}_${studentId}` (1 kejadian = 1 tagihan) dan fungsi pembebasan denda `WAIVED`.
- [ ] **Langkah 5**: Integrasikan evaluasi keterlambatan & pembuatan denda ke `src/services/attendance.ts` serta *excused absence* ke `src/services/permits.ts`.
- [ ] **Langkah 6**: Buat komponen `src/features/fines/components/LatenessBadge.tsx` menggunakan token `Colors.*` di `src/constants/theme.ts`.
- [ ] **Langkah 7**: Rapikan ruang kerja Asprak (`src/app/assistant/**`) agar fokus pada kelas/sesi tanggung jawabnya, real-time sync buka/tutup sesi, dan menghapus akses distribusi praktikan / konfigurasi seluruh lab.
- [ ] **Langkah 8**: Jalankan `npx tsc --noEmit` & `npx expo lint`, lalu ajukan Pull Request ke `dev`.
