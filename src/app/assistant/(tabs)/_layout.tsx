import { Href, Redirect, router, Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { FloatingTabBar } from '@/components/ui/FloatingTabBar';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Shadows } from '@/constants/theme';
import {
  AuthUser,
  getCurrentUser as getAuthUser,
  isAuthInitialized,
  isExplicitlySignedOut,
  onAuthChange,
  signOutUser,
} from '@/services/auth';
import { useCurrentUser } from '@/store/hooks';

export default function AssistantTabsLayout() {
  const { currentUser } = useCurrentUser();
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

  // Tunggu inisialisasi sesi Firebase Auth pada saat reload halaman
  if (!initialized) {
    return <View style={styles.root} />;
  }

  const activeUser = authUser || (currentUser?.id ? currentUser : null);
  const activeId = (activeUser as any)?.uid || (activeUser as any)?.id;

  // Proteksi Sesi Login: Jika pengguna belum login atau sudah logout
  if (isExplicitlySignedOut() || !activeUser || !activeId) {
    return <Redirect href="/" />;
  }

  // Guard RBAC Asisten (SRS-AUTH-02): Praktikan diarahkan ke dashboard praktikan
  if (activeUser.role === 'STUDENT') {
    return <Redirect href="/student" />;
  }

  // Guard RBAC Admin
  if (activeUser.role === 'ADMIN') {
    return <Redirect href={'/admin' as any} />;
  }

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    await signOutUser();
    router.replace('/' as Href);
  };

  const logoutButton = (
    <Pressable
      hitSlop={4}
      onPress={() => setLogoutModalVisible(true)}
      accessibilityRole="button"
      accessibilityLabel="Keluar dari akun asisten"
      style={({ pressed }) => [
        styles.sideBtn,
        pressed && styles.sideBtnPressed,
      ]}
    >
      <Icon name="log-out-outline" size={20} color={Colors.danger} />
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <Tabs
        tabBar={(props) => (
          <FloatingTabBar {...props} rightAccessory={logoutButton} />
        )}
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
        <Tabs.Screen
          name="maps"
          options={{
            title: 'Peta Lab',
            tabBarIcon: ({ focused, color, size }) => (
              <Icon
                name={focused ? 'map' : 'map-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tabs>

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
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.dangerBg,
    borderWidth: 1.2,
    borderColor: Colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.floatingNav,
  },
  sideBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
