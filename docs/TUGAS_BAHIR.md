# Panduan Tugas — Bahir Ananda Wibowo (24060124150184)
## Modul: Presensi, Sinkronisasi Real-Time, dan Keamanan Firestore (Sprint 2)

> **PETUNJUK KHUSUS AI ASSISTANT / PENGEMBANG:**  
> ⚠️ **Sprint 1 SELESAI & FREEZE:** Komponen tampilan form presensi (`AttendanceForm.tsx`, `AttendanceSuccessCard.tsx`, `HistoryItemCard.tsx`) sudah selesai dan **JANGAN DIBONGKAR ULANG**.  
> Fokus Anda **HANYA** pada modul baru Sprint 2: Integrasi Firestore untuk Buka/Tutup Sesi, Presensi Anti-Bocor (Atomic Check), Real-Time Listener (`onSnapshot`), dan Firebase Security Rules.

---

## 1. Product Requirements Document (PRD) — Sprint 2 Bahir

### 1.1 Objektif
Mengubah alur presensi dari *in-memory* menjadi *cloud-synced* berbasis Cloud Firestore. Memastikan asisten dapat membuka/menutup sesi dengan status yang langsung tersinkron ke semua perangkat, presensi praktikan diverifikasi secara aman tanpa duplikasi (*anti-bocor*), rekap kehadiran ter-update seketika (*real-time* tanpa refresh), dan akses data terlindungi dengan Firebase Security Rules.

### 1.2 User Stories & Pemetaan SRS
- **SRS-PRES-01 :** Sebagai Asisten, saya dapat membuka dan menutup sesi praktikum agar praktikan dapat mulai melakukan presensi (status tersimpan di Firestore).
- **SRS-PRES-02 :** Sebagai Praktikan, saya dapat melakukan presensi pada sesi yang sedang dibuka dan sistem akan memblokir upaya presensi lebih dari satu kali (*anti-bocor* via Firestore transaction/unique ID).
- **SRS-SYNC-01 :** Sebagai Asisten, saya dapat melihat rekap kehadiran praktikan secara otomatis dan real-time di layar tanpa perlu memuat ulang aplikasi menggunakan *real-time listener* (`onSnapshot`).
- **SRS-SEC-01 :** Sebagai sistem, saya menerapkan Firebase Security Rules agar akses dan perubahan data wajib dibatasi sesuai identitas dan peran.

---

## 2. File yang Dikerjakan Bahir (Sprint 2)

```
src/
├── services/
│   └── attendance.ts                       <-- Service utama presensi & real-time listener
├── app/
│   ├── assistant/session/[id].tsx          <-- Update: Real-time listener rekap hadir (onSnapshot)
│   └── student/attendance/[id].tsx         <-- Update: Submit presensi ke Firestore & validasi status
└── firestore.rules                         <-- File keamanan Firebase Security Rules di root repo
```

> 💡 **File Lama yang TIDAK PERLU DIUBAH:** `src/features/attendance/components/*`, `src/store/*`.

---

## 3. Spesifikasi Teknis & Kontrak Data

### 3.1 Service Presensi & Real-Time Sync (`src/services/attendance.ts`)
```typescript
import { AttendanceRecord } from '@/types/attendance';

/**
 * 1. Buka / Tutup Sesi di Firestore (SRS-PRES-01)
 */
export async function setSessionStatus(sessionId: string, status: 'OPEN' | 'CLOSED'): Promise<void>;

/**
 * 2. Submit Presensi dengan Proteksi Anti-Bocor (SRS-PRES-02)
 * Gunakan document ID deterministik `attendance_${sessionId}_${studentId}`
 * atau Firestore RunTransaction untuk mencegah race condition.
 */
export async function submitAttendanceToFirestore(
  record: Omit<AttendanceRecord, 'id'>
): Promise<{ success: boolean; message: string }>;

/**
 * 3. Real-Time Listener Rekap Kehadiran Sesi (SRS-SYNC-01)
 * Menggunakan onSnapshot agar UI asisten update seketika saat ada praktikan absen.
 */
export function subscribeToSessionAttendance(
  sessionId: string,
  onUpdate: (records: AttendanceRecord[]) => void
): () => void; // Unsubscribe function

/**
 * 4. Ambil Riwayat Kehadiran Praktikan
 */
export async function getStudentAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]>;
```

### 3.2 Aturan Keamanan Firebase (`firestore.rules`)
File `firestore.rules` wajib dibuat di root repository:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function
    function isSignedIn() {
      return request.auth != null;
    }
    function isAssistant() {
      return isSignedIn() && request.auth.token.role == 'ASSISTANT';
    }

    // Sessions: Siapapun yang login bisa baca; hanya asisten yang bisa update status
    match /sessions/{sessionId} {
      allow read: if isSignedIn();
      allow create, delete: if isAssistant();
      allow update: if isAssistant();
    }

    // Attendance: Mahasiswa hanya bisa create data miliknya sendiri saat sesi OPEN
    match /attendance/{attendanceId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() 
        && request.resource.data.studentId == request.auth.uid;
      allow update, delete: if false; // Data presensi tidak boleh diubah/dihapus sembarangan
    }
  }
}
```

---

## 4. Alur Kerja & Checklist Implementasi

- [ ] **Langkah 1**: Buat branch `feat/bahir/attendance-realtime-rules` dari `dev`.
- [ ] **Langkah 2**: Buat `src/services/attendance.ts` yang mengimplementasikan method di atas menggunakan modul `db` dari `src/services/firebase.ts`.
- [ ] **Langkah 3**: Buat file `firestore.rules` di root proyek.
- [ ] **Langkah 4**: Hubungkan `subscribeToSessionAttendance` ke `src/app/assistant/session/[id].tsx` menggunakan `useEffect` (jangan lupa panggil fungsi *unsubscribe* saat komponen unmount).
- [ ] **Langkah 5**: Hubungkan `submitAttendanceToFirestore` ke form presensi di `src/app/student/attendance/[id].tsx`.
- [ ] **Langkah 6**: Jalankan `npx tsc --noEmit` & `npx expo lint`.
- [ ] **Langkah 7**: Ajukan Pull Request ke `dev`.
