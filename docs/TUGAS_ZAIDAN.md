# Panduan Tugas — Muhammad Zaidan Alfarizi (24060124130102)
## Modul Sprint 3: Halaman Khusus Presensi, Validasi Lokasi (Geofencing), & Pengelolaan Lokasi Laboratorium

> **PETUNJUK KHUSUS AI ASSISTANT / PENGEMBANG (SPRINT 3):**  
> ⚠️ **Sprint 1 & Sprint 2 SELESAI:** Jangan membongkar ulang sistem Auth (`services/auth.ts`), UI Design System (`src/components/ui/*`, `src/constants/theme.ts`), maupun modul Izin & AI (`src/features/permits/*`, `src/services/permits.ts`).  
> Fokus Anda di Sprint 3 **HANYA** pada modul Geolocation Check-In, Halaman Khusus Presensi terpisah, dan CRUD Lokasi/Radius Laboratorium di Firestore (**Objektif Demo 1**).  
> Modul Maps Interaktif dan Push Notification dikerjakan oleh **Ferdy** ([docs/TUGAS_FERDY.md](TUGAS_FERDY.md)).

---

## 1. Product Requirements Document (PRD) — Sprint 3 Zaidan

### 1.1 Objektif Utama (Alur Demo 1)
Memastikan presensi praktikan tidak lagi dapat dilakukan dari sembarang tempat dengan menambahkan **halaman khusus presensi terpisah dari detail sesi**, **validasi lokasi perangkat terhadap radius laboratorium** yang terintegrasi langsung pada proses pencatatan Firestore (bukan sekadar tampilan visual), serta **pengelolaan titik koordinat dan radius laboratorium** oleh Asisten yang tersimpan persisten di Cloud Firestore.

### 1.2 User Stories & Pemetaan SRS Sprint 3
- **`SRS-S3-01` (Halaman Khusus Presensi + Opsional QR Code):**  
  Sebagai Praktikan, saya dapat mengakses **halaman khusus untuk melakukan presensi (`/student/check-in/[id]`) yang terpisah dari halaman detail sesi (`/student/attendance/[id]`)**, guna melihat informasi sesi, status sesi, hasil pemeriksaan lokasi saya, serta menekan tombol presensi *(opsional: memindai QR Code yang ditampilkan asisten)*.
- **`SRS-S3-02` (Validasi Lokasi Presensi / Geofencing Radius):**  
  Sebagai Sistem, saya memeriksa koordinat GPS perangkat praktikan terhadap koordinat dan radius laboratorium menggunakan perhitungan jarak (Haversine). Presensi **hanya boleh dicatat** ke Firestore apabila **sesi berstatus `OPEN` DAN praktikan berada di dalam radius yang diizinkan** (serta belum pernah presensi pada sesi yang sama). Apabila di luar radius atau lokasi tidak diperoleh, tampilkan informasi jarak/status secara jelas dan tolak pencatatan presensi.
- **`SRS-S3-03` (Pengelolaan Lokasi & Radius Laboratorium di Firestore):**  
  Sebagai Asisten, saya dapat menentukan lokasi laboratorium (koordinat `latitude`, `longitude`) dan `radiusMeters` yang berlaku untuk kegiatan praktikum, dan menyimpannya di koleksi **Cloud Firestore (`labs` / `sessions`)** agar digunakan secara konsisten oleh seluruh pengguna terkait (bukan *local storage*).

---

## 2. Referensi Teknis & Paket Expo SDK 58

- **Referensi Resmi Asisten Praktikum (Geolocation & Maps Tracking):**  
  https://medium.com/@silverskytechnology/implementing-google-maps-and-routes-tracking-in-react-native-a-starter-guide-9768282594b8
- **Adaptasi Expo SDK 58 (Managed / Continuous Native Generation):**
  - Pasang library lokasi menggunakan perintah resmi Expo (bukan `npm install`):
    ```bash
    npx expo install expo-location
    # Opsional jika mengimplementasikan QR Code:
    npx expo install expo-camera
    ```
  - Konfigurasikan deskripsi izin lokasi (`NSLocationWhenInUseUsageDescription`, `ACCESS_FINE_LOCATION`) melalui plugin `expo-location` di `app.json` — **jangan** membuat atau mengedit folder `android/` atau `ios/` secara manual.
  - Gunakan `Location.requestForegroundPermissionsAsync()` dan `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })` sebagai padanan resmi Expo untuk `@react-native-community/geolocation` pada artikel referensi.

---

## 3. File yang Dikerjakan Zaidan (Sprint 3)

> Aturan struktur & batas impor: [docs/ARCHITECTURE.md](ARCHITECTURE.md) §2, §3, dan §8.

