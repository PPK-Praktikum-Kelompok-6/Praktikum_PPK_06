import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface LiveClockProps {
  variant?: 'light' | 'hero' | 'compact';
}

const INDONESIAN_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function LiveClock({ variant = 'light' }: LiveClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dayName = INDONESIAN_DAYS[time.getDay()];
  const dateNum = time.getDate();
  const monthName = INDONESIAN_MONTHS[time.getMonth()];
  const year = time.getFullYear();

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  const formattedDate = `${dayName}, ${dateNum} ${monthName} ${year}`;
  const formattedTime = `${hours}.${minutes}.${seconds} WIB`;

  const isHero = variant === 'hero';
  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <View style={[styles.compactContainer, isHero && styles.heroCompactContainer]}>
        <View style={styles.liveIndicatorDot} />
        <AppText
          variant="caption"
          weight="semibold"
          color={isHero ? Colors.textWhite : Colors.text}
        >
          {formattedTime}
        </AppText>
      </View>
    );
  }

  return (
    <View style={[styles.container, isHero ? styles.heroContainer : styles.lightContainer]}>
      <View style={styles.leftRow}>
        <View style={[styles.iconWrap, isHero ? styles.heroIconWrap : styles.lightIconWrap]}>
          <Icon
            name="time-outline"
            size={16}
            color={isHero ? Colors.primaryLight : Colors.primary}
          />
        </View>
        <View style={styles.textColumn}>
          <View style={styles.badgeRow}>
            <View style={styles.liveIndicatorDot} />
            <AppText
              variant="caption"
              weight="bold"
              color={isHero ? Colors.textWhite : Colors.success}
              style={styles.liveText}
            >
              WAKTU NYATA
            </AppText>
          </View>
          <AppText
            variant="caption"
            weight="medium"
            numberOfLines={1}
            color={isHero ? Colors.textWhiteMuted : Colors.textSecondary}
          >
            {formattedDate}
          </AppText>
        </View>
      </View>

      <View style={[styles.clockBadge, isHero ? styles.heroClockBadge : styles.lightClockBadge]}>
        <AppText
          variant="label"
          weight="bold"
          color={isHero ? Colors.textWhite : Colors.primaryDark}
          style={styles.clockDigits}
        >
          {formattedTime}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  lightContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.midnight,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  heroContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightIconWrap: {
    backgroundColor: Colors.primaryBg,
  },
  heroIconWrap: {
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 1,
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  liveText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  clockBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.md,
  },
  lightClockBadge: {
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  heroClockBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  clockDigits: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  heroCompactContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
});
