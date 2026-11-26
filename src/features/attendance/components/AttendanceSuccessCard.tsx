import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AttendanceRecord, PracticalSession } from '@/types/attendance';
import { formatDateIndonesian, formatTime } from '@/utils/formatTime';

export interface AttendanceSuccessCardProps {
  record: AttendanceRecord;
  session?: PracticalSession;
  style?: StyleProp<ViewStyle>;
}

export function AttendanceSuccessCard({
  record,
  session,
  style,
}: AttendanceSuccessCardProps) {
  const formattedTime = formatTime(record.timestamp);
  const formattedDate = formatDateIndonesian(record.timestamp);
  const isLate = record.attendanceStatus === 'LATE';

  return (
    <Card variant="flat" padding="md" style={[styles.card, style]}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Icon name="checkmark-circle" size={26} color={Colors.success} />
        </View>
        <View style={styles.headerText}>
          <AppText variant="h2" color={Colors.success}>
            Kehadiran Tercatat
          </AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            Bukti presensi resmi praktikum
          </AppText>
        </View>
        {isLate ? (
          <Badge label="Terlambat" variant="waiting" size="sm" showDot />
        ) : null}
      </View>

      <View style={styles.divider} />

      {/* Detail Presensi */}
      <View style={styles.infoGrid}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <AppText variant="caption" color={Colors.textMuted}>
              NAMA MAHASISWA
            </AppText>
            <AppText variant="body" weight="semibold" numberOfLines={2}>
              {record.studentName}
            </AppText>
          </View>
          <View style={styles.infoItem}>
            <AppText variant="caption" color={Colors.textMuted}>
              NIM
            </AppText>
            <AppText variant="bodySm" weight="semibold" numberOfLines={1}>
              {record.studentNim}
            </AppText>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <AppText variant="caption" color={Colors.textMuted}>
              WAKTU PRESENSI
            </AppText>
            <View style={styles.timeWrapper}>
              <Icon name="time-outline" size={14} color={Colors.primary} />
              <AppText variant="bodySm" weight="semibold" color={Colors.primary}>
                {formattedTime}
              </AppText>
            </View>
          </View>
          <View style={styles.infoItem}>
            <AppText variant="caption" color={Colors.textMuted}>
              TANGGAL
            </AppText>
            <AppText variant="bodySm" color={Colors.textSecondary}>
              {formattedDate}
            </AppText>
          </View>
        </View>

        {session ? (
          <View style={styles.sessionBox}>
            <AppText variant="caption" color={Colors.textMuted}>
              SESI PRAKTIKUM
            </AppText>
            <AppText variant="body" weight="semibold">
              {session.courseName} ({session.classCode})
            </AppText>
            <View style={styles.sessionMeta}>
              <View style={styles.metaItem}>
                <Icon name="location-outline" size={12} color={Colors.textMuted} />
                <AppText variant="caption" color={Colors.textMuted} style={styles.metaText}>
                  {session.room}
                </AppText>
              </View>
              <View style={styles.metaItem}>
                <Icon name="person-outline" size={12} color={Colors.textMuted} />
                <AppText variant="caption" color={Colors.textMuted} style={styles.metaText}>
                  {session.assistantName}
                </AppText>
              </View>
            </View>
          </View>
        ) : null}

        {record.verifiedLocation ? (
          <View style={styles.verifiedLocationBox}>
            <Icon name="shield-checkmark" size={14} color={Colors.success} style={styles.verifiedIcon} />
            <AppText variant="caption" color={Colors.success} weight="semibold" style={styles.verifiedText}>
              Lokasi Terverifikasi Kehadiran Fisik{' '}
              {record.distanceMeters !== undefined && record.distanceMeters !== null
                ? `(${record.distanceMeters} m dari lab)`
                : ''}
            </AppText>
          </View>
        ) : null}

        {record.notes ? (
          <View style={styles.notesBox}>
            <AppText variant="caption" color={Colors.textMuted}>
              CATATAN
            </AppText>
            <AppText variant="bodySm" color={Colors.textSecondary} style={styles.notesText}>
              &quot;{record.notes}&quot;
            </AppText>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.successBorder,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  infoGrid: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  infoItem: {
    flex: 1,
    gap: Spacing.xxs,
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sessionBox: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xxs,
    marginTop: Spacing.xs,
  },
  sessionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    rowGap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  metaText: {
    flexShrink: 1,
  },
  notesBox: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xxs,
  },
  notesText: {
    fontStyle: 'italic',
  },
  verifiedLocationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.successBg,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    marginTop: Spacing.xs,
  },
  verifiedIcon: {
    marginTop: Spacing.xxs,
  },
  verifiedText: {
    flex: 1,
  },
});
