# Panduan Tugas — Ferdy Prasetya Putra (24060124140145)
## Modul Sprint 3: Peta Laboratorium Interaktif (Maps), Informasi Aktivitas Lab, Push Notification Terarah, & Penanganan Izin Perangkat

> **PETUNJUK KHUSUS AI ASSISTANT / PENGEMBANG (SPRINT 3):**  
> ⚠️ **Sprint 1 & Sprint 2 SELESAI:** Jangan membongkar ulang UI Design System (`src/components/ui/*`, `src/constants/theme.ts`), modul Auth (`src/services/auth.ts`), maupun alur validasi radius presensi milik Zaidan (`src/app/student/check-in/[id].tsx`, `src/services/labs.ts`).  
> Fokus Anda di Sprint 3 adalah **Peta Laboratorium Interaktif (Maps + Live User Tracking)**, **Informasi Praktikum Berlangsung & Berikutnya di Peta**, **Push Notification Terarah**, serta **Penanganan Izin Akses & Kondisi Perangkat** (**Objektif Demo 2 & 3**).  
> Modul Halaman Khusus Presensi & Validasi Radius dikerjakan oleh **Zaidan** ([docs/TUGAS_ZAIDAN.md](TUGAS_ZAIDAN.md)).

---

## 1. Product Requirements Document (PRD) — Sprint 3 Ferdy

### 1.1 Objektif Utama (Alur Demo 2 & 3)
1. **Peta & Aktivitas Laboratorium (Alur Demo 2):** Menyediakan halaman Maps interaktif yang menampilkan *marker* seluruh laboratorium Informatika dari Cloud Firestore beserta *marker* posisi perangkat pengguna secara *live*. Ketika pengguna mengetuk marker laboratorium, aplikasi menampilkan informasi praktikum yang **sedang berlangsung** (`OPEN`) dan **praktikum berikutnya** (`NOT_STARTED`) secara *real-time*.
2. **Push Notification Kegiatan & Permissions (Alur Demo 3):** Mengintegrasikan *Push Notification* (FCM / `expo-notifications`) yang mengirim pemberitahuan **hanya kepada pengguna berkepentingan** saat sesi praktikum dibuka, jadwal berubah, atau pengajuan izin diterima/ditolak, dilengkapi permintaan izin akses (*location* & *notification*) serta penanganan seluruh kondisi kegagalan/penolakan secara ramah pengguna.

### 1.2 User Stories & Pemetaan SRS Sprint 3
- **`SRS-S3-04` (Peta Laboratorium Interaktif + Live User Marker):**  
  Sebagai Pengguna (Praktikan/Asisten), saya dapat membuka halaman **Maps** yang menampilkan *marker* seluruh laboratorium di lingkungan Informatika serta *marker* posisi perangkat saya yang bergerak *real-time* mengikuti perpindahan perangkat selama halaman dibuka.
- **`SRS-S3-05` (Informasi Aktivitas Laboratorium Real-Time pada Peta):**  
  Sebagai Pengguna, ketika saya mengetuk salah satu *marker* laboratorium di peta, saya melihat **praktikum yang sedang berlangsung** dan **praktikum berikutnya** berdasarkan data Cloud Firestore (mencakup **Nama Praktikum, Kelas, Waktu Pelaksanaan, dan Status Sesi**), dan setiap perubahan jadwal/status langsung tercermin.
- **`SRS-S3-06` (Push Notification Terarah Berdasarkan Peristiwa):**  
  Sebagai Praktikan, saya menerima *push notification* secara otomatis apabila: (1) sesi praktikum kelas saya **dibuka**, (2) jadwal praktikum **berubah**, atau (3) pengajuan izin saya **diterima (`APPROVED`) maupun ditolak (`REJECTED`)** oleh asisten. Notifikasi tidak dikirim ke pengguna yang tidak berkepentingan, dan mengetuk notifikasi langsung membuka layar terkait (*deep link*).
- **`SRS-S3-07` (Penanganan Izin Akses & Kondisi Perangkat):**  
  Sebagai Sistem, saya meminta izin akses lokasi & notifikasi sesuai kebutuhan dan menangani secara informatif kondisi ketika: pengguna menolak izin akses, layanan lokasi (GPS) mati, lokasi belum tersedia, koneksi gangguan, atau notifikasi perangkat ditolak (*in-app notification fallback*).

---

## 2. Referensi Resmi Asisten Praktikum & Adaptasi Expo SDK 58

