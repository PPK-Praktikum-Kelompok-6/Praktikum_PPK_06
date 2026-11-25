import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { PracticalSession } from '@/types/attendance';
import { Coordinates, LabLocation } from '@/types/lab';
import { calculateDistanceMeters, isRoomMatchingLab } from '@/utils/geo';

// Resolusi komponen native react-native-maps hanya pada perangkat iOS/Android
// untuk menjaga kompatibilitas Web Preview (Expo Web Fallback — SRS-S3-04).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NativeMaps = Platform.OS !== 'web' ? require('react-native-maps') : null;

export interface InteractiveLabMapProps {
  labs: LabLocation[];
  sessions: PracticalSession[];
  selectedLab: LabLocation | null;
  onSelectLab: (lab: LabLocation) => void;
  locationGranted: boolean;
  locationServicesEnabled: boolean;
  onUserLocationChange?: (coords: Coordinates | null) => void;
  onLocationError?: (message: string | null) => void;
}

const DEFAULT_CAMPUS_CENTER: Coordinates = {
  latitude: -7.04841,
  longitude: 110.44104,
};

function getLabSessionStats(lab: LabLocation, sessions: PracticalSession[]) {
  const matched = sessions.filter((s) =>
    isRoomMatchingLab(s.room, lab, s.labId)
  );

  const openCount = matched.filter((s) => s.status === 'OPEN').length;
  const upcomingCount = matched.filter((s) => s.status === 'NOT_STARTED').length;

  return { openCount, upcomingCount, total: matched.length };
}

/**
 * Komponen Peta Laboratorium Interaktif + Live User Marker (SRS-S3-04 & SRS-S3-05).
 * - Menampilkan marker seluruh laboratorium di lingkungan Informatika dari Cloud Firestore.
 * - Menampilkan Circle visualisasi radius geofencing masing-masing laboratorium.
 * - Menampilkan marker posisi perangkat pengguna secara live menggunakan `Location.watchPositionAsync()`
 *   yang otomatis bergerak mengikuti perpindahan pengguna dan dibersihkan saat halaman ditutup.
 * - Menyediakan interactive spatial radar fallback pada Web agar `npx expo start --web` berjalan lancar.
 */
