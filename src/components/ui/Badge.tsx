import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppText } from './AppText';

export type BadgeVariant =
  | 'open'
  | 'closed'
  | 'attended'
  | 'waiting'
  | 'danger'
  | 'primary';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  showDot?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Badge({
  label,
  variant = 'open',
  size = 'md',
  showDot = false,
  icon,
  style,
}: BadgeProps) {
  const config = VARIANT_CONFIG[variant];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <View
      style={[
        styles.container,
        sizeStyle.container,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
        style,
      ]}
    >
      {showDot && (
        <View style={[styles.dot, { backgroundColor: config.dot }]} />
      )}
      {icon && <View style={styles.icon}>{icon}</View>}
      <AppText
        variant={sizeStyle.textVariant}
        weight="semibold"
        color={config.text}
      >
        {label}
      </AppText>
    </View>
  );
}

const VARIANT_CONFIG = {
  open: {
    bg: Colors.successBg,
    text: Colors.success,
    border: Colors.successBorder,
    dot: Colors.success,
  },
  closed: {
    bg: Colors.surfaceSecondary,
    text: Colors.textMuted,
    border: Colors.border,
    dot: Colors.textMuted,
  },
  attended: {
    bg: Colors.infoBg,
    text: Colors.info,
    border: Colors.infoBorder,
    dot: Colors.info,
  },
  waiting: {
    bg: Colors.warningBg,
    text: Colors.warning,
    border: Colors.warningBorder,
    dot: Colors.warning,
  },
  danger: {
    bg: Colors.dangerBg,
    text: Colors.danger,
    border: Colors.dangerBorder,
    dot: Colors.danger,
  },
  primary: {
    bg: Colors.primaryBg,
    text: Colors.primary,
    border: '#DDD6FE',
    dot: Colors.primary,
  },
};

const SIZE_STYLES = {
  sm: {
    container: {
      paddingVertical: 2,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.full,
    },
    textVariant: 'caption' as const,
  },
  md: {
    container: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm + 4,
      borderRadius: Radius.full,
    },
    textVariant: 'bodySm' as const,
  },
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs + 2,
  },
  icon: {
    marginRight: Spacing.xs,
  },
});

