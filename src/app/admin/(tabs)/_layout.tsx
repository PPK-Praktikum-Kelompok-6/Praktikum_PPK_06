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

export default function AdminTabsLayout() {
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
      accessibilityLabel="Keluar akun admin"
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
