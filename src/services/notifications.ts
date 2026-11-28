import Constants from 'expo-constants';
import * as Device from 'expo-device';
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { Platform } from 'react-native';

import { Colors } from '@/constants/theme';
import { PracticalSession } from '@/types/attendance';
import { AppNotification, NotificationEventType } from '@/types/notification';
import { PermitRequest } from '@/types/permit';
import { db, isFirebaseConfigured } from './firebase';
import {
  ensureNotificationPermission,
  getExpoNotifications,
} from './permissions';

/**
 * Konfigurasi Android Notification Channels sesuai kategori peristiwa praktikum
 * (Adaptasi Silversky Technology Rich Push Notifications Step 3).
 */
export const NOTIFICATION_CHANNELS = {
  SESSION_OPENED: 'session-opened',
  SCHEDULE_UPDATES: 'schedule-updates',
  PERMIT_DECISIONS: 'permit-decisions',
  FINES_PAYMENTS: 'fines-payments',
} as const;

let foregroundHandlerConfigured = false;
let localNotificationsStore: AppNotification[] = [];
const localNotifListeners = new Set<() => void>();
const deliveredOnDeviceIds = new Set<string>();
const scheduledSessionReminders = new Map<
  string,
  { scheduleKey: string; identifier: string }
>();

function notifyLocalListeners() {
  localNotifListeners.forEach((listener) => listener());
}

function sanitizeNotificationPayload(
  notif: AppNotification
): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(notif)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

function getChannelIdForEvent(type: NotificationEventType): string {
  switch (type) {
    case 'SESSION_OPENED':
      return NOTIFICATION_CHANNELS.SESSION_OPENED;
    case 'SCHEDULE_CHANGED':
      return NOTIFICATION_CHANNELS.SCHEDULE_UPDATES;
    case 'PERMIT_APPROVED':
    case 'PERMIT_REJECTED':
      return NOTIFICATION_CHANNELS.PERMIT_DECISIONS;
    case 'FINE_CREATED':
    case 'PAYMENT_SUCCESS':
    case 'PAYMENT_FAILED':
      return NOTIFICATION_CHANNELS.FINES_PAYMENTS;
  }
}

/**
 * Mengonfigurasi handler agar notifikasi tetap muncul sebagai heads-up alert ketika aplikasi di Foreground
 * (Silversky Technology Step 5).
 */
export function configureForegroundNotificationHandler(): void {
  if (foregroundHandlerConfigured || Platform.OS === 'web') return;
  const Notifications = getExpoNotifications();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    foregroundHandlerConfigured = true;
  } catch (err) {
    console.warn('Tidak dapat mengatur foreground notification handler:', err);
  }
}

/**
 * Menentukan secara murni apakah suatu event notifikasi ditujukan kepada pengguna tertentu (SRS-S3-06).
 * - Jika `targetUserIds` berisi UID: hanya pengguna di dalam daftar tersebut yang berhak menerima.
 * - Jika `targetUserIds` kosong dan `targetClassCode` terisi: hanya pengguna yang terdaftar pada kelas tersebut yang menerima.
 */
export function isNotificationTargetedToUser(
  notif: AppNotification,
  userId: string,
  enrolledClasses: string[]
): boolean {
  if (!userId) return false;

  if (Array.isArray(notif.targetUserIds) && notif.targetUserIds.length > 0) {
    return notif.targetUserIds.includes(userId);
  }

  if (notif.targetClassCode) {
    const targetCode = notif.targetClassCode.trim().toUpperCase();
    const userClasses = (enrolledClasses || []).map((c) =>
      c.trim().toUpperCase()
    );
    return userClasses.includes(targetCode);
  }

  return false;
}

/**
 * Setup Android Notification Channels + foreground handler + simpan token user ke Firestore
 * (Silversky Technology Step 1, 2, 3).
 */
