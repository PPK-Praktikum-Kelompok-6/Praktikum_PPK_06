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
  targetUserIds: string[]; // Kosong jika berdasarkan kelas, atau berisi UID spesifik (mis. pemohon izin)
  targetClassCode?: string; // Misal: "C1" untuk notifikasi sesi dibuka / jadwal berubah
  route: string; // Deep link Expo Router, misal: "/student/attendance/session-1" atau "/student/permit"
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
