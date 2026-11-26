import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export type FloatingTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0] & {
  leftAccessory?: React.ReactNode;
  rightAccessory?: React.ReactNode;
};

/**
 * Compact Frosted-Glass Floating Pill Navbar with optional coordinated side accessories.
 * Renders accessories and the tab capsule inside one flex row so they never overlap on narrow screens.
 */
export function FloatingTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  leftAccessory,
  rightAccessory,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, Spacing.md);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomOffset }]}
    >
      <View pointerEvents="box-none" style={styles.barRow}>
        {leftAccessory ? <View style={styles.sideSlot}>{leftAccessory}</View> : null}

        <View style={styles.shadowContainer}>
          <BlurView intensity={70} tint="light" style={styles.blurCapsule}>
            <View style={styles.pillInner}>
              {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const focused = state.index === index;

                const onPress = () => {
                  const event = emitter.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!focused && !event.defaultPrevented) {
                    navigateToTab(route.key);
                  }
                };

                const iconColor = focused
                  ? Colors.tabBarActiveTint
                  : Colors.tabBarInactiveTint;

                return (
                  <Pressable
                    key={route.key}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityState={focused ? { selected: true } : {}}
                    accessibilityLabel={
                      options.tabBarAccessibilityLabel ??
                      options.title ??
                      route.name
                    }
                    onPress={onPress}
                    style={({ pressed }) => [
                      styles.circle,
                      focused ? styles.circleActive : styles.circleInactive,
                      pressed && styles.circlePressed,
                    ]}
                  >
                    {options.tabBarIcon?.({
                      focused,
                      color: iconColor,
                      size: 21,
                    })}
                  </Pressable>
                );
              })}
            </View>
          </BlurView>
        </View>

        {rightAccessory ? <View style={styles.sideSlot}>{rightAccessory}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm + 4,
  },
  sideSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowContainer: {
    borderRadius: Radius.full,
    ...Shadows.floatingNav,
  },
  blurCapsule: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tabBarBg,
    borderRadius: Radius.full,
    padding: 5,
    gap: 6,
    borderWidth: 1.2,
    borderColor: Colors.tabBarBorder,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  circleActive: {
    backgroundColor: Colors.tabBarActiveBg,
    borderColor: Colors.glassActiveBorder,
  },
  circleInactive: {
    backgroundColor: Colors.tabBarInactiveBg,
    borderColor: Colors.glassBorder,
  },
  circlePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
