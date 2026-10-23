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

// 80px clearance accounts for floating tab bar height (64px) + bottom gap (16px)
const FLOATING_NAV_HEIGHT = 80;

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

  if (scroll) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.container, { backgroundColor }, style]}
      >
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

