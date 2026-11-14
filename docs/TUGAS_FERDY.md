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
- **SRS-AI-01 :** Sebagai sistem, saya dapat mengklasifikasikan alasan izin praktikan menggunakan model AI yang tercantum pada bahan panduan repository (.zip) — *tanpa API pengajar* — dan menyimpan hasil analisisnya sebagai informasi pendukung (bukan penentu otomatis).
- **SRS-IZIN-02 :** Sebagai Asisten, saya dapat melihat daftar pengajuan izin beserta hasil klasifikasi AI-nya, lalu memberikan keputusan terima atau tolak secara manual.
- **SRS-UI-01 :** Sebagai sistem, saya menangani kondisi kegagalan (input tidak valid, data kosong, belum login, atau layanan AI tidak merespons) dan memberikan feedback UI yang sesuai (graceful degradation).

---

## 2. File yang Dikerjakan Ferdy (Sprint 2)

```
src/
├── types/
│   └── permit.ts                           <-- Model data izin dan hasil klasifikasi AI
├── services/
│   ├── ai.ts                               <-- [BARU] Client pemanggilan model AI sesuai panduan .zip
│   └── permits.ts                          <-- Service Firestore untuk izin & integrasi fungsi AI
├── features/
│   └── permits/components/
│       ├── PermitForm.tsx                  <-- Form pengajuan izin praktikan
│       ├── PermitStatusCard.tsx            <-- Tampilan status izin praktikan
│       └── PermitReviewCard.tsx            <-- Kartu review asisten (badge AI info & tombol aksi)
└── app/
    ├── student/(tabs)/
    │   └── permit.tsx                      <-- Halaman tab pengajuan & status izin praktikan
    └── assistant/(tabs)/
        └── permits.tsx                     <-- Halaman tab daftar izin masuk untuk asisten
```

---

## 3. Spesifikasi Teknis & Kontrak Data

> ⚠️ **CATATAN RESMI ASISTEN PRAKTIKUM TERKAIT AI:**  
> Poin yang menyebutkan "API model AI dari pengajar" adalah **typo/ditiadakan**.  
> Sebagai gantinya, implementasi AI dilakukan langsung oleh Ferdy dengan:
> 1. Mengambil bahan dari file `.zip` panduan yang ada di repository / classroom.
> 2. Menggunakan SDK model AI yang tercantum dalam panduan tersebut (misal: Gemini API SDK via Google Generative AI atau model LLM yang diinstruksikan).

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
  aiClassification?: AIClassificationResult; // Diisi oleh model AI
  decisionNote?: string;    // Catatan manual asisten
  reviewedBy?: string;      // Nama / ID asisten
  reviewedAt?: string;
}
```

### 3.2 Service Pemanggilan Model AI (`src/services/ai.ts`)
Modul ini bertugas mengeksekusi model AI sesuai panduan bahan repository `.zip`:
```typescript
import { AIClassificationResult } from '@/types/permit';

/**
 * Prompt Template yang menginstruksikan model AI untuk mengklasifikasi
 * alasan ketidakhadiran dan mengembalikan format JSON terstruktur.
 */
export async function classifyPermitReason(reasonText: string): Promise<AIClassificationResult> {
  try {
    // 1. Inisialisasi model sesuai panduan di file .zip (misal: Gemini API / SDK terkait)
    // 2. Berikan system prompt agar output selalu berupa JSON valid:
    //    {
    //      "category": "SAKIT" | "KEDUKAAN_URGEN" | "TUGAS_AKADEMIK" | "KEPERLUAN_PRIBADI" | "LAINNYA",
    //      "confidence": 0.95,
    //      "urgencyLevel": "TINGGI" | "SEDANG" | "RENDAH",
    //      "summary": "Ringkasan 1 kalimat"
    //    }
    // 3. Parse output JSON dan kembalikan AIClassificationResult
    
    // (Implementasikan pemanggilan SDK model di sini sesuai guide repository)
    throw new Error('Not implemented yet');
  } catch (error) {
    console.warn('AI Model failed or offline:', error);
    // Graceful degradation: Kembalikan fallback jika AI tidak merespons
    return {
      category: 'LAINNYA',
      confidence: 0,
      urgencyLevel: 'SEDANG',
      summary: 'Analisis AI belum tersedia (Layanan sedang sibuk).',
    };
  }
}
```

### 3.3 Service Izin & Integrasi Firestore (`src/services/permits.ts`)
```typescript
import { PermitRequest } from '@/types/permit';
import { classifyPermitReason } from './ai';

/**
 * 1. Mengajukan Izin Baru (SRS-IZIN-01 & SRS-AI-01)
 * Alur: Simpan status PENDING -> Panggil classifyPermitReason() secara async -> Update hasil AI di Firestore.
 */
export async function submitPermit(
  permitData: Omit<PermitRequest, 'id' | 'submittedAt' | 'status'>
): Promise<{ success: boolean; permitId: string; message: string }>;

/**
 * 2. Ambil Izin untuk Praktikan Tertentu (SRS-IZIN-01)
 */
export async function getStudentPermits(studentId: string): Promise<PermitRequest[]>;

/**
 * 3. Ambil Seluruh Izin Masuk untuk Asisten (SRS-IZIN-02)
 */
export async function getIncomingPermits(): Promise<PermitRequest[]>;

/**
 * 4. Keputusan Asisten (SRS-IZIN-02)
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
- [ ] **Langkah 2**: Periksa bahan panduan model AI dari file `.zip` di repositori praktikum / classroom.
- [ ] **Langkah 3**: Buat model data di `src/types/permit.ts`.
- [ ] **Langkah 4**: Buat client pemanggilan model AI di `src/services/ai.ts` sesuai model & panduan yang ada di file `.zip` tersebut.
- [ ] **Langkah 5**: Buat service Firestore di `src/services/permits.ts` yang mengintegrasikan pemanggilan `classifyPermitReason()` dari `ai.ts`.
- [ ] **Langkah 6**: Buat komponen `PermitForm.tsx` dan `PermitStatusCard.tsx` di `src/features/permits/components/`.
- [ ] **Langkah 7**: Buat halaman `src/app/student/(tabs)/permit.tsx` dan daftarkan tab di `src/app/student/(tabs)/_layout.tsx`.
- [ ] **Langkah 8**: Buat komponen `PermitReviewCard.tsx` (tampilkan kartu izin, chip hasil AI, dan tombol konfirmasi Terima/Tolak).
- [ ] **Langkah 9**: Buat halaman `src/app/assistant/(tabs)/permits.tsx` dan daftarkan tab di `src/app/assistant/(tabs)/_layout.tsx`.
- [ ] **Langkah 10**: Uji penanganan error (layanan AI offline/timeout, input kosong) untuk memastikan graceful degradation.
- [ ] **Langkah 11**: Jalankan `npx tsc --noEmit` & `npx expo lint`.
- [ ] **Langkah 12**: Ajukan Pull Request ke `dev`.

