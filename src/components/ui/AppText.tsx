import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';

import { Colors, FontWeights, Typography } from '@/constants/theme';

export type TextVariant =
  | 'hero'
  | 'h1'
  | 'h2'
  | 'title'
  | 'body'
  | 'bodySm'
  | 'caption'
  | 'label'
  | 'muted';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  weight?: keyof typeof FontWeights;
  color?: string;
  align?: TextStyle['textAlign'];
  children: React.ReactNode;
}

export function AppText({
  variant = 'body',
  weight,
  color,
  align,
  style,
  children,
  ...props
}: AppTextProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const customStyle: TextStyle = {
    ...(weight ? { fontWeight: FontWeights[weight] } : {}),
    ...(color ? { color } : {}),
    ...(align ? { textAlign: align } : {}),
  };

  return (
    <Text style={[variantStyle, customStyle, style]} {...props}>
      {children}
    </Text>
  );
}

const VARIANT_STYLES = StyleSheet.create({
  hero: {
    fontSize: Typography.hero,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  h1: {
    fontSize: Typography.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  h2: {
    fontSize: Typography.xl,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    lineHeight: 26,
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    lineHeight: 23,
  },
  body: {
    fontSize: Typography.md,
    fontWeight: FontWeights.regular,
    color: Colors.text,
    lineHeight: 22,
  },
  bodySm: {
    fontSize: Typography.sm,
    fontWeight: FontWeights.regular,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  caption: {
    fontSize: Typography.xs,
    fontWeight: FontWeights.medium,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: FontWeights.medium,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  muted: {
    fontSize: Typography.sm,
    fontWeight: FontWeights.regular,
    color: Colors.textMuted,
    lineHeight: 19,
  },
});

