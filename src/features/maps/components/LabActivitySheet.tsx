import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { PracticalSession, UserRole } from '@/types/attendance';
import { Coordinates, LabLocation } from '@/types/lab';
import { formatDateIndonesian } from '@/utils/formatTime';
import { calculateDistanceMeters, isRoomMatchingLab } from '@/utils/geo';

export interface LabActivitySheetProps {
  selectedLab: LabLocation | null;
  sessions: PracticalSession[];
  userCoords: Coordinates | null;
  viewerRole: UserRole;
  enrolledClasses?: string[];
  onPressSession?: (session: PracticalSession) => void;
}

function isSessionMatchingLab(
  session: PracticalSession,
  lab: LabLocation
): boolean {
  return isRoomMatchingLab(session.room, lab, session.labId);
}

function parseStartTimeMinutes(timeSlot: string): number {
  const match = (timeSlot || '').match(/(\d{1,2})[.:](\d{2})/);
  if (!match) return 9999;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

/**
 * Menampilkan informasi aktivitas laboratorium secara real-time berdasarkan data Cloud Firestore (SRS-S3-05):
 * 1. Praktikum yang Sedang Berlangsung (`status === 'OPEN'`)
 * 2. Praktikum Berikutnya (`status === 'NOT_STARTED'`)
 * Mencakup: Nama Praktikum, Kelas, Waktu Pelaksanaan, dan Status Sesi.
 */
export function LabActivitySheet({
  selectedLab,
  sessions,
  userCoords,
  viewerRole,
  enrolledClasses = [],
  onPressSession,
}: LabActivitySheetProps) {
  const { ongoingSessions, upcomingSessions, closedCount } = useMemo(() => {
    if (!selectedLab) {
      return { ongoingSessions: [], upcomingSessions: [], closedCount: 0 };
    }

    const labSessions = sessions.filter((s) =>
      isSessionMatchingLab(s, selectedLab)
    );

    const ongoing = labSessions
      .filter((s) => s.status === 'OPEN')
      .sort((a, b) => {
        const dateCmp = (a.date || '').localeCompare(b.date || '');
        if (dateCmp !== 0) return dateCmp;
        return (
          parseStartTimeMinutes(a.timeSlot) - parseStartTimeMinutes(b.timeSlot)
        );
      });

    const upcoming = labSessions
      .filter((s) => s.status === 'NOT_STARTED')
      .sort((a, b) => {
        const dateCmp = (a.date || '').localeCompare(b.date || '');
        if (dateCmp !== 0) return dateCmp;
        return (
          parseStartTimeMinutes(a.timeSlot) - parseStartTimeMinutes(b.timeSlot)
        );
      });

    const closed = labSessions.filter((s) => s.status === 'CLOSED').length;

    return {
      ongoingSessions: ongoing,
      upcomingSessions: upcoming,
      closedCount: closed,
    };
  }, [selectedLab, sessions]);

  const distanceInfo = useMemo(() => {
    if (!selectedLab || !userCoords) return null;
    const meters = calculateDistanceMeters(userCoords, {
      latitude: selectedLab.latitude,
      longitude: selectedLab.longitude,
    });
    const inside = meters <= selectedLab.radiusMeters;
    return { meters, inside };
  }, [selectedLab, userCoords]);

  if (!selectedLab) {
    return (
      <Card variant="default" padding="lg">
        <View style={styles.emptyWrap}>
          <Icon name="map-outline" size={28} color={Colors.primary} />
          <AppText variant="title" weight="bold">
            Pilih Marker Laboratorium
          </AppText>
          <AppText
            variant="caption"
            color={Colors.textSecondary}
            style={styles.centerText}
          >
            Ketuk salah satu marker laboratorium pada peta di atas untuk melihat informasi praktikum yang sedang berlangsung dan praktikum berikutnya secara real-time.
          </AppText>
        </View>
      </Card>
    );
  }

  const normalizedEnrolled = enrolledClasses.map((c) =>
    c.trim().toUpperCase()
  );

  return (
    <View style={styles.container}>
      {/* Header Kartu Laboratorium Terpilih */}
      <Card variant="default" padding="lg" style={styles.labHeaderCard}>
        <View style={styles.labTitleRow}>
          <View style={styles.labIconCircle}>
            <Icon name="business" size={22} color={Colors.primary} />
          </View>
          <View style={styles.labTitleCol}>
            <View style={styles.badgeLine}>
              <AppText variant="label" color={Colors.primary} weight="bold">
                INFORMASI AKTIVITAS LABORATORIUM
              </AppText>
              {ongoingSessions.length > 0 ? (
                <Badge label="AKTIF BERLANGSUNG" variant="open" showDot />
              ) : upcomingSessions.length > 0 ? (
                <Badge label="TERJADWAL" variant="waiting" showDot />
              ) : (
                <Badge label="TIDAK ADA SESI AKTIF" variant="closed" />
              )}
            </View>
            <AppText variant="h2" weight="bold">
              {selectedLab.name}
            </AppText>
            <AppText variant="caption" color={Colors.textSecondary}>
              {selectedLab.building}
            </AppText>
          </View>
        </View>

        {/* Baris Koordinat, Radius & Jarak Pengguna */}
        <View style={styles.metaGrid}>
          <View style={styles.metaPill}>
            <Icon name="radio-button-on" size={14} color={Colors.primary} />
            <AppText variant="caption" color={Colors.textSecondary}>
              Radius Presensi:{' '}
              <AppText variant="caption" weight="bold" color={Colors.text}>
                {selectedLab.radiusMeters} m
              </AppText>
            </AppText>
          </View>

          <View style={styles.metaPill}>
            <Icon name="compass-outline" size={14} color={Colors.textMuted} />
            <AppText variant="caption" color={Colors.textSecondary}>
              {selectedLab.latitude.toFixed(5)}, {selectedLab.longitude.toFixed(5)}
            </AppText>
          </View>

          {distanceInfo ? (
            <View
              style={[
                styles.metaPill,
                distanceInfo.inside
                  ? styles.distanceInsidePill
                  : styles.distanceOutsidePill,
              ]}
            >
              <Icon
                name={
                  distanceInfo.inside
                    ? 'checkmark-circle'
                    : 'walk-outline'
                }
                size={14}
                color={distanceInfo.inside ? Colors.success : Colors.warning}
              />
              <AppText
                variant="caption"
                weight="bold"
                color={distanceInfo.inside ? Colors.success : Colors.warning}
              >
                Jarak Anda: {distanceInfo.meters} m (
                {distanceInfo.inside ? 'Dalam Radius Lab' : 'Di Luar Radius'})
              </AppText>
            </View>
          ) : (
            <View style={styles.metaPill}>
              <Icon name="locate-outline" size={14} color={Colors.textMuted} />
              <AppText variant="caption" color={Colors.textMuted}>
                Menunggu posisi GPS perangkat...
              </AppText>
            </View>
          )}
        </View>
      </Card>

      {/* BAGIAN 1: PRAKTIKUM SEDANG BERLANGSUNG (OPEN) */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <View style={[styles.statusDot, styles.dotOpen]} />
            <AppText variant="title" weight="bold">
              Praktikum Sedang Berlangsung
            </AppText>
          </View>
          <Badge
            label={`${ongoingSessions.length} Sesi`}
            variant={ongoingSessions.length > 0 ? 'open' : 'closed'}
          />
        </View>

        {ongoingSessions.length === 0 ? (
          <Card variant="flat" padding="md" style={styles.emptySectionCard}>
            <View style={styles.emptySectionRow}>
              <Icon
                name="pause-circle-outline"
                size={22}
                color={Colors.textMuted}
              />
              <View style={styles.emptySectionTextCol}>
                <AppText variant="body" weight="semibold" color={Colors.textSecondary}>
                  Tidak Ada Praktikum yang Sedang Berlangsung
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  Saat ini belum ada sesi berstatus DIBUKA (OPEN) di {selectedLab.name}. Begitu asisten membuka sesi, informasi akan langsung tampil di sini secara real-time.
                </AppText>
              </View>
            </View>
          </Card>
        ) : (
          ongoingSessions.map((session) => {
            const isMyClass =
              viewerRole === 'STUDENT' &&
              normalizedEnrolled.includes(
                (session.classCode || '').trim().toUpperCase()
              );

            return (
              <Card
                key={session.id}
                variant="default"
                padding="md"
                style={styles.ongoingSessionCard}
              >
                <View style={styles.sessionTopRow}>
                  <View style={styles.classBadgeRow}>
                    <View style={styles.classChipOpen}>
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={Colors.success}
                      >
                        KELAS {session.classCode}
                      </AppText>
                    </View>
                    {isMyClass && (
                      <View style={styles.myClassChip}>
                        <AppText
                          variant="caption"
                          weight="bold"
                          color={Colors.primary}
                        >
                          KELAS SAYA
                        </AppText>
                      </View>
                    )}
                  </View>
                  <Badge label="SEDANG BERLANGSUNG" variant="open" showDot />
                </View>

                <AppText variant="title" weight="bold" style={styles.courseTitle}>
                  {session.courseName}
                </AppText>

                <View style={styles.detailList}>
                  <View style={styles.detailRow}>
                    <Icon name="time-outline" size={16} color={Colors.success} />
                    <AppText variant="caption" color={Colors.text} weight="semibold">
                      Waktu Pelaksanaan: {formatDateIndonesian(session.date)} •{' '}
                      {session.timeSlot}
                    </AppText>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon
                      name="location-outline"
                      size={16}
                      color={Colors.textSecondary}
                    />
                    <AppText variant="caption" color={Colors.textSecondary}>
                      Ruangan: {session.room} ({session.deliveryMode || 'OFFLINE'})
                    </AppText>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon
                      name="people-outline"
                      size={16}
                      color={Colors.textSecondary}
                    />
                    <AppText variant="caption" color={Colors.textSecondary}>
                      Asisten: {session.assistantName}
                    </AppText>
                  </View>
                </View>

                {onPressSession && (
                  <View style={styles.cardActionWrap}>
                    <CustomButton
                      title={
                        viewerRole === 'ASSISTANT'
                          ? 'Kelola Sesi & Rekap Presensi'
                          : 'Buka Detail & Presensi Sesi'
                      }
                      variant="primary"
                      size="sm"
                      onPress={() => onPressSession(session)}
                      icon={
                        <Icon
                          name="arrow-forward"
                          size={16}
                          color={Colors.textWhite}
                        />
                      }
                    />
                  </View>
                )}
              </Card>
            );
          })
        )}
      </View>

      {/* BAGIAN 2: PRAKTIKUM BERIKUTNYA (NOT_STARTED) */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <View style={[styles.statusDot, styles.dotWaiting]} />
            <AppText variant="title" weight="bold">
              Praktikum Berikutnya
            </AppText>
          </View>
          <Badge
            label={`${upcomingSessions.length} Terjadwal`}
            variant="waiting"
          />
        </View>

        {upcomingSessions.length === 0 ? (
          <Card variant="flat" padding="md" style={styles.emptySectionCard}>
            <View style={styles.emptySectionRow}>
              <Icon
                name="calendar-clear-outline"
                size={22}
                color={Colors.textMuted}
              />
              <View style={styles.emptySectionTextCol}>
                <AppText variant="body" weight="semibold" color={Colors.textSecondary}>
                  Belum Ada Jadwal Praktikum Berikutnya
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  Tidak ada sesi berstatus BELUM DIMULAI di {selectedLab.name}.
                  {closedCount > 0
                    ? ` Terdapat ${closedCount} sesi yang telah selesai dilaksanakan.`
                    : ''}
                </AppText>
              </View>
            </View>
          </Card>
        ) : (
          upcomingSessions.map((session, index) => {
            const isNextImmediate = index === 0;
            const isMyClass =
              viewerRole === 'STUDENT' &&
              normalizedEnrolled.includes(
                (session.classCode || '').trim().toUpperCase()
              );

            return (
              <Pressable
                key={session.id}
                onPress={
                  onPressSession ? () => onPressSession(session) : undefined
                }
              >
                <Card
                  variant="default"
                  padding="md"
                  style={[
                    styles.upcomingSessionCard,
                    isNextImmediate && styles.nextImmediateCard,
                  ]}
                >
                  <View style={styles.sessionTopRow}>
                    <View style={styles.classBadgeRow}>
                      <View style={styles.classChipWaiting}>
                        <AppText
                          variant="caption"
                          weight="bold"
                          color={Colors.warning}
                        >
                          KELAS {session.classCode}
                        </AppText>
                      </View>
                      {isNextImmediate && (
                        <View style={styles.nextQueueChip}>
                          <AppText
                            variant="caption"
                            weight="bold"
                            color={Colors.primaryDark}
                          >
                            SESI BERIKUTNYA
                          </AppText>
                        </View>
                      )}
                      {isMyClass && (
                        <View style={styles.myClassChip}>
                          <AppText
                            variant="caption"
                            weight="bold"
                            color={Colors.primary}
                          >
                            KELAS SAYA
                          </AppText>
                        </View>
                      )}
                    </View>
                    <Badge label="BELUM DIMULAI" variant="waiting" showDot />
                  </View>

                  <AppText variant="title" weight="bold" style={styles.courseTitle}>
                    {session.courseName}
                  </AppText>

                  <View style={styles.detailList}>
                    <View style={styles.detailRow}>
                      <Icon
                        name="calendar-outline"
                        size={16}
                        color={Colors.warning}
                      />
                      <AppText variant="caption" color={Colors.text} weight="semibold">
                        Waktu Pelaksanaan: {formatDateIndonesian(session.date)} •{' '}
                        {session.timeSlot}
                      </AppText>
                    </View>
                    <View style={styles.detailRow}>
                      <Icon
                        name="people-outline"
                        size={16}
                        color={Colors.textSecondary}
                      />
                      <AppText variant="caption" color={Colors.textSecondary}>
                        Asisten: {session.assistantName}
                      </AppText>
                    </View>
                  </View>

                  {onPressSession && (
                    <View style={styles.cardActionWrap}>
                      <CustomButton
                        title={
                          viewerRole === 'ASSISTANT'
                            ? 'Buka Kontrol Sesi'
                            : 'Lihat Detail Jadwal'
                        }
                        variant="outline"
                        size="sm"
                        onPress={() => onPressSession(session)}
                        icon={
                          <Icon
                            name="chevron-forward"
                            size={16}
                            color={Colors.primary}
                          />
                        }
                      />
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  centerText: {
    textAlign: 'center',
  },
  labHeaderCard: {
    gap: Spacing.md,
    borderColor: Colors.primaryBorder,
    borderWidth: 1.2,
  },
  labTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  labIconCircle: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labTitleCol: {
    flex: 1,
    gap: 2,
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  distanceInsidePill: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
  },
  distanceOutsidePill: {
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warningBorder,
  },
  sectionBlock: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxs,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
  dotOpen: {
    backgroundColor: Colors.success,
  },
  dotWaiting: {
    backgroundColor: Colors.warning,
  },
  emptySectionCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptySectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  emptySectionTextCol: {
    flex: 1,
    gap: 2,
  },
  ongoingSessionCard: {
    borderColor: Colors.successBorder,
    borderWidth: 1.5,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  upcomingSessionCard: {
    borderColor: Colors.border,
    borderWidth: 1,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  nextImmediateCard: {
    borderColor: Colors.warningBorder,
    borderWidth: 1.5,
  },
  sessionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  classBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  classChipOpen: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  classChipWaiting: {
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warningBorder,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  nextQueueChip: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryBorder,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  myClassChip: {
    backgroundColor: Colors.infoBg,
    borderColor: Colors.infoBorder,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  courseTitle: {
    marginTop: 2,
  },
  detailList: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardActionWrap: {
    marginTop: Spacing.xxs,
  },
});
