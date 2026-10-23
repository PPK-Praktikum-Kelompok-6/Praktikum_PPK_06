import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Shadows, Spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export interface RippleCheckInProps {
  onPress: () => void;
  checkedIn?: boolean;
  disabled?: boolean;
  label?: string;
  checkedLabel?: string;
  helperText?: string;
}

export function RippleCheckIn({
  onPress,
  checkedIn = false,
  disabled = false,
  label = 'TAP PRESENSI',
  checkedLabel = 'TERPRESENSI',
  helperText,
}: RippleCheckInProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.rippleOuter}>
        <View style={styles.rippleMid}>
          <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={checkedIn ? checkedLabel : label}
            style={({ pressed }) => [
              styles.rippleInner,
              checkedIn && styles.rippleInnerSuccess,
              disabled && styles.rippleInnerDisabled,
              pressed && !disabled && styles.rippleInnerPressed,
            ]}
          >
            <Icon
              name={checkedIn ? 'checkmark' : 'finger-print-outline'}
              size={36}
              color={Colors.textWhite}
            />
            <AppText
              variant="caption"
              weight="bold"
              color={Colors.textWhite}
              style={styles.rippleText}
            >
              {checkedIn ? checkedLabel : label}
            </AppText>
          </Pressable>
        </View>
      </View>
      {helperText ? (
        <AppText
          variant="caption"
          color={checkedIn ? Colors.success : Colors.textMuted}
          style={styles.helperText}
        >
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: Colors.rippleOuter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleMid: {
    width: 135,
    height: 135,
    borderRadius: 67.5,
    backgroundColor: Colors.rippleMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  rippleInnerSuccess: {
    backgroundColor: Colors.success,
  },
  rippleInnerDisabled: {
    backgroundColor: Colors.textMuted,
  },
  rippleInnerPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  rippleText: {
    marginTop: 4,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  helperText: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});