```text
src/
├── types/
│   └── lab.ts                                      <-- [BARU] Tipe LabLocation, Coordinates, LocationValidationResult
├── utils/
│   └── geo.ts                                      <-- [BARU] Fungsi murni Haversine (calculateDistanceMeters & validateRadius)
├── services/
│   ├── labs.ts                                     <-- [BARU] CRUD Firestore koleksi `labs` (koordinat & radius lab)
│   └── attendance.ts                               <-- [UPDATE] Validasi wajib lokasi & radius di submitAttendanceToFirestore()
├── features/
│   └── attendance/components/
│       ├── LocationStatusBanner.tsx                <-- [BARU] Indikator visual jarak meter (Dalam Radius / Di Luar Radius / GPS Error)
│       └── LabLocationConfigModal.tsx              <-- [BARU] Modal asisten atur koordinat & radius lab ke Firestore
└── app/
    ├── assistant/
    │   └── session/[id].tsx                        <-- [UPDATE] Tambah tombol/panel konfigurasi lokasi lab & radius sesi
    └── student/
        ├── attendance/[id].tsx                     <-- [UPDATE] Halaman Detail Sesi (tampilkan info sesi + tombol "Menuju Halaman Presensi")
        └── check-in/[id].tsx                       <-- [BARU] Halaman Khusus Presensi Terpisah (SRS-S3-01 & SRS-S3-02)
```

> 💡 **Koordinasi dengan Ferdy:** Ferdy akan mengonsumsi `LabLocation` (`src/types/lab.ts`) dan `subscribeLabs` / `getLabs` (`src/services/labs.ts`) untuk merender *marker* dan radius *circle* di halaman Maps. Pastikan kontrak data di §4 tidak berubah tanpa kesepakatan bersama!

---

## 4. Spesifikasi Teknis & Kontrak Data

### 4.1 Kontrak Tipe Lokasi Laboratorium (`src/types/lab.ts`)
```typescript
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LabLocation {
  id: string;            // misal: "lab-komputer-1", "lab-komputer-2", "lab-basis-data"
  name: string;          // harus cocok dengan field `room` di PracticalSession, misal: "Lab Komputer 2"
  building: string;      // misal: "Gedung E Departemen Informatika"
  latitude: number;
  longitude: number;
  radiusMeters: number;  // default misal: 50 (meter)
  updatedBy?: string;
  updatedAt?: string;
}

export type LocationCheckStatus =
  | 'IDLE'
  | 'CHECKING'
  | 'INSIDE_RADIUS'
  | 'OUTSIDE_RADIUS'
  | 'PERMISSION_DENIED'
  | 'GPS_DISABLED'
  | 'UNAVAILABLE';

export interface LocationValidationResult {
  allowed: boolean;
  status: LocationCheckStatus;
  distanceMeters: number | null;
  maxRadiusMeters: number;
  userCoords?: Coordinates;
  message: string;
}
```

### 4.2 Utilitas Perhitungan Jarak Murni (`src/utils/geo.ts`)
```typescript
import { Coordinates, LabLocation, LocationValidationResult } from '@/types/lab';

/**
 * Menghitung jarak antara dua titik koordinat (dalam meter) menggunakan rumus Haversine.
 */
export function calculateDistanceMeters(from: Coordinates, to: Coordinates): number;

/**
 * Memvalidasi apakah posisi praktikan berada di dalam radius laboratorium yang diizinkan.
 */
export function validateStudentLocation(
  userCoords: Coordinates | null,
  lab: Pick<LabLocation, 'latitude' | 'longitude' | 'radiusMeters' | 'name'>
): LocationValidationResult;
```

### 4.3 Service Firestore Lokasi Laboratorium (`src/services/labs.ts`)
Koleksi Firestore: **`labs`** (dan opsional field `labId` / `radiusMeters` pada dokumen **`sessions`**).
```typescript
import { LabLocation } from '@/types/lab';

/** Mengambil seluruh daftar laboratorium dari Firestore (seed default lab Informatika jika kosong). */
export async function getLabs(): Promise<LabLocation[]>;

/** Real-time listener daftar laboratorium (dipakai juga oleh Ferdy di halaman Maps). */
export function subscribeLabs(onUpdate: (labs: LabLocation[]) => void): () => void;

/** Mencari data lokasi lab berdasarkan nama ruangan (`session.room`) atau ID lab. */
export async function getLabByRoomName(roomName: string): Promise<LabLocation | null>;

/** Asisten menyimpan/memperbarui koordinat & radius laboratorium ke Cloud Firestore (SRS-S3-03). */
export async function upsertLabLocation(lab: Omit<LabLocation, 'updatedAt'>): Promise<void>;
```

