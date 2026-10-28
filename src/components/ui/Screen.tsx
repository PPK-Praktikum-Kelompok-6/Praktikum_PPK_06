import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  withBottomNavPadding?: boolean;
  backgroundColor?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// 84px clearance accounts for floating tab bar height (64px) + bottom gap (20px)
const FLOATING_NAV_HEIGHT = 84;

export function Screen({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  withBottomNavPadding = false,
  backgroundColor = Colors.background,
  refreshing = false,
  onRefresh,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = withBottomNavPadding
    ? FLOATING_NAV_HEIGHT + insets.bottom
    : insets.bottom;

  const ambientBackground = (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.ambientOrbTopRight} />
      <View style={styles.ambientOrbMiddleLeft} />
    </View>
  );

  if (scroll) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.container, { backgroundColor }, style]}
      >
        {ambientBackground}
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding + Spacing.lg },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.container,
        { backgroundColor, paddingBottom: bottomPadding },
        style,
      ]}
    >
      {ambientBackground}
      <View style={[styles.staticContent, contentContainerStyle]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientOrbTopRight: {
    position: 'absolute',
    top: -60,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Colors.ambientViolet,
  },
  ambientOrbMiddleLeft: {
    position: 'absolute',
    top: 260,
    left: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.ambientIndigo,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
});
