import { Href, Redirect, router, Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { FloatingTabBar } from '@/components/ui/FloatingTabBar';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import {
  AuthUser,
  getCurrentUser as getAuthUser,
  isAuthInitialized,
  isExplicitlySignedOut,
  onAuthChange,
  signOutUser,
} from '@/services/auth';
import { useCurrentUser } from '@/store/hooks';

export default function AdminTabsLayout() {
  const { currentUser } = useCurrentUser();
  const insets = useSafeAreaInsets();
  const [authUser, setAuthUser] = useState<AuthUser | null>(() =>
    getAuthUser()
  );
  const [initialized, setInitialized] = useState(() => isAuthInitialized());
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setAuthUser(user);
      setInitialized(true);
    });
    return unsubscribe;
  }, []);

  // Tunggu inisialisasi sesi Firebase Auth saat refresh
  if (!initialized) {
    return <View style={styles.root} />;
  }

  const activeUser = authUser || (currentUser?.id ? currentUser : null);
  const activeId = (activeUser as any)?.uid || (activeUser as any)?.id;

  // Proteksi Login
  if (isExplicitlySignedOut() || !activeUser || !activeId) {
    return <Redirect href="/" />;
  }

  // Guard RBAC Admin
  if (activeUser.role === 'STUDENT') {
    return <Redirect href="/student" />;
  }
  if (activeUser.role === 'ASSISTANT') {
    return <Redirect href="/assistant" />;
  }

  const bottomOffset = Math.max(insets.bottom, Spacing.md) + 6;

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    await signOutUser();
    router.replace('/' as Href);
  };

  return (
    <View style={styles.root}>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Sesi Praktikum',
            tabBarIcon: ({ focused, color, size }) => (
              <Icon
                name={focused ? 'calendar' : 'calendar-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="classes"
          options={{
            title: 'Kelas & Asisten',
            tabBarIcon: ({ focused, color, size }) => (
              <Icon
                name={focused ? 'school' : 'school-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="approvals"
          options={{
            title: 'Verifikasi Akun',
            tabBarIcon: ({ focused, color, size }) => (
              <Icon
                name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tabs>

      {/* Floating Logout Pill */}
      <View style={[styles.fabContainer, { bottom: bottomOffset }]}>
        <Pressable
          style={({ pressed }) => [
            styles.logoutFab,
            pressed && styles.logoutFabPressed,
          ]}
          onPress={() => setLogoutModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Keluar akun admin"
        >
          <Icon name="log-out-outline" size={18} color={Colors.danger} />
        </Pressable>
      </View>

      <FeedbackModal
        visible={logoutModalVisible}
        type="warning"
        title="Keluar dari Akun Admin?"
        message="Sesi admin Anda akan diakhiri dan dialihkan ke layar awal."
        primaryLabel="Ya, Keluar"
        secondaryLabel="Batal"
        onPrimary={handleConfirmLogout}
        onSecondary={() => setLogoutModalVisible(false)}
        onClose={() => setLogoutModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fabContainer: {
    position: 'absolute',
    right: Spacing.md,
    zIndex: 999,
  },
  logoutFab: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  logoutFabPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
