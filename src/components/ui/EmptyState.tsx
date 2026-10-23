import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { CustomButton } from './CustomButton';
import { Icon, IconName } from './Icon';

export interface EmptyStateProps {
  title: string;
  message: string;
  iconName?: IconName;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  title,
  message,
  iconName = 'calendar-outline',
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Icon name={iconName} size={36} color={Colors.primary} />
      </View>
      <AppText variant="title" align="center" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="bodySm" align="center" style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <CustomButton
          title={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          fullWidth={false}
          style={styles.actionBtn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  message: {
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    minWidth: 140,
  },
});

