import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing, StatusLabel } from '@/constants/theme';

export type SessionCardStatus = 'NOT_STARTED' | 'OPEN' | 'CLOSED';

export interface SessionCardData {
  id: string;
  courseName: string;
  classCode: string;
  room: string;
  timeSlot: string;
  date: string; // ISO string or "YYYY-MM-DD"
  status: SessionCardStatus;
  assistantName?: string;
}

export interface SessionCardProps {
  session: SessionCardData;
  attended?: boolean;
  variant?: 'default' | 'hero';
  onPress?: () => void;
}

const SHORT_DAYS = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

function parseDayAndNumber(dateStr: string): { dayLabel: string; dateNum: string } {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { dayLabel: 'JAD', dateNum: '--' };
  }
  return {
    dayLabel: SHORT_DAYS[d.getDay()],
    dateNum: String(d.getDate()).padStart(2, '0'),
  };
}

function resolveBadge(
  status: SessionCardStatus,
  attended?: boolean
): { label: string; variant: BadgeVariant; showDot: boolean } {
  if (attended) {
    return { label: StatusLabel.attended, variant: 'attended', showDot: false };
  }
  switch (status) {
    case 'OPEN':
      return { label: StatusLabel.open, variant: 'open', showDot: true };
    case 'NOT_STARTED':
      return { label: StatusLabel.waiting, variant: 'waiting', showDot: false };
    case 'CLOSED':
      return { label: StatusLabel.closed, variant: 'closed', showDot: false };
  }
}

export function SessionCard({
  session,
  attended = false,
  variant = 'default',
  onPress,
}: SessionCardProps) {
  const badge = resolveBadge(session.status, attended);

  if (variant === 'hero') {
    return (
      <Card variant="hero" padding="lg" onPress={onPress} style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Badge
            label={badge.label}
            variant={badge.variant}
            size="sm"
            showDot={badge.showDot}
          />
          <AppText variant="caption" color={Colors.textWhiteMuted}>
            {session.room} · Kelas {session.classCode}
          </AppText>
        </View>

        <AppText variant="hero" color={Colors.textWhite} style={styles.heroTitle}>
          {session.courseName}
        </AppText>
        {session.assistantName ? (
          <AppText variant="bodySm" color={Colors.textWhiteMuted}>
            Asisten: {session.assistantName}
          </AppText>
        ) : null}

        <View style={styles.heroDivider} />

        <View style={styles.heroFooter}>
          <View style={styles.timeInfo}>
            <Icon name="time-outline" size={16} color={Colors.textWhiteMuted} />
            <AppText
              variant="caption"
              color={Colors.textWhiteMuted}
              style={styles.timeText}
            >
              {session.timeSlot}
            </AppText>
          </View>
          {onPress ? (
            <CustomButton
              title={attended ? 'Lihat Bukti' : 'Presensi'}
              onPress={onPress}
              variant="secondary"
              size="sm"
              fullWidth={false}
            />
          ) : null}
        </View>
      </Card>
    );
  }

  const { dayLabel, dateNum } = parseDayAndNumber(session.date);

  return (
    <Card variant="default" padding="md" onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.dateBadge}>
          <AppText variant="caption" weight="bold" color={Colors.primary}>
            {dayLabel}
          </AppText>
          <AppText variant="title" weight="bold" color={Colors.primaryDark}>
            {dateNum}
          </AppText>
        </View>

        <View style={styles.details}>
          <AppText variant="title" numberOfLines={1}>
            {session.courseName}
          </AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            Kelas {session.classCode} · {session.room}
          </AppText>
          <View style={styles.metaRow}>
            <Icon name="time-outline" size={14} color={Colors.textMuted} />
            <AppText
              variant="caption"
              color={Colors.textMuted}
              style={styles.metaText}
            >
              {session.timeSlot}
            </AppText>
          </View>
        </View>

        <Badge
          label={badge.label}
          variant={badge.variant}
          size="sm"
          showDot={badge.showDot}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: Spacing.xl,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    marginBottom: Spacing.xs,
    fontSize: 24,
  },
  heroDivider: {
    height: 1,
    backgroundColor: Colors.midnightBorder,
    marginVertical: Spacing.md,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: Spacing.xs,
  },
  card: {
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBadge: {
    width: 50,
    height: 54,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  details: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  metaText: {
    marginLeft: Spacing.xs,
  },
});

