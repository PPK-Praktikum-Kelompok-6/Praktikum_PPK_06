# Panduan Tugas — Ferdy Prasetya Putra (24060124140145)
## Modul Sprint 4 (Pertemuan 9): Integrasi Payment Gateway (Midtrans Sandbox), Notifikasi Denda/Pembayaran, & Riwayat Pembayaran Persisten

> **PETUNJUK KHUSUS AI ASSISTANT / PENGEMBANG (SPRINT 4):**  
> ⚠️ **Sprint 1, 2, & 3 SELESAI:** Jangan membongkar ulang UI Design System (`src/components/ui/*`, `src/constants/theme.ts`), modul Manajemen Lab & Dashboard Aslab milik Zaidan (`src/app/aslab/**`, `src/features/labs/*`), maupun logika *grace period* & generator denda milik Bayu (`src/utils/lateness.ts`, `src/services/fines.ts`).  
> Fokus Anda di Sprint 4 adalah **Integrasi Payment Gateway Midtrans Sandbox (arsitektur Client–Server–Webhook)**, **Notifikasi Tagihan & Hasil Pembayaran**, serta **Halaman Riwayat Pembayaran Persisten** (`SRS-S4-05` & `SRS-S4-06`).

---

## 1. Product Requirements Document (PRD) — Sprint 4 Ferdy

### 1.1 Objektif Utama
1. **Integrasi Midtrans Sandbox yang Aman (`SRS-S4-05`):** Membangun alur pembayaran denda praktikum mengikuti arsitektur **Client (React Native) → Backend Server → Payment Gateway (Midtrans Sandbox) → Webhook Backend → Cloud Firestore**, sehingga *secret key* tidak pernah terekspos di aplikasi mobile dan status pembayaran hanya sah berdasarkan verifikasi webhook backend.
2. **Notifikasi & Riwayat Pembayaran Persisten (`SRS-S4-06`):** Mengintegrasikan event denda & pembayaran ke sistem notifikasi Sprint 3 (`src/services/notifications.ts`) serta menyediakan halaman riwayat pembayaran persisten di Firestore agar seluruh transaksi tetap dapat dilacak meskipun aplikasi ditutup dan dibuka kembali.

### 1.2 User Stories & Pemetaan SRS Sprint 4
- **`SRS-S4-05` (Integrasi Payment Gateway Midtrans Sandbox):**  
  Sebagai Praktikan, saya ingin melihat rincian tagihan denda dan melakukan pembayaran melalui integrasi Payment Gateway (Midtrans Sandbox) yang diverifikasi via backend webhook agar status pembayaran (`pending`, `success`, `failed`) dan status tagihan terbarui secara aman.
- **`SRS-S4-06` (Notifikasi & Riwayat Pembayaran Persisten):**  
  Sebagai Praktikan, saya ingin menerima notifikasi saat tagihan baru dibuat, pembayaran berhasil, atau pembayaran gagal, serta melihat halaman riwayat pembayaran (informasi sesi, tanggal tagihan, nominal, waktu transaksi, status pembayaran) yang tersimpan permanen agar dapat melacak seluruh transaksi denda saya.

---

## 2. Ketentuan Keamanan Wajib (Payment Gateway)

