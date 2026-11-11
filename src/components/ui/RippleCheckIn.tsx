import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import {
  Colors,
  GradientShapes,
  HandGestureName,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { AppText } from './AppText';
import { GestureIcon, Icon } from './Icon';

export interface RippleCheckInProps {
  onPress: () => void;
  checkedIn?: boolean;
  disabled?: boolean;
  label?: string;
  checkedLabel?: string;
  helperText?: string;
  gestureName?: HandGestureName;
}

export function RippleCheckIn({
  onPress,
  checkedIn = false,
  disabled = false,
  label = 'TAP PRESENSI',
  checkedLabel = 'TERPRESENSI',
  helperText,
  gestureName = 'tapRing',
}: RippleCheckInProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.rippleContainer}>
        <Image
          source={GradientShapes.sphere}
          pointerEvents="none"
          resizeMode="contain"
          style={styles.sphereBackdrop}
        />
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
              {checkedIn ? (
                <Icon name="checkmark" size={36} color={Colors.textWhite} />
              ) : (
                <GestureIcon
                  name={gestureName}
                  size={36}
                  color={Colors.textWhite}
                />
              )}
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
  rippleContainer: {
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sphereBackdrop: {
    position: 'absolute',
    width: 210,
    height: 210,
    opacity: 0.34,
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
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
