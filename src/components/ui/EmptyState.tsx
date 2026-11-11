import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import {
  Colors,
  GradientShapes,
  HandGestureName,
  Radius,
  Spacing,
} from '@/constants/theme';
import { AppText } from './AppText';
import { CustomButton } from './CustomButton';
import { GestureIcon, Icon, IconName } from './Icon';

export interface EmptyStateProps {
  title: string;
  message: string;
  iconName?: IconName;
  gestureName?: HandGestureName;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  title,
  message,
  iconName = 'calendar-outline',
  gestureName,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.illustrationWrap}>
        <Image
          source={GradientShapes.droplet}
          pointerEvents="none"
          resizeMode="contain"
          style={styles.dropletBackdrop}
        />
        <View style={styles.iconCircle}>
          {gestureName ? (
            <GestureIcon name={gestureName} size={36} color={Colors.primary} />
          ) : (
            <Icon name={iconName} size={36} color={Colors.primary} />
          )}
        </View>
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
  illustrationWrap: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  dropletBackdrop: {
    position: 'absolute',
    width: 112,
    height: 112,
    opacity: 0.32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.glassSurfaceStrong,
    borderWidth: 1.2,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
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
