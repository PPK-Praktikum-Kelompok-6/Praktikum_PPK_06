# Panduan Tugas — Ferdy Prasetya Putra (24060124140145)
## Modul: Integrasi AI, Sistem Pengajuan Izin, dan State Management Edge Cases (Sprint 2)

> **PETUNJUK KHUSUS AI ASSISTANT / PENGEMBANG:**  
> ⚠️ **FOKUS HANYA PADA MODUL BARU SPRINT 2:**  
> Anda bertanggung jawab penuh atas fitur **Sistem Izin Ketidakhadiran**, **Integrasi Model AI**, dan **Penanganan Edge Cases / Error Handling UI**.  
> Seluruh kode Sprint 1 di `store/` dan `components/ui/` sudah selesai dan berfungsi. Cukup gunakan komponen yang sudah ada (`CustomButton`, `Card`, `Badge`, `FeedbackModal`, `EmptyState`) tanpa mengubah file aslinya.

---

## 1. Product Requirements Document (PRD) — Sprint 2 Ferdy

### 1.1 Objektif
Menyediakan fitur bagi praktikan yang berhalangan hadir untuk mengajukan permohonan izin praktikum disertai alasan. Sistem secara otomatis menganalisis dan mengklasifikasikan alasan izin tersebut menggunakan API model AI sebagai bahan pertimbangan (bukan keputusan otomatis). Asisten kemudian dapat meninjau daftar izin beserta hasil analisis AI dan memberikan keputusan final (Terima/Tolak) secara manual, didukung penanganan kegagalan (*edge cases*) yang ramah pengguna.

### 1.2 User Stories & Pemetaan SRS
- **SRS-IZIN-01 :** Sebagai Praktikan, saya dapat mengajukan form izin ketidakhadiran beserta alasannya untuk sesi tertentu dan melihat status pengajuannya (`PENDING`, `APPROVED`, `REJECTED`).
- **SRS-AI-01 :** Sebagai sistem, saya dapat mengirimkan alasan izin praktikan ke eksternal API model AI dan menyimpan hasil klasifikasi alasan tersebut sebagai informasi pendukung (bukan penentu otomatis).
- **SRS-IZIN-02 :** Sebagai Asisten, saya dapat melihat daftar pengajuan izin beserta hasil klasifikasi AI-nya, lalu memberikan keputusan terima atau tolak secara manual.
- **SRS-UI-01 :** Sebagai sistem, saya menangani kondisi kegagalan (input tidak valid, data kosong, belum login, atau layanan AI tidak merespons) dan memberikan feedback UI yang sesuai (graceful degradation).

---

## 2. File yang Dikerjakan Ferdy (Sprint 2)

```
src/
├── types/
│   └── permit.ts                           <-- Model data izin dan hasil klasifikasi AI
├── services/
│   └── permits.ts                          <-- Service Firestore untuk izin & integrasi API AI
├── features/
│   └── permits/components/
│       ├── PermitForm.tsx                  <-- Form pengajuan izin praktikan
│       ├── PermitStatusCard.tsx            <-- Tampilan status izin praktikan
│       └── PermitReviewCard.tsx            <-- Kartu review asisten (termasuk badge AI & tombol aksi)
└── app/
    ├── student/(tabs)/
    │   └── permit.tsx                      <-- Halaman tab pengajuan & status izin praktikan
    └── assistant/(tabs)/
        └── permits.tsx                     <-- Halaman tab daftar izin masuk untuk asisten
```

---

## 3. Spesifikasi Teknis & Kontrak Data

### 3.1 Kontrak Data (`src/types/permit.ts`)
```typescript
export type PermitStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AICategory = 
  | 'SAKIT' 
  | 'KEDUKAAN_URGEN' 
  | 'TUGAS_AKADEMIK' 
  | 'KEPERLUAN_PRIBADI' 
  | 'LAINNYA';

export interface AIClassificationResult {
  category: AICategory;
  confidence: number;       // Skala 0.0 - 1.0
  urgencyLevel: 'TINGGI' | 'SEDANG' | 'RENDAH';
  summary: string;          // Ringkasan singkat alasan oleh AI
  rawResponse?: string;
}

export interface PermitRequest {
  id: string;
  sessionId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  reason: string;
  submittedAt: string;      // ISO String
  status: PermitStatus;
  aiClassification?: AIClassificationResult; // Diisi oleh sistem AI
  decisionNote?: string;    // Catatan manual asisten
  reviewedBy?: string;      // Nama / ID asisten
  reviewedAt?: string;
}
```

