import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppText } from './AppText';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'hero';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function CustomButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = true,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}: CustomButtonProps) {
  const isDisabled = disabled || loading;

  const getVariantContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: isDisabled ? Colors.border : Colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: isDisabled ? Colors.borderLight : Colors.primaryBg,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: isDisabled ? Colors.border : Colors.border,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: isDisabled ? Colors.border : Colors.danger,
        };
      case 'hero':
        return {
          backgroundColor: isDisabled ? Colors.border : Colors.midnight,
          borderWidth: 1,
          borderColor: Colors.glassHighlight,
        };
    }
  };

  const getTextColor = (): string => {
    if (isDisabled) return Colors.textLight;
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'hero':
        return Colors.textWhite;
      case 'secondary':
      case 'ghost':
        return Colors.primary;
      case 'outline':
        return Colors.text;
    }
  };

  const sizeStyle = SIZE_STYLES[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyle.container,
        getVariantContainerStyle(),
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
          style={styles.spinner}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' ? (
            <View style={styles.iconLeft}>{icon}</View>
          ) : null}
          <AppText
            variant={sizeStyle.textVariant}
            weight="semibold"
            color={getTextColor()}
            style={textStyle}
          >
            {title}
          </AppText>
          {icon && iconPosition === 'right' ? (
            <View style={styles.iconRight}>{icon}</View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const SIZE_STYLES = {
  sm: {
    container: {
      paddingVertical: Spacing.xs + 2,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.sm,
      minHeight: 36,
    },
    textVariant: 'bodySm' as const,
  },
  md: {
    container: {
      paddingVertical: Spacing.sm + 4,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.md,
      minHeight: 48,
    },
    textVariant: 'body' as const,
  },
  lg: {
    container: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: Radius.lg,
      minHeight: 56,
    },
    textVariant: 'title' as const,
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  spinner: {
    paddingVertical: 2,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
});

