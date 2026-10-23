import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  variant?: ProgressVariant;
  size?: ProgressSize;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  progress,
  variant = 'primary',
  size = 'md',
  style,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  const getBarColor = (): string => {
    switch (variant) {
      case 'primary':
        return Colors.primary;
      case 'success':
        return Colors.success;
      case 'warning':
        return Colors.warning;
      case 'danger':
        return Colors.danger;
    }
  };

  const height = size === 'sm' ? 4 : size === 'md' ? 8 : 12;

  return (
    <View style={[styles.track, { height }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: getBarColor(),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});

