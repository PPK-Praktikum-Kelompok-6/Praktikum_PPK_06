import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { InteractiveLabMap } from '@/features/maps/components/InteractiveLabMap';
import { LabActivitySheet } from '@/features/maps/components/LabActivitySheet';
import { PermissionAlertCard } from '@/features/maps/components/PermissionAlertCard';
import { DEFAULT_LABS, getLabs, subscribeLabs } from '@/services/labs';
import {
  ensureLocationPermission,
  ensureNotificationPermission,
  getDevicePermissionState,
  openDevicePermissionSettings,
} from '@/services/permissions';
import { subscribeAllSessions } from '@/services/sessions';
import { PracticalSession } from '@/types/attendance';
import { Coordinates, LabLocation } from '@/types/lab';
import { DevicePermissionState } from '@/types/notification';

export default function AssistantMapsScreen() {
  const [labs, setLabs] = useState<LabLocation[]>(DEFAULT_LABS);
  const [selectedLabId, setSelectedLabId] = useState<string>(
    DEFAULT_LABS[0]?.id || ''
  );
  const [sessions, setSessions] = useState<PracticalSession[]>([]);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);

  const [permissionState, setPermissionState] = useState<DevicePermissionState>(
    {
      locationGranted: false,
      locationServicesEnabled: true,
      notificationGranted: true,
    }
  );

  const requestAndRefreshPermissions = useCallback(async () => {
    setIsCheckingPermission(true);
    try {
      const locRes = await ensureLocationPermission();
      if (locRes.message && (!locRes.granted || !locRes.servicesEnabled)) {
        setLocationError(locRes.message);
      } else {
        setLocationError(null);
      }
      const fullState = await getDevicePermissionState();
      setPermissionState(fullState);
    } finally {
      setIsCheckingPermission(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function initPermissions() {
      const locRes = await ensureLocationPermission();
      const fullState = await getDevicePermissionState();
      if (!isMounted) return;
      if (locRes.message && (!locRes.granted || !locRes.servicesEnabled)) {
        setLocationError(locRes.message);
      } else {
        setLocationError(null);
      }
      setPermissionState(fullState);
    }
    void initPermissions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time listener lokasi laboratorium & seluruh sesi praktikum dari Cloud Firestore
  useEffect(() => {
    const unsubLabs = subscribeLabs((updatedLabs) => {
      setLabs(updatedLabs);
      setSelectedLabId((prev) => {
        if (prev && updatedLabs.some((l) => l.id === prev)) {
          return prev;
        }
        return updatedLabs[0]?.id || '';
      });
    });

    const unsubSessions = subscribeAllSessions((updatedSessions) => {
      setSessions(updatedSessions);
    });

    return () => {
      unsubLabs();
      unsubSessions();
    };
  }, []);

  const selectedLab = useMemo(
    () => labs.find((l) => l.id === selectedLabId) ?? labs[0] ?? null,
    [labs, selectedLabId]
  );

  const summaryCounts = useMemo(() => {
    const openCount = sessions.filter((s) => s.status === 'OPEN').length;
    const upcomingCount = sessions.filter(
      (s) => s.status === 'NOT_STARTED'
    ).length;
    return { openCount, upcomingCount };
  }, [sessions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([getLabs(), requestAndRefreshPermissions()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRequestNotification = async () => {
    await ensureNotificationPermission();
    const fullState = await getDevicePermissionState();
    setPermissionState(fullState);
  };

  const handleOpenSettings = async () => {
    await openDevicePermissionSettings();
  };

  return (
    <Screen
      withBottomNavPadding
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
    >
      <View style={styles.content}>
        {/* Header Ringkas Peta Laboratorium Asisten */}
        <View style={styles.headerBlock}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleCol}>
              <AppText variant="caption" weight="bold" color={Colors.textMuted}>
                MONITORING LAB ASISTEN
              </AppText>
              <AppText variant="h1" weight="bold" numberOfLines={1}>
                Peta & Aktivitas Lab
              </AppText>
            </View>
            <Badge
              label={
                summaryCounts.openCount > 0
                  ? `${summaryCounts.openCount} Aktif`
                  : 'Siap Digunakan'
              }
              variant={summaryCounts.openCount > 0 ? 'open' : 'waiting'}
              size="sm"
              showDot
            />
          </View>

          <View style={styles.statsStrip}>
            <View style={styles.statCell}>
              <AppText variant="title" weight="bold" color={Colors.primary}>
                {labs.length}
              </AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                Ruang Lab
              </AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <AppText variant="title" weight="bold" color={Colors.success}>
                {summaryCounts.openCount}
              </AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                Berlangsung
              </AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <AppText variant="title" weight="bold" color={Colors.warning}>
                {summaryCounts.upcomingCount}
              </AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                Berikutnya
              </AppText>
            </View>
          </View>
        </View>

        {/* Penanganan Izin Akses & Kondisi Perangkat (SRS-S3-07) */}
        <PermissionAlertCard
          permissionState={permissionState}
          locationError={locationError}
          isChecking={isCheckingPermission}
          onRetryLocation={requestAndRefreshPermissions}
          onRequestNotification={handleRequestNotification}
          onOpenSettings={handleOpenSettings}
        />

        {/* Peta Interaktif + Marker Lab + Circle Radius + Live User Marker (SRS-S3-04) */}
        <InteractiveLabMap
          labs={labs}
          sessions={sessions}
          selectedLab={selectedLab}
          onSelectLab={(lab) => setSelectedLabId(lab.id)}
          locationGranted={permissionState.locationGranted}
          locationServicesEnabled={permissionState.locationServicesEnabled}
          onUserLocationChange={setUserCoords}
          onLocationError={setLocationError}
        />

        {/* Informasi Aktivitas Laboratorium Real-Time (SRS-S3-05) */}
        <LabActivitySheet
          selectedLab={selectedLab}
          sessions={sessions}
          userCoords={userCoords}
          viewerRole="ASSISTANT"
          onPressSession={(session) =>
            router.push(`/assistant/session/${session.id}` as any)
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
  headerBlock: {
    gap: Spacing.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  headerTitleCol: {
    flex: 1,
    gap: Spacing.xxs,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: Spacing.xxs,
    backgroundColor: Colors.borderLight,
  },
});