Kedua tautan referensi dari asisten praktikum berikut menjadi panduan utama implementasi:

1. **Push Notification — Silversky Technology:**  
   https://medium.com/@silverskytechnology/rich-push-notifications-in-react-native-a-complete-guide-797dd9747366  
   **Langkah kunci yang diimplementasikan (diadaptasi ke `expo-notifications` SDK 58):**
   - **Step 1 (Delivery & Token):** Integrasi Expo Notifications / FCM; simpan `pushToken` pengguna di `users/{uid}` Firestore serta catat event notifikasi di koleksi Firestore `notifications` agar dapat memicu notifikasi *real-time* dan menjadi *in-app fallback*.
   - **Step 2 (Runtime Permission):** Minta izin notifikasi secara eksplisit (`Notifications.requestPermissionsAsync()`) untuk iOS & Android 13+; tangani jika status `'denied'`.
   - **Step 3 (Android Notification Channels):** Konfigurasikan *Notification Channels* (`session-opened`, `schedule-updates`, `permit-decisions`) dengan `Notifications.setNotificationChannelAsync(...)`.
   - **Step 4 (Rich Notification Content):** Sertakan judul, isi pesan informatif, `data` payload (`route`, `sessionId`, `permitId`), dan warna/badge.
   - **Step 5 (App Lifecycle Handling):** Tangani notifikasi pada state **Foreground** (`setNotificationHandler`), **Background**, dan **Killed/Quit** (`getLastNotificationResponseAsync`).
   - **Step 6 (Deep Linking):** Pada listener `addNotificationResponseReceivedListener`, arahkan pengguna ke layar terkait menggunakan `router.push(data.route)`.

2. **Google Maps & Real-Time Location Tracking — Silversky Technology:**  
   https://medium.com/@silverskytechnology/implementing-google-maps-and-routes-tracking-in-react-native-a-starter-guide-9768282594b8  
   **Langkah kunci yang diimplementasikan (diadaptasi ke Expo SDK 58 CNG):**
   - **Step 1 (Install via Expo):**
     ```bash
     npx expo install react-native-maps expo-location expo-notifications
     ```
     Konfigurasi plugin & Google Maps API Key dilakukan di **`app.json`** — **jangan** membuat folder `android/` atau `ios/` secara manual.
   - **Step 2 (Location Permission & GPS):** Gunakan `Location.requestForegroundPermissionsAsync()`, `Location.hasServicesEnabledAsync()`, dan `Location.watchPositionAsync()` (padanan resmi Expo untuk `@react-native-community/geolocation`).
   - **Step 3 (Core Map Components):** Gunakan `<MapView>`, `<Marker>` (untuk setiap laboratorium Informatika + posisi pengguna), dan `<Circle>` (untuk visualisasi radius presensi lab dari `LabLocation.radiusMeters`).
   - **Step 4 (Web Fallback):** Karena `react-native-maps` adalah komponen native iOS/Android, sediakan fallback UI berbasis daftar lab & koordinat saat `Platform.OS === 'web'` agar `npx expo start --web` tidak error.

---

## 3. File yang Dikerjakan Ferdy (Sprint 3)

> Aturan struktur & batas impor: [docs/ARCHITECTURE.md](ARCHITECTURE.md) §2, §3, dan §8.  
> ⚠️ **PENTING (ESLint Rule):** Saat membuat folder baru `src/features/maps/`, tambahkan `'maps'` ke array `features` di [`eslint.config.js`](../eslint.config.js) (`const features = ['role', 'sessions', 'attendance', 'permits', 'maps'];`).

```text
src/
├── types/
│   └── notification.ts                             <-- [BARU] AppNotification, NotificationEventType, DevicePermissionState
├── services/
│   ├── permissions.ts                              <-- [BARU] Permintaan izin lokasi/notifikasi & deteksi GPS mati / ditolak
│   └── notifications.ts                            <-- [BARU] Setup channels, push token, targeted dispatch, & listener Firestore
├── features/
│   └── maps/components/
│       ├── InteractiveLabMap.tsx                   <-- [BARU] MapView + Marker Lab + Circle Radius + Live User Marker (+ web fallback)
│       ├── LabActivitySheet.tsx                    <-- [BARU] Kartu info praktikum sedang berlangsung & berikutnya di lab terpilih
│       └── PermissionAlertCard.tsx                 <-- [BARU] Banner/kartu panduan saat izin ditolak, GPS mati, atau offline
└── app/
    ├── _layout.tsx                                 <-- [UPDATE] Inisialisasi listener push notification + deep linking & in-app banner
    ├── student/(tabs)/
    │   ├── _layout.tsx                             <-- [UPDATE] Tambah tab "Peta Lab" (maps)
    │   └── maps.tsx                                <-- [BARU] Halaman Peta Laboratorium Interaktif (Praktikan)
    └── assistant/(tabs)/
        ├── _layout.tsx                             <-- [UPDATE] Tambah tab "Peta Lab" (maps)
        └── maps.tsx                                <-- [BARU] Halaman Peta Laboratorium Interaktif (Asisten)
```