export async function initializeNotificationsForUser(
  userId: string
): Promise<string | null> {
  configureForegroundNotificationHandler();

  const Notifications = getExpoNotifications();
  if (!Notifications) {
    return null;
  }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(
        NOTIFICATION_CHANNELS.SESSION_OPENED,
        {
          name: 'Pembukaan Sesi Praktikum',
          description:
            'Pemberitahuan segera saat asisten membuka sesi presensi praktikum',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 200, 250],
          lightColor: Colors.primary,
          enableVibrate: true,
        }
      );

      await Notifications.setNotificationChannelAsync(
        NOTIFICATION_CHANNELS.SCHEDULE_UPDATES,
        {
          name: 'Perubahan Jadwal Praktikum',
          description:
            'Pemberitahuan ketika jadwal, waktu, atau ruangan praktikum berubah',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 200, 150, 200],
          lightColor: Colors.warning,
          enableVibrate: true,
        }
      );

      await Notifications.setNotificationChannelAsync(
        NOTIFICATION_CHANNELS.PERMIT_DECISIONS,
        {
          name: 'Status Permohonan Izin',
          description:
            'Pemberitahuan keputusan asisten atas pengajuan izin praktikum Anda',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250],
          lightColor: Colors.success,
          enableVibrate: true,
        }
      );
    } catch (err) {
      console.warn('Gagal menyiapkan Android Notification Channels:', err);
    }
  }

  const permResult = await ensureNotificationPermission();
  if (!permResult.granted || Platform.OS === 'web') {
    return null;
  }

  let pushToken: string | null = null;
  const isExpoGoAndroid =
    Platform.OS === 'android' && Constants.executionEnvironment === 'storeClient';

  try {
    if (Device.isDevice && !isExpoGoAndroid) {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (projectId) {
        const tokenResp = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        pushToken = tokenResp.data;
      }
    }
  } catch {
    // Pada Expo Go Android SDK 53+ atau simulator, remote token bisa dibatasi;
    // pengiriman real-time tetap dijamin via Firestore listener + local notification trigger.
    pushToken = null;
  }

  if (pushToken && userId && isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        pushToken,
        pushTokenUpdatedAt: new Date().toISOString(),
      });
    } catch {
      // Fallback jika dokumen user belum ada di Firestore
    }
  }

  return pushToken;
}

/**
 * Memicu notifikasi sistem operasi (OS Notification tray / heads-up) apabila izin diberikan.
 */
async function triggerDeviceOsNotification(
  notif: AppNotification
): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof globalThis !== 'undefined' && 'Notification' in globalThis) {
      const WebNotif = (globalThis as any).Notification;
      if (WebNotif.permission === 'granted') {
        try {
          new WebNotif(notif.title, { body: notif.body });
        } catch {
          // Ignore web notification constructor errors
        }
      }
    }
    return;
  }

  const Notifications = getExpoNotifications();
  if (!Notifications) return;

  try {
    const perm = await Notifications.getPermissionsAsync();
    const granted =
      Boolean(perm.granted) ||
      perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted) return;

    const channelId = getChannelIdForEvent(notif.type);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notif.title,
        body: notif.body,
        sound: 'default',
        color: Colors.primary,
        data: {
          notificationId: notif.id,
          type: notif.type,
          route: notif.route,
          sessionId: notif.sessionId,
          permitId: notif.permitId,
        },
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Gagal memicu notifikasi OS lokal:', err);
  }
}

/**
 * Mencatat event notifikasi terarah ke koleksi Firestore `notifications` dan memori lokal.
 */
export async function dispatchTargetedNotification(
  payload: Omit<AppNotification, 'id' | 'createdAt'>
): Promise<AppNotification> {
  const newNotif: AppNotification = {
    ...payload,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    readBy: payload.readBy ?? [],
  };

  if (isFirebaseConfigured) {
    try {
      await setDoc(
        doc(db, 'notifications', newNotif.id),
        sanitizeNotificationPayload(newNotif)
      );
    } catch (err) {
      console.warn('Gagal menyimpan notifikasi ke Firestore:', err);
    }
  }

  localNotificationsStore = [
    newNotif,
    ...localNotificationsStore.filter((n) => n.id !== newNotif.id),
  ];
  notifyLocalListeners();
  return newNotif;
}

/**
 * 1. Mengirim notifikasi terarah ketika asisten membuka sesi praktikum (hanya ke praktikan kelas terkait) (SRS-S3-06).
 */
export async function notifySessionOpened(
  session: PracticalSession
): Promise<void> {
  const classCode = (session.classCode || '').trim().toUpperCase();
  if (!classCode) return;

  await dispatchTargetedNotification({
    type: 'SESSION_OPENED',
    title: `Sesi Presensi Dibuka • Kelas ${classCode}`,
    body: `${session.courseName} di ${session.room} (${session.timeSlot}) telah dibuka. Segera lakukan presensi!`,
    targetUserIds: [],
    targetClassCode: classCode,
    route: `/student/attendance/${session.id}`,
    sessionId: session.id,
  });
}

/**
 * 2. Mengirim notifikasi terarah ketika jadwal praktikum mengalami perubahan (SRS-S3-06).
 */
