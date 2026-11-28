import { Href, Redirect, router, Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
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
import { useNotificationInbox } from '@/store/notificationInbox';

export default function StudentTabsLayout() {
  const { currentUser } = useCurrentUser();
  const { unreadCount, openInbox } = useNotificationInbox();
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

  // Proteksi Sesi Login (SRS-AUTH-01 & SRS-AUTH-02): Jika pengguna sudah logout, arahkan ke halaman login
  if (isExplicitlySignedOut() || !activeUser || !activeId) {
    return <Redirect href="/" />;
  }

  // Guard RBAC Praktikan (SRS-AUTH-02): Arahkan asisten ke dashboard asisten
  if (activeUser.role === 'ASSISTANT') {
    return <Redirect href="/assistant" />;
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

  const bellButton = (
    <Pressable
      hitSlop={4}
      onPress={openInbox}
      accessibilityRole="button"
      accessibilityLabel="Buka riwayat notifikasi praktikum"
      style={({ pressed }) => [
        styles.sideBtn,
        styles.bellBtn,
        pressed && styles.sideBtnPressed,
      ]}
    >
      <Icon
        name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
        size={20}
        color={unreadCount > 0 ? Colors.primary : Colors.textSecondary}
      />
      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <AppText variant="caption" weight="bold" color={Colors.textWhite}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </AppText>
        </View>
      )}
    </Pressable>
  );

  const logoutButton = (
    <Pressable
      hitSlop={4}
      onPress={() => setLogoutModalVisible(true)}
      accessibilityRole="button"
      accessibilityLabel="Keluar dari akun praktikan"
      style={({ pressed }) => [
        styles.sideBtn,
        styles.logoutBtn,
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
          <FloatingTabBar
            {...props}
            leftAccessory={bellButton}
            rightAccessory={logoutButton}
          />
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
          name="history"
          options={{
            title: 'Riwayat',
            tabBarIcon: ({ focused, color, size }) => (
              <Icon
                name={focused ? 'time' : 'time-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="permit"
          options={{
            title: 'Izin',
            tabBarIcon: ({ focused, color, size }) => (
              <Icon
                name={focused ? 'document-text' : 'document-text-outline'}
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
        <Tabs.Screen
          name="fines"
          options={{
            title: 'Denda',
            tabBarIcon: ({ focused, color, size }) => (
              <Icon
                name={focused ? 'card' : 'card-outline'}
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
        title="Keluar dari Sesi Praktikan?"
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
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.floatingNav,
  },
  bellBtn: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primaryBorder,
  },
  logoutBtn: {
    backgroundColor: Colors.dangerBg,
    borderColor: Colors.dangerBorder,
  },
  sideBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.danger,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
});
