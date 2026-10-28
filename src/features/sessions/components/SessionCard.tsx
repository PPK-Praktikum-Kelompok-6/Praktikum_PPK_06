import { BlurView } from 'expo-blur';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing, StatusLabel } from '@/constants/theme';
import { PracticalSession, SessionStatus } from '@/types/attendance';

export type SessionCardStatus = SessionStatus;

export type SessionCardData = Pick<
  PracticalSession,
  'id' | 'courseName' | 'classCode' | 'room' | 'timeSlot' | 'date' | 'status'
> & {
  assistantName?: string;
  totalStudents?: number;
};

export interface SessionCardProps {
  session: SessionCardData;
  attended?: boolean;
  variant?: 'default' | 'hero';
  actionLabel?: string;
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
): { label: string; variant: BadgeVariant; dotColor: string; showDot: boolean } {
  if (attended) {
    return {
      label: StatusLabel.attended,
      variant: 'attended',
      dotColor: Colors.info,
      showDot: true,
    };
  }
  switch (status) {
    case 'OPEN':
      return {
        label: StatusLabel.open,
        variant: 'open',
        dotColor: Colors.success,
        showDot: true,
      };
    case 'NOT_STARTED':
      return {
        label: StatusLabel.waiting,
        variant: 'waiting',
        dotColor: Colors.warning,
        showDot: true,
      };
    case 'CLOSED':
      return {
        label: StatusLabel.closed,
        variant: 'closed',
        dotColor: Colors.textMuted,
        showDot: false,
      };
  }
}

export function SessionCard({
  session,
  attended = false,
  variant = 'default',
  actionLabel,
  onPress,
}: SessionCardProps) {
  const badge = resolveBadge(session.status, attended);
  const resolvedActionLabel =
    actionLabel ?? (attended ? 'Lihat Bukti Presensi' : 'Presensi Sekarang');

  if (variant === 'hero') {
    return (
      <Card variant="hero" padding="lg" style={styles.heroCard}>
        {/* Top White Status Pill (Cotap Reference) */}
        <View style={styles.heroHeader}>
          <View style={styles.whiteStatusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: badge.dotColor },
              ]}
            />
            <AppText variant="caption" weight="semibold" color={Colors.text}>
              {badge.label}
            </AppText>
          </View>
        </View>

        {/* Main Row: White Rounded-Square Icon Box + Title & Assistant */}
        <View style={styles.heroMainRow}>
          <View style={styles.heroIconBox}>
            <Icon
              name={attended ? 'checkmark-done-outline' : 'time-outline'}
              size={24}
              color={Colors.primary}
            />
          </View>
          <View style={styles.heroTitleCol}>
            <AppText
              variant="h2"
              weight="bold"
              color={Colors.textWhite}
              numberOfLines={2}
              style={styles.heroTitle}
            >
              {session.courseName}
            </AppText>
            {session.assistantName ? (
              <AppText variant="caption" color={Colors.textWhiteMuted}>
                Asisten: {session.assistantName}
              </AppText>
            ) : null}
          </View>
        </View>

        {/* 3-Column Frosted Glass Metadata Panel (Cotap Reference) */}
        <View style={styles.heroGlassStatsPanel}>
          <View style={styles.heroStatCol}>
            <AppText variant="caption" weight="semibold" color={Colors.textWhite}>
              Waktu Sesi
            </AppText>
            <AppText variant="caption" color={Colors.textWhiteMuted}>
              {session.timeSlot}
            </AppText>
          </View>

          <View style={styles.heroVerticalDivider} />

          <View style={styles.heroStatCol}>
            <AppText variant="caption" weight="semibold" color={Colors.textWhite}>
              Ruangan
            </AppText>
            <View style={styles.statValueRow}>
              <Icon name="location-outline" size={12} color={Colors.textWhiteMuted} />
              <AppText
                variant="caption"
                color={Colors.textWhiteMuted}
                numberOfLines={1}
                style={styles.statValueText}
              >
                {session.room}
              </AppText>
            </View>
          </View>

          <View style={styles.heroVerticalDivider} />

          <View style={styles.heroStatCol}>
            <AppText variant="caption" weight="semibold" color={Colors.textWhite}>
              Kelas
            </AppText>
            <AppText variant="caption" color={Colors.textWhiteMuted}>
              Kelas {session.classCode}
            </AppText>
          </View>
        </View>

        {/* Full-Width Frosted Glass Pill Action Button (Cotap Reference) */}
        {onPress ? (
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              styles.glassPillButton,
              pressed && styles.glassPillButtonPressed,
            ]}
          >
            <BlurView
              intensity={28}
              tint="light"
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <AppText variant="bodySm" weight="semibold" color={Colors.textWhite}>
              {resolvedActionLabel}
            </AppText>
            <Icon
              name="play"
              size={13}
              color={Colors.textWhite}
              style={styles.glassPillIcon}
            />
          </Pressable>
        ) : null}
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
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  whiteStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: Spacing.xs + 2,
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  heroTitleCol: {
    flex: 1,
  },
  heroTitle: {
    marginBottom: 2,
    lineHeight: 24,
  },
  heroGlassStatsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.glassOverlay,
    borderWidth: 1,
    borderColor: Colors.midnightBorder,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  heroStatCol: {
    flex: 1,
    gap: 2,
  },
  heroVerticalDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.midnightBorder,
    marginHorizontal: Spacing.sm,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValueText: {
    marginLeft: 3,
  },
  glassPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: Colors.glassOverlay,
    borderWidth: 1.2,
    borderColor: Colors.glassHighlight,
    overflow: 'hidden',
  },
  glassPillButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  glassPillIcon: {
    marginLeft: Spacing.sm,
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
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
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
