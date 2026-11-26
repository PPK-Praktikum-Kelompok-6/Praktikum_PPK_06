import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { DevicePermissionState } from '@/types/notification';

export interface PermissionAlertCardProps {
  permissionState: DevicePermissionState;
  locationError?: string | null;
  isOffline?: boolean;
  isChecking?: boolean;
  onRetryLocation: () => void;
  onRequestNotification: () => void;
  onOpenSettings: () => void;
}

/**
 * Komponen kartu panduan & penanganan kondisi kegagalan izin akses perangkat (SRS-S3-07).
 * Menangani kondisi:
 * 1. Pengguna menolak izin akses lokasi
 * 2. Layanan lokasi (GPS) mati
 * 3. Lokasi perangkat belum diperoleh / gangguan sinyal
 * 4. Izin push notification ditolak (mengaktifkan in-app notification fallback)
 * 5. Gangguan koneksi jaringan
 */
export function PermissionAlertCard({
  permissionState,
  locationError,
  isOffline = false,
  isChecking = false,
  onRetryLocation,
  onRequestNotification,
  onOpenSettings,
}: PermissionAlertCardProps) {
  const {
    locationGranted,
    locationServicesEnabled,
    notificationGranted,
  } = permissionState;

  const hasLocationIssue =
    !locationGranted || !locationServicesEnabled || Boolean(locationError);

  if (!hasLocationIssue && notificationGranted && !isOffline) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      {/* 1. Gangguan Koneksi Jaringan */}
      {isOffline && (
        <Card variant="flat" padding="md" style={styles.warningCard}>
          <View style={styles.headerRow}>
            <View style={styles.warningIconBox}>
              <Icon name="cloud-offline-outline" size={20} color={Colors.warning} />
            </View>
            <View style={styles.textCol}>
              <AppText variant="body" weight="bold" color={Colors.warning}>
                Gangguan Koneksi Jaringan
              </AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                Menampilkan data laboratorium dari cache sampai koneksi pulih.
              </AppText>
            </View>
          </View>
        </Card>
      )}

      {/* 2. Izin Lokasi Ditolak / GPS Mati / Lokasi Belum Diperoleh */}
      {hasLocationIssue && (
        <Card variant="default" padding="md" style={styles.dangerCard}>
          <View style={styles.headerRow}>
            <View style={styles.dangerIconBox}>
              <Icon
                name={
                  !locationGranted
                    ? 'lock-closed-outline'
                    : !locationServicesEnabled
                    ? 'navigate-outline'
                    : 'location-outline'
                }
                size={20}
                color={Colors.danger}
              />
            </View>
            <View style={styles.textCol}>
              <AppText variant="body" weight="bold" color={Colors.danger}>
                {!locationGranted
                  ? 'Izin Lokasi Diperlukan'
                  : !locationServicesEnabled
                  ? 'Layanan GPS Perangkat Mati'
                  : 'Lokasi Belum Diperoleh'}
              </AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                {locationError ||
                  (!locationGranted
                    ? 'Izinkan lokasi agar posisi Anda muncul secara real-time di peta.'
                    : 'Aktifkan GPS untuk melacak jarak menuju laboratorium.')}
              </AppText>
            </View>
          </View>

          <View style={styles.actionRow}>
            <CustomButton
              title={!locationGranted ? 'Izinkan Lokasi' : 'Cek GPS'}
              variant="primary"
              size="sm"
              fullWidth={false}
              loading={isChecking}
              onPress={onRetryLocation}
              icon={
                <Icon name="refresh-outline" size={16} color={Colors.textWhite} />
              }
              style={styles.flexBtn}
            />
            {Platform.OS !== 'web' && (
              <CustomButton
                title="Pengaturan"
                variant="outline"
                size="sm"
                fullWidth={false}
                onPress={onOpenSettings}
                icon={
                  <Icon
                    name="settings-outline"
                    size={16}
                    color={Colors.primary}
                  />
                }
                style={styles.flexBtn}
              />
            )}
          </View>
        </Card>
      )}

      {/* 3. Izin Notifikasi Ditolak -> Informasi In-App Fallback */}
      {!notificationGranted && (
        <Card variant="flat" padding="md" style={styles.infoCard}>
          <View style={styles.headerRow}>
            <View style={styles.infoIconBox}>
              <Icon
                name="notifications-outline"
                size={20}
                color={Colors.info}
              />
            </View>
            <View style={styles.textCol}>
              <AppText variant="caption" weight="bold" color={Colors.info}>
                Notifikasi Perangkat Nonaktif
              </AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                Banner notifikasi di dalam aplikasi tetap aktif secara real-time.
              </AppText>
            </View>
          </View>
          <View style={styles.notifActionRow}>
            <CustomButton
              title="Aktifkan Notifikasi"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={onRequestNotification}
              icon={
                <Icon
                  name="notifications"
                  size={15}
                  color={Colors.primary}
                />
              }
            />
            {Platform.OS !== 'web' && (
              <CustomButton
                title="Pengaturan"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={onOpenSettings}
              />
            )}
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
  },
  dangerCard: {
    backgroundColor: Colors.dangerBg,
    borderColor: Colors.dangerBorder,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  warningCard: {
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warningBorder,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  infoCard: {
    backgroundColor: Colors.infoBg,
    borderColor: Colors.infoBorder,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  dangerIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
  },
  warningIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.warningBorder,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.infoBorder,
  },
  textCol: {
    flex: 1,
    gap: Spacing.xxs,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xxs,
  },
  notifActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  flexBtn: {
    flexGrow: 1,
    minWidth: 132,
  },
});
