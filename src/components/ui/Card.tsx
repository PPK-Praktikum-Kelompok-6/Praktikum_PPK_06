import { BlurView } from 'expo-blur';
import React from 'react';
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import {
  Colors,
  GradientMeshes,
  GradientShapes,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';

export type CardVariant = 'default' | 'flat' | 'hero' | 'accent' | 'glass';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  style,
}: CardProps) {
  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    VARIANT_STYLES[variant],
    PADDING_STYLES[padding],
    style,
  ];

  const content = (
    <>
      {variant === 'hero' ? (
        <>
          <Image
            source={GradientMeshes.violet}
            pointerEvents="none"
            resizeMode="contain"
            style={styles.heroMeshGlow}
          />
          <Image
            source={GradientShapes.heroBlob}
            pointerEvents="none"
            resizeMode="contain"
            style={styles.heroCornerBlob}
          />
        </>
      ) : null}
      {variant === 'glass' ? (
        <BlurView
          intensity={55}
          tint="light"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          containerStyle,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}

const PADDING_STYLES = {
  none: { padding: 0 },
  sm: { padding: Spacing.sm },
  md: { padding: Spacing.md },
  lg: { padding: Spacing.lg },
};

const VARIANT_STYLES = StyleSheet.create({
  default: {
    backgroundColor: Colors.glassSurfaceStrong,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Shadows.sm,
  },
  flat: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hero: {
    backgroundColor: Colors.midnightSurface,
    experimental_backgroundImage: Colors.heroGradient,
    borderRadius: Radius.xl,
    ...Shadows.lg,
  },
  accent: {
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  glass: {
    backgroundColor: Colors.glassSurface,
    borderRadius: Radius.lg,
    borderWidth: 1.2,
    borderColor: Colors.glassBorder,
    ...Shadows.md,
  },
});

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    position: 'relative',
  },
  heroMeshGlow: {
    position: 'absolute',
    top: -65,
    left: -55,
    width: 290,
    height: 290,
    opacity: 0.62,
  },
  heroCornerBlob: {
    position: 'absolute',
    bottom: -65,
    right: -45,
    width: 240,
    height: 240,
    opacity: 0.58,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
