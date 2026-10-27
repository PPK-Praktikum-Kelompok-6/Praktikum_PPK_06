import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface StatSummaryCardProps {
  attendedCount: number;
  totalStudents: number;
  style?: StyleProp<ViewStyle>;
}

export function StatSummaryCard({
  attendedCount,
  totalStudents,
  style,
}: StatSummaryCardProps) {
  const percentage =
    totalStudents > 0
      ? Math.min(100, Math.round((attendedCount / totalStudents) * 100))
      : 0;
  const unrecordedCount = Math.max(0, totalStudents - attendedCount);

  return (
    <Card variant="default" padding="md" style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBadge}>
            <Icon name="people" size={18} color={Colors.primary} />
          </View>
          <AppText variant="title">Rekapitulasi Kehadiran</AppText>
        </View>
        <AppText variant="title" color={Colors.primary} weight="bold">
          {percentage}%
        </AppText>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <ProgressBar progress={percentage} size="md" />
      </View>

      {/* Stats Breakdown */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <AppText variant="caption" color={Colors.textMuted}>
            Hadir
          </AppText>
          <AppText variant="h2" color={Colors.success} weight="bold">
            {attendedCount}
          </AppText>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <AppText variant="caption" color={Colors.textMuted}>
            Belum Hadir
          </AppText>
          <AppText variant="h2" color={Colors.textSecondary} weight="bold">
            {unrecordedCount}
          </AppText>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <AppText variant="caption" color={Colors.textMuted}>
            Total Peserta
          </AppText>
          <AppText variant="h2" color={Colors.text} weight="bold">
            {totalStudents}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.xs,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
});