1. **NO Secret Key di React Native:** `MIDTRANS_SERVER_KEY` (dan Firebase Admin credentials) **DILARANG KERAS** diletakkan di folder `src/` maupun di `.env` dengan prefiks `EXPO_PUBLIC_`. Simpan hanya di environment backend (`backend/.env`, jangan di-commit ke Git).
2. **Transaksi Dibuat oleh Backend:** Aplikasi React Native hanya mengirim request ke backend (`POST /api/payments/create`) membawa `{ fineId, studentId }` (dengan Firebase Auth ID Token bila memungkinkan). Backend yang memvalidasi tagihan di Firestore lalu memanggil Midtrans Snap API Sandbox (`https://app.sandbox.midtrans.com/snap/v1/transactions`).
3. **Verifikasi Status Wajib via Webhook Backend:**
   - Respons dari WebView / halaman Snap di client **TIDAK BOLEH** langsung mengubah `FineRecord.status` menjadi `'PAID'` atau `PaymentTransaction.status` menjadi `'success'`.
   - Backend menyediakan endpoint `POST /api/payments/webhook` yang memverifikasi `signature_key`:
     ```text
     SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY) === payload.signature_key
     ```
   - Mapping status Midtrans → status aplikasi:
     - `settlement` / `capture` (`fraud_status === 'accept'`) → `payment.status = 'success'`, `fine.status = 'PAID'`, `fine.paidAt = now`
     - `pending` → `payment.status = 'pending'`, `fine.status = 'PENDING'`
     - `deny` / `cancel` / `expire` / `failure` → `payment.status = 'failed'`, `fine.status = 'UNPAID'` (agar praktikan dapat mencoba bayar ulang)
   - **Pembayaran denda TIDAK BOLEH mengubah `AttendanceRecord.attendanceStatus`** (status kehadiran tetap `LATE`).

---

## 3. File yang Dikerjakan Ferdy (Sprint 4)

> Aturan struktur & batas impor: [docs/ARCHITECTURE.md](ARCHITECTURE.md) §2, §3, dan §9.

```text
Praktikum_PPK_06/
├── backend/                                        <-- [BARU] Backend Server Payment Gateway (Node.js/Express atau Firebase Functions)
│   ├── src/
│   │   ├── index.ts                                <-- Endpoint POST /api/payments/create & POST /api/payments/webhook
│   │   ├── midtrans.ts                             <-- Helper Snap Sandbox API (menggunakan process.env.MIDTRANS_SERVER_KEY)
│   │   └── webhook.ts                              <-- Verifikasi SHA-512 signature_key + update Firestore (payments, fines, notifications)
│   ├── .env.example                                <-- Template env backend (MIDTRANS_SERVER_KEY, PORT, FIREBASE_SERVICE_ACCOUNT)
│   └── package.json
└── src/
    ├── types/
    │   ├── fine.ts                                 <-- [BARU] Kontrak bersama FineRecord, FineStatus, PaymentTransaction, PaymentStatus
    │   └── notification.ts                         <-- [UPDATE] Tambah 'FINE_CREATED' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED'
    ├── services/
    │   ├── payments.ts                             <-- [BARU] createPaymentTransaction() ke backend + subscribeStudentFines() + subscribePaymentHistory()
    │   └── notifications.ts                        <-- [UPDATE] Tambah channel 'fines-payments' & helper notifyFineCreated / notifyPaymentResult
    ├── features/
    │   └── fines/components/
    │       ├── FineCard.tsx                        <-- [BARU] Kartu daftar tagihan & rincian nominal denda + tombol Bayar
    │       ├── PaymentStatusBadge.tsx              <-- [BARU] Badge status pembayaran: pending | success | failed
    │       └── PaymentHistoryItem.tsx              <-- [BARU] Item riwayat pembayaran (sesi, tanggal tagihan, nominal, waktu transaksi, status)
    └── app/
        └── student/
            ├── (tabs)/_layout.tsx                  <-- [UPDATE] Tambah tab "Denda" (fines) pada FloatingTabBar Praktikan
            ├── (tabs)/fines.tsx                    <-- [BARU] Halaman Daftar Tagihan Denda & Tab/Section Riwayat Pembayaran Persisten
            └── payment/[fineId].tsx                <-- [BARU] Halaman Checkout Midtrans Sandbox (WebView/Browser) + Live Status Listener
```

---

## 4. Spesifikasi Teknis & Kontrak Data

### 4.1 Kontrak Tipe Tagihan & Pembayaran (`src/types/fine.ts`)
> Koordinasikan kontrak ini dengan **Bayu** (yang membuat `FineRecord` di `src/services/fines.ts`) dan **Zaidan** (yang membaca koleksi `fines`/`payments` untuk riwayat keuangan dashboard Aslab).

