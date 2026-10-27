import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AttendanceRecord } from '@/types/attendance';
import { formatTime } from '@/utils/formatTime';

export interface AttendanceTableProps {
  records: AttendanceRecord[];
  style?: StyleProp<ViewStyle>;
}

export function AttendanceTable({ records, style }: AttendanceTableProps) {
  if (records.length === 0) {
    return (
      <EmptyState
        title="Belum Ada Presensi"
        message="Belum ada praktikan yang tercatat hadir pada sesi ini."
        iconName="time-outline"
        style={style}
      />
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <AppText variant="title">Daftar Hadir Praktikan</AppText>
        <AppText variant="caption" color={Colors.primary} weight="semibold">
          {records.length} Peserta
        </AppText>
      </View>

      <View style={styles.list}>
        {records.map((record, index) => (
          <Card key={record.id} variant="default" padding="sm" style={styles.itemCard}>
            <View style={styles.row}>
              {/* Number / Index Badge */}
              <View style={styles.indexBadge}>
                <AppText variant="caption" color={Colors.textSecondary} weight="bold">
                  {index + 1}
                </AppText>
              </View>

              {/* Student Info */}
              <View style={styles.studentInfo}>
                <AppText variant="bodySm" weight="semibold">
                  {record.studentName}
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  NIM: {record.studentNim}
                </AppText>
                {record.notes ? (
                  <View style={styles.notesRow}>
                    <Icon name="chatbubble-ellipses-outline" size={12} color={Colors.textMuted} />
                    <AppText variant="caption" color={Colors.textMuted}>
                      {record.notes}
                    </AppText>
                  </View>
                ) : null}
              </View>

              {/* Timestamp & Status Badge */}
              <View style={styles.timeSection}>
                <Badge label="Hadir" variant="attended" size="sm" showDot />
                <AppText variant="caption" color={Colors.textMuted} style={styles.timeText}>
                  {formatTime(record.timestamp)}
                </AppText>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  list: {
    gap: Spacing.sm,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInfo: {
    flex: 1,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
  },
});
