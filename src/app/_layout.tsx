import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { subscribeAllClasses } from '@/services/admin';
import { AuthUser, getCurrentUser, onAuthChange } from '@/services/auth';
import {
  configureForegroundNotificationHandler,
  initializeNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  scheduleUpcomingSessionReminders,
  subscribeUserNotificationHistory,
  subscribeUserNotifications,
} from '@/services/notifications';
import { getExpoNotifications } from '@/services/permissions';
import { subscribeAllSessions } from '@/services/sessions';
import { AppProvider } from '@/store/AppProvider';
import { useCurrentUser } from '@/store/hooks';
import { AppNotification } from '@/types/notification';
import { formatDateIndonesian, formatTime } from '@/utils/formatTime';

function GlobalNotificationCoordinator() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentUser();
  const [authUser, setAuthUser] = useState<AuthUser | null>(() =>
    getCurrentUser()
  );
  const [classDerivedCodes, setClassDerivedCodes] = useState<string[]>([]);
  const [activeBanner, setActiveBanner] = useState<AppNotification | null>(
    null
  );
  const [notificationHistory, setNotificationHistory] = useState<
    AppNotification[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scheduledReminderCount, setScheduledReminderCount] = useState(0);
  const [inboxVisible, setInboxVisible] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange((user) => {
      setAuthUser(user);
      if (!user || user.role !== 'STUDENT') {
        setActiveBanner(null);
        setInboxVisible(false);
      }
    });
    return unsub;
  }, []);

  const activeUserId = authUser?.uid || currentUser?.id || '';
  const activeRole = authUser?.role || currentUser?.role || 'STUDENT';

  // Sinkronisasi kelas yang diikuti praktikan dari koleksi classes
  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    const unsubClasses = subscribeAllClasses((classes) => {
      const fromClasses = classes
        .filter((cls) => (cls.studentIds || []).includes(activeUserId))
        .map((cls) => cls.classCode.toUpperCase());
      setClassDerivedCodes(fromClasses);
    });

    return () => unsubClasses();
  }, [activeUserId]);

  const dynamicEnrolledClasses = React.useMemo(() => {
    if (!activeUserId) return [];
    const baseClasses =
      authUser?.enrolledClasses || currentUser?.enrolledClasses || [];
    return Array.from(
      new Set([
        ...baseClasses.map((c) => c.toUpperCase()),
        ...classDerivedCodes,
      ])
    );
  }, [
    activeUserId,
    authUser?.enrolledClasses,
    currentUser?.enrolledClasses,
    classDerivedCodes,
  ]);

  // Setup Android Notification Channels + Push Token + Firestore targeted listener + Local Reminders (SRS-S3-06)
  useEffect(() => {
    if (!activeUserId || activeRole !== 'STUDENT') {
      return;
    }

    void initializeNotificationsForUser(activeUserId);

    const unsubNotifs = subscribeUserNotifications(
      activeUserId,
      dynamicEnrolledClasses,
      (notif) => {
        setActiveBanner(notif);
      }
    );

    const unsubHistory = subscribeUserNotificationHistory(
      activeUserId,
      dynamicEnrolledClasses,
      (notifs, unread) => {
        setNotificationHistory(notifs);
        setUnreadCount(unread);
      }
    );

    const unsubSessions = subscribeAllSessions((sessions) => {
      void scheduleUpcomingSessionReminders(
        sessions,
        dynamicEnrolledClasses
      ).then((count) => {
        setScheduledReminderCount(count);
      });
    });

    return () => {
      unsubNotifs();
      unsubHistory();
      unsubSessions();
    };
  }, [activeUserId, activeRole, dynamicEnrolledClasses]);

  // Auto-hide in-app notification banner setelah 8 detik
  useEffect(() => {
    if (!activeBanner) return;
    const timer = setTimeout(() => {
      setActiveBanner(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [activeBanner]);

  // Deep Linking saat pengguna mengetuk OS Push Notification (Foreground, Background, & Killed state)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const Notifications = getExpoNotifications();
    if (!Notifications) return;

    configureForegroundNotificationHandler();
    let isMounted = true;

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!isMounted || !response) return;
        const route = response.notification.request.content.data?.route as
          | string
          | undefined;
        if (route) {
          router.push(route as any);
        }
      })
      .catch(() => {});

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        const route = data?.route as string | undefined;
        const notifId = data?.notificationId as string | undefined;
        if (notifId && activeUserId) {
          void markNotificationRead(notifId, activeUserId);
        }
        if (route) {
          router.push(route as any);
        }
      }
    );

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, [activeUserId]);

  if (!activeUserId || activeRole !== 'STUDENT') {
    return null;
  }

  const handleOpenNotificationItem = (notif: AppNotification) => {
    setInboxVisible(false);
    setActiveBanner(null);
    void markNotificationRead(notif.id, activeUserId);
    if (notif.route) {
      router.push(notif.route as any);
    }
  };

  const handleDismissBanner = () => {
    if (!activeBanner) return;
    const notifId = activeBanner.id;
    setActiveBanner(null);
    void markNotificationRead(notifId, activeUserId);
  };

  const handleMarkAllRead = () => {
    const unreadIds = notificationHistory
      .filter((n) => !(n.readBy || []).includes(activeUserId))
      .map((n) => n.id);
    void markAllNotificationsRead(unreadIds, activeUserId);
  };

  const bottomOffset = Math.max(insets.bottom, Spacing.md) + 6;

  return (
    <>
      {/* Tombol Lonceng Inbox Notifikasi Mengambang di Sisi Kiri Navigasi Bawah */}
      <Pressable
        onPress={() => setInboxVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Buka riwayat notifikasi praktikum"
        style={({ pressed }) => [
          styles.floatingBellBtn,
          { bottom: bottomOffset },
          pressed && styles.floatingBellPressed,
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

      {/* Banner In-App Real-Time di Bagian Atas Layar */}
      {activeBanner && (
        <View
          pointerEvents="box-none"
          style={[
            styles.bannerWrapper,
            { top: Math.max(insets.top, Spacing.sm) + Spacing.xs },
          ]}
        >
          <Pressable
            onPress={() => handleOpenNotificationItem(activeBanner)}
            style={styles.bannerCard}
            accessibilityRole="button"
            accessibilityLabel={`Notifikasi: ${activeBanner.title}`}
          >
            <View
              style={[
                styles.bannerIconBox,
                activeBanner.type === 'SESSION_OPENED' ||
                activeBanner.type === 'PERMIT_APPROVED'
                  ? styles.iconSuccess
                  : activeBanner.type === 'PERMIT_REJECTED'
                  ? styles.iconDanger
                  : styles.iconWarning,
              ]}
            >
              <Icon
                name={
                  activeBanner.type === 'SESSION_OPENED'
                    ? 'radio-outline'
                    : activeBanner.type === 'PERMIT_APPROVED'
                    ? 'checkmark-circle'
                    : activeBanner.type === 'PERMIT_REJECTED'
                    ? 'close-circle'
                    : 'calendar'
                }
                size={20}
                color={
                  activeBanner.type === 'SESSION_OPENED' ||
                  activeBanner.type === 'PERMIT_APPROVED'
                    ? Colors.success
                    : activeBanner.type === 'PERMIT_REJECTED'
                    ? Colors.danger
                    : Colors.warning
                }
              />
            </View>

            <View style={styles.bannerTextCol}>
              <AppText variant="caption" weight="bold" color={Colors.primary}>
                NOTIFIKASI KEGIATAN PRAKTIKUM • KETUK UNTUK MEMBUKA
              </AppText>
              <AppText variant="body" weight="bold" color={Colors.text}>
                {activeBanner.title}
              </AppText>
              <AppText
                variant="caption"
                color={Colors.textSecondary}
                numberOfLines={2}
              >
                {activeBanner.body}
              </AppText>
            </View>

            <Pressable
              onPress={handleDismissBanner}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Tutup notifikasi"
            >
              <Icon name="close" size={18} color={Colors.textMuted} />
            </Pressable>
          </Pressable>
        </View>
      )}

      {/* Modal Pusat & Riwayat Notifikasi Praktikan */}
      <Modal
        visible={inboxVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInboxVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setInboxVisible(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleCol}>
                <AppText variant="caption" weight="bold" color={Colors.primary}>
                  PUSAT PEMBERITAHUAN TERARAH
                </AppText>
                <AppText variant="h2" weight="bold">
                  Notifikasi Praktikum
                </AppText>
              </View>
              <Pressable
                onPress={() => setInboxVisible(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Tutup riwayat notifikasi"
              >
                <Icon name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Info Pengingat Otomatis & Filter Kelas */}
            <View style={styles.reminderInfoBar}>
              <Icon name="alarm-outline" size={16} color={Colors.primary} />
              <AppText
                variant="caption"
                color={Colors.textSecondary}
                style={styles.flexText}
              >
                Filter Kelas Aktif:{' '}
                <AppText variant="caption" weight="bold" color={Colors.text}>
                  {dynamicEnrolledClasses.length > 0
                    ? dynamicEnrolledClasses.join(', ')
                    : 'Belum bergabung kelas'}
                </AppText>
                {scheduledReminderCount > 0
                  ? ` • ${scheduledReminderCount} Pengingat 15 menit pra-sesi aktif`
                  : ''}
              </AppText>
              {unreadCount > 0 && (
                <Pressable onPress={handleMarkAllRead}>
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={Colors.primary}
                  >
                    Tandai Dibaca
                  </AppText>
                </Pressable>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.inboxList}
            >
              {notificationHistory.length === 0 ? (
                <Card variant="flat" padding="lg" style={styles.emptyInboxCard}>
                  <Icon
                    name="notifications-off-outline"
                    size={28}
                    color={Colors.textMuted}
                  />
                  <AppText variant="title" weight="bold">
                    Belum Ada Notifikasi
                  </AppText>
                  <AppText
                    variant="caption"
                    color={Colors.textSecondary}
                    align="center"
                  >
                    Pemberitahuan otomatis akan muncul di sini saat asisten membuka sesi praktikum kelas Anda, mengubah jadwal, atau memutuskan permohonan izin Anda.
                  </AppText>
                </Card>
              ) : (
                notificationHistory.map((item) => {
                  const isUnread = !(item.readBy || []).includes(activeUserId);
                  const isApproved = item.type === 'PERMIT_APPROVED';
                  const isRejected = item.type === 'PERMIT_REJECTED';
                  const isOpened = item.type === 'SESSION_OPENED';

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handleOpenNotificationItem(item)}
                    >
                      <Card
                        variant="default"
                        padding="md"
                        style={[
                          styles.inboxItemCard,
                          isUnread && styles.inboxItemUnread,
                        ]}
                      >
                        <View style={styles.inboxItemTop}>
                          <Badge
                            label={
                              isOpened
                                ? 'SESI DIBUKA'
                                : isApproved
                                ? 'IZIN DISETUJUI'
                                : isRejected
                                ? 'IZIN DITOLAK'
                                : 'JADWAL BERUBAH'
                            }
                            variant={
                              isOpened || isApproved
                                ? 'open'
                                : isRejected
                                ? 'closed'
                                : 'waiting'
                            }
                            showDot={isUnread}
                          />
                          <AppText variant="caption" color={Colors.textMuted}>
                            {formatDateIndonesian(item.createdAt)} •{' '}
                            {formatTime(item.createdAt)}
                          </AppText>
                        </View>

                        <AppText variant="body" weight="bold">
                          {item.title}
                        </AppText>
                        <AppText variant="caption" color={Colors.textSecondary}>
                          {item.body}
                        </AppText>

                        <View style={styles.deepLinkHintRow}>
                          <AppText
                            variant="caption"
                            weight="bold"
                            color={Colors.primary}
                          >
                            Ketuk untuk membuka halaman terkait
                          </AppText>
                          <Icon
                            name="arrow-forward"
                            size={14}
                            color={Colors.primary}
                          />
                        </View>
                      </Card>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <CustomButton
              title="Tutup"
              variant="outline"
              size="md"
              onPress={() => setInboxVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

// Root stack. Wrapped with <AppProvider> by Zaidan.
// Detail screens (assistant/session/[id], student/attendance/[id]) are pushed
// from this stack, outside the tabs, so the back button returns correctly.
export default function RootLayout() {
  return (
    <AppProvider>
      <View style={styles.root}>
        <Stack screenOptions={{ headerShown: false }} />
        <GlobalNotificationCoordinator />
      </View>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  floatingBellBtn: {
    position: 'absolute',
    left: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.2,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9900,
    ...Shadows.floatingNav,
  },
  floatingBellPressed: {
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
  bannerWrapper: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    ...Shadows.lg,
  },
  bannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSuccess: {
    backgroundColor: Colors.successBg,
  },
  iconWarning: {
    backgroundColor: Colors.warningBg,
  },
  iconDanger: {
    backgroundColor: Colors.dangerBg,
  },
  bannerTextCol: {
    flex: 1,
    gap: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    maxHeight: '85%',
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.sm,
  },
  modalTitleCol: {
    flex: 1,
  },
  reminderInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryBorder,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  flexText: {
    flex: 1,
  },
  inboxList: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  emptyInboxCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceSecondary,
  },
  inboxItemCard: {
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inboxItemUnread: {
    borderColor: Colors.primaryBorder,
    borderWidth: 1.5,
    backgroundColor: Colors.primaryGhost,
  },
  inboxItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deepLinkHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
});
