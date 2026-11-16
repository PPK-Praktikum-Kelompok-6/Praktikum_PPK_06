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
  isExplicitlySignedOut,
  onAuthChange,
  signOutUser,
} from '@/services/auth';
import { useCurrentUser } from '@/store/hooks';

export default function AssistantTabsLayout() {
  const { currentUser } = useCurrentUser();
  const insets = useSafeAreaInsets();
  const [authUser, setAuthUser] = useState<AuthUser | null>(() =>
    getAuthUser()
  );
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setAuthUser(user);
    });
    return unsubscribe;
  }, []);

  // Proteksi Sesi Login (SRS-AUTH-01 & SRS-AUTH-02): Jika pengguna sudah logout, arahkan ke halaman login
  if (isExplicitlySignedOut() || (!authUser && !currentUser?.id)) {
    return <Redirect href="/" />;
  }

  const activeRole = authUser?.role ?? currentUser.role;

  // Guard RBAC Asisten (SRS-AUTH-02): Praktikan dilarang mengakses tampilan asisten
  if (activeRole !== 'ASSISTANT') {
    return <Redirect href="/student" />;
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
            title: 'Jadwal',
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
          name="recap"
          options={{
            title: 'Rekap',
            tabBarIcon: ({ focused, color, size }) => (
              <Icon
                name={focused ? 'clipboard' : 'clipboard-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="permits"
          options={{
            title: 'Izin',
            tabBarIcon: ({ focused, color, size }) => (
              <Icon
                name={focused ? 'file-tray-full' : 'file-tray-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tabs>

      {/* Tombol Logout Mengambang di Samping Navigasi Bawah */}
      <Pressable
        onPress={() => setLogoutModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Keluar dari akun asisten"
        style={({ pressed }) => [
          styles.floatingLogoutBtn,
          { bottom: bottomOffset },
          pressed && styles.floatingLogoutPressed,
        ]}
      >
        <Icon name="log-out-outline" size={20} color={Colors.danger} />
      </Pressable>

      <FeedbackModal
        visible={logoutModalVisible}
        type="warning"
        title="Keluar dari Sesi Asisten?"
        message={`Apakah Anda yakin ingin keluar dari akun ${authUser?.name ?? currentUser.name}?`}
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
  },
  floatingLogoutBtn: {
    position: 'absolute',
    right: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.dangerBg,
    borderWidth: 1.2,
    borderColor: Colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.floatingNav,
  },
  floatingLogoutPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
