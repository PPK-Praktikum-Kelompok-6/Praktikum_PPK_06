import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
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
        {/* Hero Header Peta Laboratorium Asisten */}
        <Card variant="hero" padding="lg" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTag}>
              <Icon name="map" size={14} color={Colors.textWhite} />
              <AppText variant="caption" weight="bold" color={Colors.textWhite}>
                MONITORING LABORATORIUM ASISTEN
              </AppText>
            </View>
            <Badge
              label={
                summaryCounts.openCount > 0
                  ? `${summaryCounts.openCount} Sesi Berlangsung`
                  : 'Siap Digunakan'
              }
              variant={summaryCounts.openCount > 0 ? 'open' : 'waiting'}
              showDot
            />
          </View>

          <AppText variant="h1" weight="bold" color={Colors.textWhite}>
            Peta & Aktivitas Lab
          </AppText>
          <AppText variant="caption" color={Colors.textWhiteMuted}>
            Pantau keterisian seluruh laboratorium Informatika, radius geofencing, serta sesi praktikum yang sedang berlangsung dan berikutnya.
          </AppText>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatPill}>
              <AppText variant="title" weight="bold" color={Colors.textWhite}>
                {labs.length}
              </AppText>
              <AppText variant="caption" color={Colors.textWhiteMuted}>
                Ruang Lab
              </AppText>
            </View>
            <View style={styles.heroStatPill}>
              <AppText variant="title" weight="bold" color={Colors.textWhite}>
                {summaryCounts.openCount}
              </AppText>
              <AppText variant="caption" color={Colors.textWhiteMuted}>
                Sesi OPEN
              </AppText>
            </View>
            <View style={styles.heroStatPill}>
              <AppText variant="title" weight="bold" color={Colors.textWhite}>
                {summaryCounts.upcomingCount}
              </AppText>
              <AppText variant="caption" color={Colors.textWhiteMuted}>
                Berikutnya
              </AppText>
            </View>
          </View>
        </Card>

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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  heroCard: {
    gap: Spacing.xs,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.glassOverlay,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.glassHighlight,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  heroStatPill: {
    flex: 1,
    backgroundColor: Colors.glassOverlay,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.midnightBorder,
  },
});