### 4.4 Penegakan Validasi Lokasi di Pencatatan Presensi (`src/services/attendance.ts`)
Perhatikan aturan wajib dari memo asisten praktikum:
> *"Validasi lokasi harus menjadi bagian dari proses pencatatan presensi, bukan sekadar informasi visual pada antarmuka. Presensi yang tidak memenuhi ketentuan sesi atau lokasi tidak boleh dicatat sebagai kehadiran berhasil."*

Perluas parameter `submitAttendanceToFirestore` agar menerima `userCoords?: Coordinates` dan `labLocation?: LabLocation` (atau membaca lokasi lab dari Firestore berdasarkan `session.room`):
1. Jika koordinat pengguna tidak tersedia $\rightarrow$ return `{ success: false, message: 'Lokasi perangkat tidak dapat diperoleh. Aktifkan GPS dan coba lagi.' }`.
2. Hitung `calculateDistanceMeters(userCoords, lab)` $\rightarrow$ jika `distanceMeters > lab.radiusMeters`, **tolak transaksi** dan return `{ success: false, message: 'Anda berada di luar radius laboratorium (Jarak: XX m, maks: YY m).' }`.
3. Jika `session.status === 'OPEN'`, `distanceMeters <= lab.radiusMeters`, dan belum pernah presensi $\rightarrow$ simpan dokumen presensi ke Firestore beserta metadata `distanceMeters` dan `latitude`/`longitude` saat presensi.

---

## 5. Checklist Eksekusi Step-by-Step (Sprint 3 Zaidan)

- [x] **Langkah 1**: Buat branch `feat/zaidan/location-checkin-labs` dari `main`/`dev` terbaru.
- [x] **Langkah 2**: Jalankan `npx expo install expo-location` dan tambahkan konfigurasi plugin izin lokasi di `app.json`.
- [x] **Langkah 3**: Buat `src/types/lab.ts` dan fungsi murni Haversine di `src/utils/geo.ts`.
- [x] **Langkah 4**: Buat `src/services/labs.ts` untuk CRUD & *real-time listener* koleksi Firestore `labs` (lengkap dengan titik koordinat awal laboratorium Informatika).
- [x] **Langkah 5**: Buat modal `src/features/attendance/components/LabLocationConfigModal.tsx` dan pasang di `src/app/assistant/session/[id].tsx` agar Asisten dapat mengatur koordinat (termasuk tombol *"Gunakan Lokasi Saat Ini"*) dan radius (meter) untuk lab/sesi praktikum.
- [x] **Langkah 6**: Perbarui `submitAttendanceToFirestore()` di `src/services/attendance.ts` agar memvalidasi radius lokasi secara ketat sebelum menulis dokumen ke Firestore (anti-bypass & anti-double attendance).
- [x] **Langkah 7**: Buat komponen `src/features/attendance/components/LocationStatusBanner.tsx` yang menampilkan jarak aktual (meter), status validasi, serta tombol *"Periksa Ulang Lokasi"*.
- [x] **Langkah 8**: Pisahkan alur detail sesi dan halaman presensi (`SRS-S3-01`):
  - Perbarui `src/app/student/attendance/[id].tsx` agar fokus sebagai **Halaman Detail Sesi** dengan tombol **"Masuk ke Halaman Presensi"** menuju `/student/check-in/${session.id}`.
  - Buat **Halaman Khusus Presensi** baru di `src/app/student/check-in/[id].tsx` yang menampilkan info sesi, status sesi, `LocationStatusBanner`, dan `AttendanceForm` / `RippleCheckIn` *(serta opsional QR Code)*.
- [x] **Langkah 9**: Uji skenario **Alur Demo 1**:
  1. Asisten atur lokasi/radius lab & buka sesi (`OPEN`).
  2. Praktikan di **luar radius** $\rightarrow$ presensi ditolak + jarak tampil jelas.
  3. Praktikan di **dalam radius** $\rightarrow$ presensi tercatat di Firestore + muncul real-time di rekap Asisten + presensi ke-2 ditolak (*anti-double*).
- [x] **Langkah 10**: Jalankan `npx tsc --noEmit` & `npx expo lint` (0 errors), lalu ajukan Pull Request.

---

## 6. Arsip Rekam Jejak Sprint 1 & Sprint 2 (Selesai ✅)

- **Sprint 1 (Core Architecture & Asisten Workflow):** `src/types/attendance.ts`, `src/data/mockData.ts`, `src/store/*`, `RoleSelectorModal.tsx`, `assistant/(tabs)/{index,recap}.tsx`, `assistant/session/[id].tsx`, `CreateSessionModal.tsx` — **100% Selesai ✅**.
- **Sprint 2 (Project Manager, QA Lead, & Integrasi Role Admin / Firestore Sync):** Review PR Bayu/Bahir/Ferdy, role `ADMIN` (`src/app/admin/**`, `src/services/admin.ts`), `scripts/seed-firebase.mjs`, dan sinkronisasi real-time Firestore — **100% Selesai ✅**.