> 💡 **Integrasi Event Trigger Notifikasi (Koordinasi dengan Zaidan & Modul Sprint 2):**  
> Panggil helper dari `src/services/notifications.ts` pada 3 titik peristiwa:
> 1. **Sesi dibuka (`status: 'OPEN'`)** $\rightarrow$ `notifySessionOpened(session)` (target: praktikan yang terdaftar di `session.classCode`).
> 2. **Jadwal praktikum diubah (`updateSession` / approval reschedule)** $\rightarrow$ `notifyScheduleChanged(session)` (target: praktikan kelas terkait).
> 3. **Izin direview (`reviewPermit` di `src/services/permits.ts`)** $\rightarrow$ `notifyPermitReviewed(permit, decision)` (target: hanya `permit.studentId`).

---

## 4. Spesifikasi Teknis & Kontrak Data

### 4.1 Kontrak Tipe Notifikasi & Izin Perangkat (`src/types/notification.ts`)
```typescript
export type NotificationEventType =
  | 'SESSION_OPENED'
  | 'SCHEDULE_CHANGED'
  | 'PERMIT_APPROVED'
  | 'PERMIT_REJECTED';

export interface AppNotification {
  id: string;
  type: NotificationEventType;
  title: string;
  body: string;
  targetUserIds: string[];     // Kosong jika berdasarkan kelas, atau berisi UID spesifik (mis. pemohon izin)
  targetClassCode?: string;    // Misal: "C1" untuk notifikasi sesi dibuka / jadwal berubah
  route: string;               // Deep link Expo Router, misal: "/student/check-in/session-1" atau "/student/permit"
  sessionId?: string;
  permitId?: string;
  createdAt: string;
  readBy?: string[];
}

export interface DevicePermissionState {
  locationGranted: boolean;
  locationServicesEnabled: boolean;
  notificationGranted: boolean;
  errorMessage?: string;
}
```

### 4.2 Service Penanganan Izin & Kondisi Perangkat (`src/services/permissions.ts`)
```typescript
import { DevicePermissionState } from '@/types/notification';

/** Meminta izin lokasi foreground + mengecek apakah layanan GPS perangkat aktif (SRS-S3-07). */
export async function ensureLocationPermission(): Promise<{
  granted: boolean;
  servicesEnabled: boolean;
  canAskAgain: boolean;
  message?: string;
}>;

/** Meminta izin push notification & menangani jika pengguna menolak (SRS-S3-07). */
export async function ensureNotificationPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}>;

/** Mengambil ringkasan seluruh status izin perangkat sekaligus. */
export async function getDevicePermissionState(): Promise<DevicePermissionState>;
```

### 4.3 Service Push Notification Terarah (`src/services/notifications.ts`)
```typescript
import { PracticalSession } from '@/types/attendance';
import { PermitRequest } from '@/types/permit';
import { AppNotification } from '@/types/notification';

/** Setup Android Notification Channels + foreground handler + simpan token user ke Firestore. */
export async function initializeNotificationsForUser(userId: string): Promise<string | null>;

/** Mengirim notifikasi terarah ketika asisten membuka sesi praktikum (hanya ke praktikan kelas terkait). */
export async function notifySessionOpened(session: PracticalSession): Promise<void>;

/** Mengirim notifikasi terarah ketika jadwal praktikum mengalami perubahan. */
export async function notifyScheduleChanged(session: PracticalSession, changeSummary: string): Promise<void>;

/** Mengirim notifikasi terarah hanya kepada praktikan pemilik permohonan izin setelah direview asisten. */
export async function notifyPermitReviewed(
  permit: PermitRequest,
  decision: 'APPROVED' | 'REJECTED',
  decisionNote?: string
): Promise<void>;

/**
 * Listener real-time koleksi Firestore `notifications` untuk pengguna aktif.
 * Otomatis memicu local/push notification perangkat (jika izin aktif) atau in-app banner (jika izin ditolak).
 */
export function subscribeUserNotifications(
  userId: string,
  enrolledClasses: string[],
  onNotificationReceived: (notif: AppNotification) => void
): () => void;
```

