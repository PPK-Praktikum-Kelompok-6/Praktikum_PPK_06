import Constants from 'expo-constants';
import * as Location from 'expo-location';
import type * as NotificationsType from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { DevicePermissionState } from '@/types/notification';

let cachedNotificationsModule: typeof NotificationsType | null | undefined;

/**
 * Memuat modul native `expo-notifications` secara aman (lazy-load).
 * Mengembalikan `null` pada Web, Expo Go Android (SDK 53+), atau apabila klien/APK lama belum memuat
 * modul native terkait sehingga aplikasi tidak crash dan beralih ke In-App Banner Fallback (SRS-S3-07).
 */
export function getExpoNotifications(): typeof NotificationsType | null {
  if (Platform.OS === 'web') {
    return null;
  }
  if (
    Platform.OS === 'android' &&
    Constants.executionEnvironment === 'storeClient'
  ) {
    return null;
  }
  if (cachedNotificationsModule !== undefined) {
    return cachedNotificationsModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedNotificationsModule = require('expo-notifications') as typeof NotificationsType;
  } catch {
    cachedNotificationsModule = null;
  }
  return cachedNotificationsModule;
}

/**
 * Meminta izin lokasi foreground + mengecek apakah layanan GPS perangkat aktif (SRS-S3-07).
 */
export async function ensureLocationPermission(): Promise<{
  granted: boolean;
  servicesEnabled: boolean;
  canAskAgain: boolean;
  message?: string;
}> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();

    if (perm.status !== 'granted' && perm.canAskAgain) {
      perm = await Location.requestForegroundPermissionsAsync();
    }

    const granted = perm.status === 'granted';
    const canAskAgain = perm.canAskAgain ?? true;

    if (!granted) {
      return {
        granted: false,
        servicesEnabled: false,
        canAskAgain,
        message: canAskAgain
          ? 'Izin akses lokasi ditolak. Berikan izin lokasi agar peta dapat menampilkan posisi Anda secara real-time.'
          : 'Izin akses lokasi ditolak secara permanen. Buka Pengaturan Perangkat untuk mengaktifkan izin Lokasi.',
      };
    }

    let servicesEnabled = true;
    try {
      servicesEnabled = await Location.hasServicesEnabledAsync();
    } catch {
      servicesEnabled = true;
    }

    if (!servicesEnabled) {
      return {
        granted: true,
        servicesEnabled: false,
        canAskAgain: true,
        message:
          'Layanan lokasi (GPS) pada perangkat Anda sedang tidak aktif. Nyalakan GPS perangkat lalu ketuk Coba Lagi.',
      };
    }

    return {
      granted: true,
      servicesEnabled: true,
      canAskAgain: true,
    };
  } catch {
    return {
      granted: false,
      servicesEnabled: false,
      canAskAgain: true,
      message:
        'Tidak dapat memeriksa layanan lokasi perangkat saat ini. Pastikan GPS aktif dan browser/perangkat mengizinkan akses lokasi.',
    };
  }
}

/**
 * Meminta izin push notification & menangani jika pengguna menolak (SRS-S3-07).
 */
export async function ensureNotificationPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}> {
  try {
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'Notification' in globalThis) {
        const webNotif = (globalThis as any).Notification;
        if (webNotif.permission === 'granted') {
          return { granted: true, canAskAgain: true };
        }
        if (webNotif.permission !== 'denied') {
          const res = await webNotif.requestPermission();
          if (res === 'granted') {
            return { granted: true, canAskAgain: true };
          }
        }
        return {
          granted: false,
          canAskAgain: false,
          message:
            'Notifikasi browser tidak diizinkan. Pemberitahuan kegiatan praktikum tetap aktif melalui banner di dalam aplikasi.',
        };
      }
      return {
        granted: false,
        canAskAgain: false,
        message:
          'Notifikasi sistem tidak didukung di lingkungan web ini. Banner notifikasi dalam aplikasi tetap aktif.',
      };
    }

    const Notifications = getExpoNotifications();
    if (!Notifications) {
      return {
        granted: false,
        canAskAgain: false,
        message:
          'Modul push notification native tidak tersedia pada klien ini. Sistem otomatis mengaktifkan pemberitahuan real-time melalui banner di dalam aplikasi.',
      };
    }

    let perm = await Notifications.getPermissionsAsync();
    const isInitiallyGranted =
      perm.granted ||
      perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!isInitiallyGranted && perm.canAskAgain !== false) {
      perm = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
    }

    const granted =
      Boolean(perm.granted) ||
      perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    const canAskAgain = perm.canAskAgain ?? true;

    if (!granted) {
      return {
        granted: false,
        canAskAgain,
        message:
          'Izin push notification perangkat ditolak. Anda tetap akan menerima pemberitahuan real-time melalui banner di dalam aplikasi.',
      };
    }

    return {
      granted: true,
      canAskAgain: true,
    };
  } catch {
    return {
      granted: false,
      canAskAgain: true,
      message:
        'Gagal meminta izin notifikasi perangkat. Sistem otomatis mengaktifkan mode notifikasi dalam aplikasi (in-app fallback).',
    };
  }
}

/**
 * Mengambil ringkasan seluruh status izin perangkat sekaligus (SRS-S3-07).
 */
export async function getDevicePermissionState(): Promise<DevicePermissionState> {
  let locationGranted = false;
  let locationServicesEnabled = true;
  let notificationGranted = false;
  const errors: string[] = [];

  try {
    const locPerm = await Location.getForegroundPermissionsAsync();
    locationGranted = locPerm.status === 'granted';
    if (!locationGranted) {
      errors.push('Izin akses lokasi belum diberikan.');
    } else {
      try {
        locationServicesEnabled = await Location.hasServicesEnabledAsync();
        if (!locationServicesEnabled) {
          errors.push('Layanan lokasi (GPS) perangkat sedang mati.');
        }
      } catch {
        locationServicesEnabled = true;
      }
    }
  } catch {
    locationGranted = false;
    locationServicesEnabled = false;
    errors.push('Layanan lokasi perangkat tidak dapat diakses.');
  }

  try {
    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && 'Notification' in globalThis) {
        notificationGranted =
          (globalThis as any).Notification.permission === 'granted';
      }
    } else {
      const Notifications = getExpoNotifications();
      if (Notifications) {
        const notifPerm = await Notifications.getPermissionsAsync();
        notificationGranted =
          Boolean(notifPerm.granted) ||
          notifPerm.ios?.status ===
            Notifications.IosAuthorizationStatus.PROVISIONAL;
      } else {
        notificationGranted = false;
      }
    }
  } catch {
    notificationGranted = false;
  }

  return {
    locationGranted,
    locationServicesEnabled,
    notificationGranted,
    errorMessage: errors.length > 0 ? errors.join(' ') : undefined,
  };
}

/**
 * Membuka halaman pengaturan izin aplikasi di sistem operasi (iOS / Android).
 */
export async function openDevicePermissionSettings(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}
