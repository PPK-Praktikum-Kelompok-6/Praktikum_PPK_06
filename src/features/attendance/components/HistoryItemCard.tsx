import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { AttendanceRecord, PracticalSession } from '@/types/attendance';
import { formatDateIndonesian, formatTime } from '@/utils/formatTime';

export interface HistoryItemCardProps {
  record: AttendanceRecord & { session?: PracticalSession };
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function HistoryItemCard({
  record,
  onPress,
  style,
}: HistoryItemCardProps) {
  const session = record.session;
  const courseName = session?.courseName || 'Sesi Praktikum';
  const classCode = session?.classCode ? `Kelas ${session.classCode}` : undefined;
  const room = session?.room || 'Ruang Lab';
  const timeFormatted = formatTime(record.timestamp);
  const dateFormatted = formatDateIndonesian(record.timestamp);

  return (
    <Card
      variant="flat"
      padding="md"
      onPress={onPress}
      style={[styles.card, style]}
    >
      {/* Header Kartu: Status Kehadiran & Waktu */}
      <View style={styles.topRow}>
        <View style={styles.badgeWrapper}>
          <Badge label="Hadir" variant="attended" size="sm" showDot />
          {classCode ? (
            <Badge label={classCode} variant="primary" size="sm" />
          ) : null}
        </View>
        <View style={styles.timestampWrapper}>
          <Icon name="time-outline" size={13} color={Colors.textMuted} />
          <AppText variant="caption" color={Colors.textMuted} weight="medium">
            {timeFormatted}
          </AppText>
        </View>
      </View>

      {/* Nama Sesi / Mata Kuliah */}
      <View style={styles.courseWrapper}>
        <AppText variant="h2" style={styles.courseName} numberOfLines={2}>
          {courseName}
        </AppText>
      </View>

      {/* Meta Informasi: Ruang & Tanggal */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Icon name="location-outline" size={14} color={Colors.primary} />
          <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
            {room}
          </AppText>
        </View>

        <View style={styles.metaItem}>
          <Icon name="calendar-outline" size={14} color={Colors.primary} />
          <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
            {dateFormatted}
          </AppText>
        </View>
      </View>

      {/* Catatan jika ada */}
      {record.notes ? (
        <View style={styles.notesContainer}>
          <Icon name="chatbubble-ellipses-outline" size={13} color={Colors.textMuted} />
          <AppText
            variant="caption"
            color={Colors.textSecondary}
            numberOfLines={2}
            style={styles.notesText}
          >
            &quot;{record.notes}&quot;
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timestampWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  courseWrapper: {
    marginTop: Spacing.xxs,
  },
  courseName: {
    fontSize: Typography.lg,
    color: Colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xxs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    flexShrink: 1,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  notesText: {
    flex: 1,
    fontStyle: 'italic',
  },
});

