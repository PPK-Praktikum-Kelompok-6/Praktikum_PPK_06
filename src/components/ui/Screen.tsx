import React from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, GradientMeshes, Spacing } from '@/constants/theme';

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
      <Image
        source={GradientMeshes.pastel}
        resizeMode="contain"
        style={styles.ambientMeshTopRight}
      />
      <Image
        source={GradientMeshes.indigo}
        resizeMode="contain"
        style={styles.ambientMeshBottom}
      />
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
  ambientMeshTopRight: {
    position: 'absolute',
    top: -70,
    right: -70,
    width: 320,
    height: 320,
    opacity: 0.42,
  },
  ambientMeshBottom: {
    position: 'absolute',
    bottom: -60,
    alignSelf: 'center',
    width: 320,
    height: 320,
    opacity: 0.34,
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