```typescript
export type FineStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'WAIVED';
export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface FineRecord {
  id: string;                    // `fine_${sessionId}_${studentId}`
  studentId: string;
  studentName: string;
  studentNim: string;
  sessionId: string;
  sessionName: string;
  classCode: string;
  labId?: string;
  attendanceId: string;
  lateMinutes: number;
  amount: number;
  status: FineStatus;
  createdAt: string;
  paidAt?: string;
  latestPaymentId?: string;
}

export interface PaymentTransaction {
  id: string;                    // order_id Midtrans
  fineId: string;
  studentId: string;
  sessionId: string;
  sessionName: string;
  fineDate: string;              // Tanggal tagihan (dari FineRecord.createdAt)
  amount: number;
  status: PaymentStatus;         // 'pending' | 'success' | 'failed'
  paymentType?: string;
  snapToken?: string;
  snapRedirectUrl?: string;
  midtransTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 Integrasi Notifikasi (`src/types/notification.ts` & `src/services/notifications.ts`)
Tambahkan 3 tipe event baru pada `NotificationEventType`:
- `'FINE_CREATED'` — Dipicu saat tagihan denda baru dibuat (dipanggil dari service denda Bayu). Deep link: `/student/fines`.
- `'PAYMENT_SUCCESS'` — Dipicu setelah webhook backend memverifikasi pembayaran berhasil. Deep link: `/student/fines`.
- `'PAYMENT_FAILED'` — Dipicu setelah webhook backend memverifikasi pembayaran gagal/kedaluwarsa. Deep link: `/student/payment/[fineId]`.

### 4.3 Paket Expo yang Direkomendasikan (CNG)
Jika menampilkan halaman Snap Midtrans langsung di dalam aplikasi:
```bash
npx expo install react-native-webview
```
Atau gunakan `expo-web-browser` (sudah terpasang di `package.json`) untuk membuka `snapRedirectUrl` beserta fallback web (`Platform.OS === 'web'`).

---

## 5. Checklist Eksekusi Step-by-Step (Sprint 4)

- [ ] **Langkah 1**: Buat branch `feat/ferdy/midtrans-payment-notifications` dari `dev`.
- [ ] **Langkah 2**: Buat `src/types/fine.ts` dan perbarui `src/types/notification.ts` sesuai kontrak bersama.
- [ ] **Langkah 3**: Bangun `backend/` dengan endpoint `POST /api/payments/create` (Midtrans Snap Sandbox) dan `POST /api/payments/webhook` (verifikasi SHA-512 signature + update Firestore `payments`, `fines`, dan `notifications`). Pastikan `MIDTRANS_SERVER_KEY` hanya ada di `backend/.env`.
- [ ] **Langkah 4**: Buat `src/services/payments.ts` untuk memanggil backend (via `EXPO_PUBLIC_PAYMENT_API_URL`) dan listener *real-time* (`onSnapshot`) untuk daftar tagihan & riwayat pembayaran persisten praktikan.
- [ ] **Langkah 5**: Perbarui `src/services/notifications.ts` untuk menangani notifikasi `FINE_CREATED`, `PAYMENT_SUCCESS`, dan `PAYMENT_FAILED`.
- [ ] **Langkah 6**: Buat komponen UI di `src/features/fines/components/` (`FineCard`, `PaymentStatusBadge`, `PaymentHistoryItem`) dengan token `Colors.*` (`src/constants/theme.ts`).
- [ ] **Langkah 7**: Buat halaman `src/app/student/(tabs)/fines.tsx` (Tagihan + Riwayat Pembayaran Persisten), `src/app/student/payment/[fineId].tsx` (Checkout Midtrans Sandbox), dan tambahkan tab di `src/app/student/(tabs)/_layout.tsx`.
- [ ] **Langkah 8**: Uji alur lengkap di Midtrans Sandbox Simulator (Pending → Settlement/Success & Failure/Expire), tutup lalu buka kembali aplikasi untuk memastikan riwayat pembayaran tetap persisten.
- [ ] **Langkah 9**: Jalankan `npx tsc --noEmit` & `npx expo lint`, lalu ajukan Pull Request ke `dev`.