export function InteractiveLabMap({
  labs,
  sessions,
  selectedLab,
  onSelectLab,
  locationGranted,
  locationServicesEnabled,
  onUserLocationChange,
  onLocationError,
}: InteractiveLabMapProps) {
  const mapRef = useRef<any>(null);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [isTrackingLive, setIsTrackingLive] = useState(false);

  // Live Location Tracking via Location.watchPositionAsync (SRS-S3-04)
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    async function startLiveLocationWatch() {
      if (!locationGranted || !locationServicesEnabled) {
        if (isMounted) {
          setIsTrackingLive(false);
        }
        return;
      }

      try {
        // Ambil titik awal secara cepat terlebih dahulu
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (isMounted && lastKnown?.coords) {
          const initialCoords: Coordinates = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          };
          setUserCoords(initialCoords);
          setAccuracyMeters(
            lastKnown.coords.accuracy
              ? Math.round(lastKnown.coords.accuracy)
              : null
          );
          onUserLocationChange?.(initialCoords);
          onLocationError?.(null);
        }
      } catch {
        // Lanjut ke watchPositionAsync
      }

      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2500,
            distanceInterval: 1,
          },
          (position) => {
            if (!isMounted) return;
            const nextCoords: Coordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setUserCoords(nextCoords);
            setAccuracyMeters(
              position.coords.accuracy
                ? Math.round(position.coords.accuracy)
                : null
            );
            setIsTrackingLive(true);
            onUserLocationChange?.(nextCoords);
            onLocationError?.(null);
          }
        );
      } catch {
        if (isMounted) {
          setIsTrackingLive(false);
          onLocationError?.(
            'Sinyal lokasi perangkat belum tersedia saat ini. Pastikan perangkat berada di area dengan sinyal GPS memadai.'
          );
        }
      }
    }

    startLiveLocationWatch();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [
    locationGranted,
    locationServicesEnabled,
    onUserLocationChange,
    onLocationError,
  ]);

  // Arahkan kamera peta ketika pengguna memilih laboratorium
  useEffect(() => {
    if (Platform.OS !== 'web' && mapRef.current && selectedLab) {
      try {
        mapRef.current.animateToRegion(
          {
            latitude: selectedLab.latitude,
            longitude: selectedLab.longitude,
            latitudeDelta: 0.0022,
            longitudeDelta: 0.0022,
          },
          450
        );
      } catch {
        // Ignore animation error
      }
    }
  }, [selectedLab]);

  const handleCenterOnCampus = () => {
    const target = selectedLab
      ? {
          latitude: selectedLab.latitude,
          longitude: selectedLab.longitude,
        }
      : DEFAULT_CAMPUS_CENTER;

    if (Platform.OS !== 'web' && mapRef.current) {
      try {
        mapRef.current.animateToRegion(
          {
            ...target,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
          },
          450
        );
      } catch {}
    }
  };

  const handleCenterOnUser = () => {
    if (!userCoords) return;
    if (Platform.OS !== 'web' && mapRef.current) {
      try {
        mapRef.current.animateToRegion(
          {
            latitude: userCoords.latitude,
            longitude: userCoords.longitude,
            latitudeDelta: 0.0022,
            longitudeDelta: 0.0022,
          },
          450
        );
      } catch {}
    }
  };

  // Hitung batas koordinat kampus untuk proyeksi peta interaktif pada Web Fallback
  const spatialBounds = useMemo(() => {
    const lats = labs.map((l) => l.latitude);
    const lngs = labs.map((l) => l.longitude);
    const minLat = lats.length > 0 ? Math.min(...lats) - 0.00035 : -7.0494;
    const maxLat = lats.length > 0 ? Math.max(...lats) + 0.00035 : -7.0477;
    const minLng = lngs.length > 0 ? Math.min(...lngs) - 0.00035 : 110.4404;
    const maxLng = lngs.length > 0 ? Math.max(...lngs) + 0.00035 : 110.4420;
    return { minLat, maxLat, minLng, maxLng };
  }, [labs]);

  const MapViewComponent = NativeMaps?.default;
  const MarkerComponent = NativeMaps?.Marker;
  const CircleComponent = NativeMaps?.Circle;

  return (
    <View style={styles.container}>
      {/* Baris Status Pelacakan GPS Live */}
      <View style={styles.gpsStatusBar}>
        <View style={styles.gpsStatusLeft}>
          <View
            style={[
              styles.livePulseDot,
              isTrackingLive && userCoords
                ? styles.pulseActive
                : styles.pulseInactive,
            ]}
          />
          <View style={styles.gpsTextGroup}>
            <AppText variant="caption" weight="bold" color={Colors.text}>
              {isTrackingLive && userCoords
                ? 'LIVE GPS TRACKING AKTIF'
                : locationGranted && locationServicesEnabled
                ? 'MENCARI TITIK GPS PERANGKAT...'
                : 'PELACAKAN POSISI NONAKTIF'}
            </AppText>
            <AppText variant="caption" color={Colors.textSecondary}>
              {userCoords
                ? `Posisi Saya: ${userCoords.latitude.toFixed(5)}, ${userCoords.longitude.toFixed(5)}${
                    accuracyMeters ? ` (±${accuracyMeters}m)` : ''
                  }`
                : 'Berikan izin lokasi & aktifkan GPS untuk menampilkan posisi perangkat'}
            </AppText>
          </View>
        </View>
      </View>

      {/* Kanvas Peta Utama (Native MapView atau Interactive Spatial Web Map) */}
      <Card variant="default" padding="none" style={styles.mapFrameCard}>
        {Platform.OS !== 'web' && MapViewComponent ? (
          <View style={styles.nativeMapContainer}>
            <MapViewComponent
              ref={mapRef}
              style={styles.nativeMap}
              initialRegion={{
                latitude:
                  selectedLab?.latitude ?? DEFAULT_CAMPUS_CENTER.latitude,
                longitude:
                  selectedLab?.longitude ?? DEFAULT_CAMPUS_CENTER.longitude,
                latitudeDelta: 0.0032,
                longitudeDelta: 0.0032,
              }}
              showsUserLocation={locationGranted && locationServicesEnabled}
              showsMyLocationButton={false}
              showsCompass
            >
              {/* Render Circle Radius & Marker setiap Laboratorium Informatika */}
              {labs.map((lab) => {
                const isSelected = selectedLab?.id === lab.id;
                const stats = getLabSessionStats(lab, sessions);
                const hasOngoing = stats.openCount > 0;

                const strokeColor = isSelected
                  ? Colors.primary
                  : hasOngoing
                  ? Colors.success
                  : Colors.warning;

                const fillColor = isSelected
                  ? 'rgba(37, 99, 235, 0.16)'
                  : hasOngoing
                  ? 'rgba(5, 150, 105, 0.16)'
                  : 'rgba(217, 119, 6, 0.12)';

                return (
                  <React.Fragment key={lab.id}>
                    {CircleComponent && (
                      <CircleComponent
                        center={{
                          latitude: lab.latitude,
                          longitude: lab.longitude,
                        }}
                        radius={lab.radiusMeters}
                        strokeColor={strokeColor}
                        fillColor={fillColor}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                    )}
                    {MarkerComponent && (
                      <MarkerComponent
                        coordinate={{
                          latitude: lab.latitude,
                          longitude: lab.longitude,
                        }}
                        title={lab.name}
                        description={
                          hasOngoing
                            ? `${stats.openCount} Praktikum Sedang Berlangsung • ${lab.building}`
                            : stats.upcomingCount > 0
                            ? `${stats.upcomingCount} Praktikum Berikutnya • ${lab.building}`
                            : lab.building
                        }
                        pinColor={
                          isSelected
                            ? Colors.primary
                            : hasOngoing
                            ? Colors.success
                            : Colors.warning
                        }
                        onPress={() => onSelectLab(lab)}
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {/* Marker Posisi Pengguna Live */}
              {MarkerComponent && userCoords && (
                <MarkerComponent
                  coordinate={userCoords}
                  title="Posisi Saya (Live GPS)"
                  description="Posisi perangkat Anda saat ini"
                  pinColor={Colors.info}
                />
              )}
            </MapViewComponent>

            {/* Tombol Kontrol Kamera Peta Mengambang */}
            <View style={styles.floatingControlsCol}>
              <Pressable
                style={styles.mapControlBtn}
                onPress={handleCenterOnCampus}
                accessibilityRole="button"
                accessibilityLabel="Pusatkan ke Laboratorium"
              >
                <Icon name="business" size={18} color={Colors.primary} />
                <AppText variant="caption" weight="bold" color={Colors.primary}>
                  Pusat Lab
                </AppText>
              </Pressable>

              {userCoords && (
                <Pressable
                  style={styles.mapControlBtn}
                  onPress={handleCenterOnUser}
                  accessibilityRole="button"
                  accessibilityLabel="Pusatkan ke Posisi Saya"
                >
                  <Icon name="locate" size={18} color={Colors.info} />
                  <AppText variant="caption" weight="bold" color={Colors.info}>
                    Posisi Saya
                  </AppText>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          /* Fallback Peta Spasial Interaktif untuk Web Preview */
          <View style={styles.webMapCanvas}>
            <View style={styles.webGridHeader}>
              <View style={styles.webBadgeRow}>
                <Icon name="map" size={16} color={Colors.primary} />
                <AppText variant="caption" weight="bold" color={Colors.primary}>
                  PETA SPASIAL LABORATORIUM INFORMATIKA (INTERACTIVE VIEW)
                </AppText>
              </View>
              <AppText variant="caption" color={Colors.textSecondary}>
                Ketuk marker laboratorium untuk memeriksa praktikum yang sedang berlangsung & berikutnya
              </AppText>
            </View>

            <View style={styles.spatialRadarArea}>
              {labs.map((lab) => {
                const isSelected = selectedLab?.id === lab.id;
                const stats = getLabSessionStats(lab, sessions);
                const hasOngoing = stats.openCount > 0;

                const latRatio =
                  (spatialBounds.maxLat - lab.latitude) /
                  Math.max(0.0001, spatialBounds.maxLat - spatialBounds.minLat);
                const lngRatio =
                  (lab.longitude - spatialBounds.minLng) /
                  Math.max(0.0001, spatialBounds.maxLng - spatialBounds.minLng);

                const topPercent = Math.min(82, Math.max(12, Math.round(latRatio * 75 + 10)));
                const leftPercent = Math.min(80, Math.max(8, Math.round(lngRatio * 72 + 10)));

                return (
                  <Pressable
                    key={lab.id}
                    onPress={() => onSelectLab(lab)}
                    style={[
                      styles.webMarkerNode,
                      {
                        top: `${topPercent}%` as any,
                        left: `${leftPercent}%` as any,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.webRadiusRing,
                        hasOngoing
                          ? styles.webRadiusOpen
                          : styles.webRadiusWaiting,
                        isSelected && styles.webRadiusSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.webMarkerPin,
                          hasOngoing
                            ? styles.pinOpen
                            : stats.upcomingCount > 0
                            ? styles.pinWaiting
                            : styles.pinIdle,
                          isSelected && styles.pinSelected,
                        ]}
                      >
                        <Icon
                          name="location"
                          size={16}
                          color={Colors.textWhite}
                        />
                      </View>
                    </View>
                    <View
                      style={[
                        styles.webMarkerLabelBox,
                        isSelected && styles.webMarkerLabelSelected,
                      ]}
                    >
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={isSelected ? Colors.textWhite : Colors.text}
                      >
                        {lab.name}
                      </AppText>
                      <AppText
                        variant="caption"
                        color={
                          isSelected
                            ? Colors.textWhiteMuted
                            : hasOngoing
                            ? Colors.success
                            : Colors.textMuted
                        }
                      >
                        {hasOngoing
                          ? `● ${stats.openCount} Sesi OPEN`
                          : stats.upcomingCount > 0
                          ? `● ${stats.upcomingCount} Berikutnya`
                          : `Radius ${lab.radiusMeters}m`}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}

              {/* Marker Posisi Perangkat Pengguna pada Peta Spasial Web */}
              {userCoords && (
                <View style={styles.webUserMarkerBadge}>
                  <Icon name="navigate-circle" size={18} color={Colors.info} />
                  <AppText variant="caption" weight="bold" color={Colors.info}>
                    Posisi Saya ({userCoords.latitude.toFixed(4)},{' '}
                    {userCoords.longitude.toFixed(4)})
                  </AppText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Legenda Status Marker Laboratorium */}
        <View style={styles.legendBar}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.pinOpen]} />
            <AppText variant="caption" color={Colors.textSecondary}>
              Praktikum Berlangsung (OPEN)
            </AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.pinWaiting]} />
            <AppText variant="caption" color={Colors.textSecondary}>
              Terjadwal Berikutnya
            </AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.pinUser]} />
            <AppText variant="caption" color={Colors.textSecondary}>
              Posisi Saya (Live)
            </AppText>
          </View>
        </View>
      </Card>

      {/* Daftar Chip Cepat Pemilihan Marker Laboratorium */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.labChipsRow}
      >
        {labs.map((lab) => {
          const isSelected = selectedLab?.id === lab.id;
          const stats = getLabSessionStats(lab, sessions);
          const dist = userCoords
            ? calculateDistanceMeters(userCoords, {
                latitude: lab.latitude,
                longitude: lab.longitude,
              })
            : null;

          return (
            <Pressable
              key={lab.id}
              onPress={() => onSelectLab(lab)}
              style={[styles.labChip, isSelected && styles.labChipSelected]}
            >
              <View
                style={[
                  styles.chipStatusDot,
                  stats.openCount > 0
                    ? styles.pinOpen
                    : stats.upcomingCount > 0
                    ? styles.pinWaiting
                    : styles.pinIdle,
                ]}
              />
              <View>
                <AppText
                  variant="caption"
                  weight="bold"
                  color={isSelected ? Colors.textWhite : Colors.text}
                >
                  {lab.name}
                </AppText>
                <AppText
                  variant="caption"
                  color={
                    isSelected ? Colors.textWhiteMuted : Colors.textSecondary
                  }
                >
                  {stats.openCount > 0
                    ? `${stats.openCount} Berlangsung`
                    : stats.upcomingCount > 0
                    ? `${stats.upcomingCount} Berikutnya`
                    : 'Kosong'}
                  {dist !== null ? ` • ${dist}m` : ''}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  gpsStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gpsStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  livePulseDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
  },
  pulseActive: {
    backgroundColor: Colors.success,
  },
  pulseInactive: {
    backgroundColor: Colors.textLight,
  },
  gpsTextGroup: {
    flex: 1,
  },
  mapFrameCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nativeMapContainer: {
    width: '100%',
    height: 310,
    position: 'relative',
  },
  nativeMap: {
    width: '100%',
    height: '100%',
  },
  floatingControlsCol: {
    position: 'absolute',
    right: Spacing.sm,
    top: Spacing.sm,
    gap: Spacing.xs,
  },
  mapControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.glassSurfaceStrong,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  webMapCanvas: {
    width: '100%',
    backgroundColor: Colors.primaryBg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  webGridHeader: {
    gap: 2,
  },
  webBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spatialRadarArea: {
    height: 260,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    position: 'relative',
    overflow: 'hidden',
  },
  webMarkerNode: {
    position: 'absolute',
    alignItems: 'center',
  },
  webRadiusRing: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  webRadiusOpen: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
  },
  webRadiusWaiting: {
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warningBorder,
  },
  webRadiusSelected: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  webMarkerPin: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  pinOpen: {
    backgroundColor: Colors.success,
  },
  pinWaiting: {
    backgroundColor: Colors.warning,
  },
  pinIdle: {
    backgroundColor: Colors.textMuted,
  },
  pinSelected: {
    backgroundColor: Colors.primary,
  },
  pinUser: {
    backgroundColor: Colors.info,
  },
  webMarkerLabelBox: {
    marginTop: 2,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Shadows.sm,
  },
  webMarkerLabelSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  webUserMarkerBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.infoBg,
    borderColor: Colors.infoBorder,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  legendBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: Radius.full,
  },
  labChipsRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  labChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  labChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  chipStatusDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
});