### 3.2 Service Izin & Integrasi AI (`src/services/permits.ts`)
```typescript
import { PermitRequest, AIClassificationResult } from '@/types/permit';

/**
 * 1. Mengajukan Izin Baru (SRS-IZIN-01 & SRS-AI-01)
 * Alur: Simpan status PENDING -> Panggil API AI secara async -> Simpan hasil AI ke Firestore.
 * Jika AI gagal / timeout, simpan izin dengan aiClassification: undefined (jangan batalkan submit).
 */
export async function submitPermit(
  permitData: Omit<PermitRequest, 'id' | 'submittedAt' | 'status'>
): Promise<{ success: boolean; permitId: string; message: string }>;

/**
 * 2. Klasifikasi Alasan Izin via AI API (SRS-AI-01)
 * Panggil API Gemini / external LLM endpoint.
 */
export async function classifyReasonWithAI(reason: string): Promise<AIClassificationResult>;

/**
 * 3. Ambil Izin untuk Praktikan Tertentu (SRS-IZIN-01)
 */
export async function getStudentPermits(studentId: string): Promise<PermitRequest[]>;

/**
 * 4. Ambil Seluruh Izin Masuk untuk Asisten (SRS-IZIN-02)
 */
export async function getIncomingPermits(): Promise<PermitRequest[]>;

/**
 * 5. Keputusan Asisten (SRS-IZIN-02)
 */
export async function reviewPermit(
  permitId: string,
  decision: 'APPROVED' | 'REJECTED',
  assistantName: string,
  decisionNote?: string
): Promise<void>;
```

### 3.3 Penanganan Edge Cases & UI Feedback (SRS-UI-01)
Wajib menangani skenario berikut menggunakan komponen bawaan:
1. **Input Kosong / Terlalu Pendek:** Tampilkan peringatan pada form jika alasan izin kurang dari 10 karakter.
2. **Layanan AI Tidak Merespons / Offline:** Izin tetap tersimpan di database dengan indikator badge *"Analisis AI Tidak Tersedia"*, asisten tetap dapat mengambil keputusan manual.
3. **Data Izin Kosong:** Tampilkan komponen `<EmptyState />` dengan pesan yang ramah (*"Belum ada permohonan izin"*).
4. **Notifikasi Aksi:** Tampilkan `<FeedbackModal />` setelah pengajuan izin berhasil atau setelah asisten membuat keputusan.

---

## 4. Alur Kerja & Checklist Implementasi

- [ ] **Langkah 1**: Buat branch `feat/ferdy/permit-ai-handling` dari `dev`.
- [ ] **Langkah 2**: Buat model data di `src/types/permit.ts`.
- [ ] **Langkah 3**: Buat fungsi service di `src/services/permits.ts` (termasuk helper pemicu AI).
- [ ] **Langkah 4**: Buat komponen `PermitForm.tsx` dan `PermitStatusCard.tsx` di `src/features/permits/components/`.
- [ ] **Langkah 5**: Buat halaman `src/app/student/(tabs)/permit.tsx` dan daftarkan tab di `src/app/student/(tabs)/_layout.tsx`.
- [ ] **Langkah 6**: Buat komponen `PermitReviewCard.tsx` (tampilkan kartu izin, chip hasil AI, dan tombol konfirmasi Terima/Tolak).
- [ ] **Langkah 7**: Buat halaman `src/app/assistant/(tabs)/permits.tsx` dan daftarkan tab di `src/app/assistant/(tabs)/_layout.tsx`.
- [ ] **Langkah 8**: Uji penanganan error (layanan AI offline, input kosong).
- [ ] **Langkah 9**: Jalankan `npx tsc --noEmit` & `npx expo lint`.
- [ ] **Langkah 10**: Ajukan Pull Request ke `dev`.

