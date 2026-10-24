import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export type FloatingTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

/**
 * Compact Floating Pill Navbar (auto-width hugging the number of menu items).
 * Properly offsets iOS home indicator outside the capsule so icons stay centered.
 */
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, Spacing.md);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomOffset }]}
    >
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const iconColor = focused
            ? Colors.tabBarActiveTint
            : Colors.tabBarInactiveTint;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title ?? route.name}
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
                size: 22,
              })}
            </Pressable>
          );
        })}
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tabBarBg,
    borderRadius: Radius.full,
    padding: 6,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    ...Shadows.floatingNav,
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: Colors.tabBarActiveBg,
  },
  circleInactive: {
    backgroundColor: Colors.tabBarInactiveBg,
  },
  circlePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});