---

## 5. Checklist Eksekusi Step-by-Step (Sprint 3 Ferdy)

- [ ] **Langkah 1**: Buat branch `feat/ferdy/maps-push-notifications` dari `main`/`dev` terbaru.
- [ ] **Langkah 2**: Jalankan `npx expo install react-native-maps expo-location expo-notifications` dan tambahkan konfigurasi plugin di `app.json`.
- [ ] **Langkah 3**: Daftarkan `'maps'` pada daftar `features` di `eslint.config.js`.
- [ ] **Langkah 4**: Buat `src/types/notification.ts` dan `src/services/permissions.ts` (minta izin lokasi, cek GPS aktif/mati, minta izin notifikasi, tangani skenario penolakan izin).
- [ ] **Langkah 5**: Buat `src/services/notifications.ts`:
  - Setup Android Notification Channels (`session-opened`, `schedule-updates`, `permit-decisions`).
  - Simpan push token & kirim event terarah ke koleksi Firestore `notifications`.
  - Pastikan notifikasi hanya sampai ke pengguna yang berkepentingan (`targetUserIds` atau `targetClassCode`).
  - Integrasikan *deep linking* via Expo Router saat notifikasi diketuk, serta *in-app notification fallback* jika izin OS ditolak.
- [ ] **Langkah 6**: Hubungkan trigger notifikasi ke:
  - Pembukaan sesi (`notifySessionOpened`),
  - Perubahan jadwal (`notifyScheduleChanged`),
  - Keputusan review izin di `src/services/permits.ts` (`notifyPermitReviewed`).
- [ ] **Langkah 7**: Buat komponen peta di `src/features/maps/components/`:
  - `InteractiveLabMap.tsx`: `<MapView>` + `<Marker>` untuk setiap lab dari `subscribeLabs()` (`src/services/labs.ts`) + `<Circle>` radius + *live user marker* via `Location.watchPositionAsync()` (wajib cleanup saat unmount) + fallback Web.
  - `LabActivitySheet.tsx`: Menampilkan **Praktikum Sedang Berlangsung (`OPEN`)** dan **Praktikum Berikutnya (`NOT_STARTED`)** untuk lab yang dipilih secara *real-time* dari Firestore (Nama Praktikum, Kelas, Waktu Pelaksanaan, Status Sesi).
  - `PermissionAlertCard.tsx`: UI informatif + tombol *"Coba Lagi / Buka Pengaturan"* ketika izin ditolak atau GPS mati.
- [ ] **Langkah 8**: Buat rute `src/app/student/(tabs)/maps.tsx` dan `src/app/assistant/(tabs)/maps.tsx`, lalu daftarkan tab **"Peta"** pada kedua `_layout.tsx`.
- [ ] **Langkah 9**: Uji skenario **Alur Demo 2 & 3**:
  1. Buka Maps $\rightarrow$ posisi perangkat bergerak *live* & marker lab tampil $\rightarrow$ ketuk marker lab $\rightarrow$ sesi berlangsung & berikutnya tampil sesuai Firestore dan langsung berubah saat status sesi diubah asisten.
  2. Asisten buka sesi / ubah jadwal / terima-tolak izin $\rightarrow$ praktikan terkait menerima notifikasi (praktikan kelas lain tidak menerima).
  3. Tolak izin lokasi / matikan GPS / tolak izin notifikasi $\rightarrow$ tampil pesan & panduan UI yang jelas tanpa crash.
- [ ] **Langkah 10**: Jalankan `npx tsc --noEmit` & `npx expo lint` (0 errors), lalu ajukan Pull Request.

---

## 6. Arsip Rekam Jejak Sprint 2 (Selesai ✅)

- **Sistem Izin Ketidakhadiran, Model AI Lokal, & Review Asisten (`SRS-IZIN-01`, `SRS-AI-01`, `SRS-IZIN-02`, `SRS-UI-01`):** `src/types/permit.ts`, `src/services/ai.ts`, `src/services/permits.ts`, `src/features/permits/components/{PermitForm,PermitStatusCard,PermitReviewCard}.tsx`, `src/app/student/(tabs)/permit.tsx`, `src/app/assistant/(tabs)/permits.tsx` — **100% Selesai ✅**.