export async function notifyScheduleChanged(
  session: PracticalSession,
  changeSummary: string
): Promise<void> {
  const classCode = (session.classCode || '').trim().toUpperCase();
  if (!classCode) return;

  await dispatchTargetedNotification({
    type: 'SCHEDULE_CHANGED',
    title: `Perubahan Jadwal • ${session.courseName} (${classCode})`,
    body:
      changeSummary.trim() ||
      `Jadwal praktikum Kelas ${classCode} diperbarui menjadi ${session.date} pukul ${session.timeSlot} di ${session.room}.`,
    targetUserIds: [],
    targetClassCode: classCode,
    route: `/student/attendance/${session.id}`,
    sessionId: session.id,
  });
}

/**
 * 3. Mengirim notifikasi terarah hanya kepada praktikan pemilik permohonan izin setelah direview asisten (SRS-S3-06).
 */
export async function notifyPermitReviewed(
  permit: PermitRequest,
  decision: 'APPROVED' | 'REJECTED',
  decisionNote?: string
): Promise<void> {
  if (!permit.studentId) return;

  const isApproved = decision === 'APPROVED';
  const statusLabel = isApproved ? 'DISETUJUI' : 'DITOLAK';
  const noteSuffix = decisionNote?.trim()
    ? ` Catatan Asisten: "${decisionNote.trim()}"`
    : '';

  await dispatchTargetedNotification({
    type: isApproved ? 'PERMIT_APPROVED' : 'PERMIT_REJECTED',
    title: `Permohonan Izin ${statusLabel}`,
    body: `Pengajuan izin Anda untuk ${permit.courseName}${
      permit.classCode ? ` (Kelas ${permit.classCode})` : ''
    } telah ${isApproved ? 'disetujui' : 'ditolak'}.${noteSuffix}`,
    targetUserIds: [permit.studentId],
    targetClassCode: permit.classCode,
    route: '/student/permit',
    sessionId: permit.sessionId,
    permitId: permit.id,
  });
}

/**
 * 4. Mengirim notifikasi terarah ketika tagihan denda keterlambatan baru dibuat (SRS-S4-06).
 */
export async function notifyFineCreated(params: {
  fineId: string;
  studentId: string;
  sessionId: string;
  sessionName: string;
  classCode: string;
  lateMinutes: number;
  amount: number;
}): Promise<void> {
  if (!params.studentId) return;

  const formattedAmount = `Rp ${params.amount.toLocaleString('id-ID')}`;
  await dispatchTargetedNotification({
    type: 'FINE_CREATED',
    title: 'Tagihan Denda Keterlambatan',
    body: `Anda terlambat ${params.lateMinutes} menit pada ${params.sessionName} (${params.classCode}). Tagihan denda sebesar ${formattedAmount} telah diterbitkan.`,
    targetUserIds: [params.studentId],
    targetClassCode: params.classCode,
    route: '/student/fines',
    sessionId: params.sessionId,
    fineId: params.fineId,
  });
}

/**
 * 5. Mengirim notifikasi terarah hasil verifikasi pembayaran dari webhook Midtrans (SRS-S4-06).
 */
export async function notifyPaymentResult(params: {
  fineId: string;
  paymentId: string;
  studentId: string;
  sessionId: string;
  sessionName: string;
  amount: number;
  status: 'success' | 'failed';
}): Promise<void> {
  if (!params.studentId) return;

  const formattedAmount = `Rp ${params.amount.toLocaleString('id-ID')}`;
  const isSuccess = params.status === 'success';

  await dispatchTargetedNotification({
    type: isSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
    title: isSuccess
      ? 'Pembayaran Denda Berhasil'
      : 'Pembayaran Denda Gagal / Kedaluwarsa',
    body: isSuccess
      ? `Pembayaran denda ${params.sessionName} sebesar ${formattedAmount} telah berhasil diverifikasi.`
      : `Pembayaran denda ${params.sessionName} sebesar ${formattedAmount} gagal atau kedaluwarsa. Silakan coba bayar ulang.`,
    targetUserIds: [params.studentId],
    route: isSuccess ? '/student/fines' : `/student/payment/${params.fineId}`,
    sessionId: params.sessionId,
    fineId: params.fineId,
    paymentId: params.paymentId,
  });
}

/**
 * Menandai notifikasi sebagai telah dibaca oleh pengguna tertentu.
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<void> {
  if (!notificationId || !userId) return;

  localNotificationsStore = localNotificationsStore.map((n) =>
    n.id === notificationId
      ? {
          ...n,
          readBy: Array.from(new Set([...(n.readBy || []), userId])),
        }
      : n
  );
  notifyLocalListeners();

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        readBy: arrayUnion(userId),
      });
    } catch {
      // Abaikan jika offline
    }
  }
}

/**
 * Menandai seluruh daftar notifikasi milik pengguna sebagai telah dibaca sekaligus
 * dan mereset angka badge ikon aplikasi menjadi 0.
 */
export async function markAllNotificationsRead(
  notificationIds: string[],
  userId: string
): Promise<void> {
  if (!userId || notificationIds.length === 0) return;

  const idSet = new Set(notificationIds);
  localNotificationsStore = localNotificationsStore.map((n) =>
    idSet.has(n.id)
      ? {
          ...n,
          readBy: Array.from(new Set([...(n.readBy || []), userId])),
        }
      : n
  );
  notifyLocalListeners();

  void syncAppBadgeCount(0);

  if (isFirebaseConfigured) {
    for (const id of notificationIds) {
      try {
        await updateDoc(doc(db, 'notifications', id), {
          readBy: arrayUnion(userId),
        });
      } catch {
        // Abaikan jika offline
      }
    }
  }
}

/**
 * Menyinkronkan angka badge pada ikon aplikasi di perangkat (iOS/Android).
 */
export async function syncAppBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'web') return;
  const Notifications = getExpoNotifications();
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    // Abaikan jika launcher tidak mendukung badge count
  }
}

function parseSessionStartTimestamp(
  dateStr: string,
  timeSlot: string
): number | null {
  const dateMatch = (dateStr || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  const timeMatch = (timeSlot || '').trim().match(/(\d{1,2})[.:](\d{2})/);
  if (!dateMatch || !timeMatch) return null;

  const year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10) - 1;
  const day = parseInt(dateMatch[3], 10);
  const hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);

  const dt = new Date(year, month, day, hour, minute, 0, 0);
  const ms = dt.getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Menjadwalkan pengingat lokal otomatis (Local Scheduled Reminder) 15 menit sebelum
 * sesi praktikum (`NOT_STARTED`) dimulai bagi praktikan kelas terkait.
 * Apabila jadwal berubah, pengingat lama otomatis dibatalkan dan dijadwalkan ulang.
 */
export async function scheduleUpcomingSessionReminders(
  sessions: PracticalSession[],
  enrolledClasses: string[]
): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const Notifications = getExpoNotifications();
  if (!Notifications) return 0;

  try {
    const perm = await Notifications.getPermissionsAsync();
    const granted =
      Boolean(perm.granted) ||
      perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted) return 0;
  } catch {
    return 0;
  }

  const normalizedClasses = (enrolledClasses || []).map((c) =>
    c.trim().toUpperCase()
  );
  if (normalizedClasses.length === 0) return 0;

  const nowMs = Date.now();
  const REMINDER_LEAD_MS = 15 * 60 * 1000;
  let activeReminderCount = 0;

  for (const session of sessions) {
    const classCode = (session.classCode || '').trim().toUpperCase();
    if (!normalizedClasses.includes(classCode)) continue;

    const existing = scheduledSessionReminders.get(session.id);

    if (session.status !== 'NOT_STARTED') {
      if (existing) {
        try {
          await Notifications.cancelScheduledNotificationAsync(existing.identifier);
        } catch {}
        scheduledSessionReminders.delete(session.id);
      }
      continue;
    }

    const startMs = parseSessionStartTimestamp(session.date, session.timeSlot);
    if (!startMs) continue;

    const triggerMs = startMs - REMINDER_LEAD_MS;
    if (triggerMs <= nowMs) {
      continue;
    }

    const scheduleKey = `${session.date}|${session.timeSlot}|${session.room}`;
    if (existing && existing.scheduleKey === scheduleKey) {
      activeReminderCount += 1;
      continue;
    }

    if (existing) {
      try {
        await Notifications.cancelScheduledNotificationAsync(existing.identifier);
      } catch {}
      scheduledSessionReminders.delete(session.id);
    }

    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Pengingat Praktikum 15 Menit Lagi • Kelas ${classCode}`,
          body: `${session.courseName} akan dimulai pukul ${session.timeSlot} di ${session.room}. Pastikan Anda sudah berada di area radius laboratorium.`,
          sound: 'default',
          color: Colors.primary,
          data: {
            type: 'SCHEDULE_CHANGED',
            route: `/student/attendance/${session.id}`,
            sessionId: session.id,
          },
          ...(Platform.OS === 'android'
            ? { channelId: NOTIFICATION_CHANNELS.SCHEDULE_UPDATES }
            : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(triggerMs),
        },
      });

      scheduledSessionReminders.set(session.id, {
        scheduleKey,
        identifier,
      });
      activeReminderCount += 1;
    } catch {
      // Abaikan jika OS menolak penjadwalan alarm
    }
  }

  return activeReminderCount;
}

/**
 * Berlangganan daftar seluruh riwayat notifikasi terarah milik pengguna aktif
 * beserta jumlah notifikasi yang belum dibaca (otomatis menyinkronkan badge ikon aplikasi).
 */
export function subscribeUserNotificationHistory(
  userId: string,
  enrolledClasses: string[],
  onUpdate: (notifications: AppNotification[], unreadCount: number) => void
): () => void {
  if (!userId) {
    onUpdate([], 0);
    return () => {};
  }

  const emitHistory = () => {
    const targeted = localNotificationsStore
      .filter((n) => isNotificationTargetedToUser(n, userId, enrolledClasses))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const unreadCount = targeted.filter(
      (n) => !(n.readBy || []).includes(userId)
    ).length;

    void syncAppBadgeCount(unreadCount);
    onUpdate(targeted, unreadCount);
  };

  emitHistory();
  localNotifListeners.add(emitHistory);

  let unsubFirestore: (() => void) | null = null;
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'notifications'));
      unsubFirestore = onSnapshot(
        q,
        (snap) => {
          const remoteList: AppNotification[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<AppNotification, 'id'>),
          }));
          const byId = new Map<string, AppNotification>();
          localNotificationsStore.forEach((loc) => byId.set(loc.id, loc));
          remoteList.forEach((rem) => byId.set(rem.id, rem));
          localNotificationsStore = Array.from(byId.values());
          emitHistory();
        },
        () => {
          emitHistory();
        }
      );
    } catch {
      // Fallback lokal
    }
  }

  return () => {
    localNotifListeners.delete(emitHistory);
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}

/**
 * Listener real-time koleksi Firestore `notifications` untuk pengguna aktif.
 * Otomatis memicu local/push notification perangkat (jika izin aktif) atau in-app banner (jika izin ditolak).
 */
export function subscribeUserNotifications(
  userId: string,
  enrolledClasses: string[],
  onNotificationReceived: (notif: AppNotification) => void
): () => void {
  if (!userId) return () => {};

  const subscriptionStartedAt = Date.now() - 8000;
  let initialSnapshotHandled = false;

  const processIncomingList = (allNotifs: AppNotification[]) => {
    const targeted = allNotifs
      .filter((n) => isNotificationTargetedToUser(n, userId, enrolledClasses))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    for (const notif of targeted) {
      const alreadyRead = (notif.readBy || []).includes(userId);
      if (deliveredOnDeviceIds.has(notif.id)) {
        continue;
      }

      const createdMs = new Date(notif.createdAt).getTime();
      const isRecentEvent =
        !Number.isNaN(createdMs) && createdMs >= subscriptionStartedAt;

      if (!initialSnapshotHandled && !isRecentEvent) {
        // Tandai notifikasi historis lama sebagai sudah lewat agar tidak membanjiri saat buka aplikasi
        deliveredOnDeviceIds.add(notif.id);
        continue;
      }

      if (alreadyRead) {
        deliveredOnDeviceIds.add(notif.id);
        continue;
      }

      deliveredOnDeviceIds.add(notif.id);
      void triggerDeviceOsNotification(notif);
      onNotificationReceived(notif);
    }

    initialSnapshotHandled = true;
  };

  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'notifications'));
      const unsubFirestore = onSnapshot(
        q,
        (snap) => {
          const remoteList: AppNotification[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<AppNotification, 'id'>),
          }));

          const byId = new Map<string, AppNotification>();
          localNotificationsStore.forEach((loc) => byId.set(loc.id, loc));
          remoteList.forEach((rem) => byId.set(rem.id, rem));
          localNotificationsStore = Array.from(byId.values());

          processIncomingList(localNotificationsStore);
        },
        (err) => {
          console.warn('Real-time notifications listener error:', err);
          processIncomingList(localNotificationsStore);
        }
      );

      const localHandler = () => processIncomingList(localNotificationsStore);
      localNotifListeners.add(localHandler);

      return () => {
        unsubFirestore();
        localNotifListeners.delete(localHandler);
      };
    } catch (err) {
      console.warn('Could not setup notifications listener:', err);
    }
  }

  const localHandler = () => processIncomingList(localNotificationsStore);
  localHandler();
  localNotifListeners.add(localHandler);
  return () => {
    localNotifListeners.delete(localHandler);
  };
}
