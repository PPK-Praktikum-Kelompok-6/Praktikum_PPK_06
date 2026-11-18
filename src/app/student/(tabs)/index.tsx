import { Href, router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import {
  Colors,
  HandGestureName,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { SessionCard } from '@/features/sessions/components/SessionCard';
import { signOutUser } from '@/services/auth';
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';
import { SessionStatus } from '@/types/attendance';

type FilterOption = 'ALL' | SessionStatus;

function resolveEmptyGesture(filter: FilterOption): HandGestureName {
  if (filter === 'NOT_STARTED') return 'handTimer';
  if (filter === 'CLOSED') return 'handLocked';
  return 'peace';
}

export default function StudentScheduleRoute() {
  const { currentUser } = useCurrentUser();
  const { sessions } = useSessions();
  const { isAlreadyAttended } = useAttendance();

  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const filteredSessions = sessions.filter((s) => {
    if (activeFilter === 'ALL') return true;
    return s.status === activeFilter;
  });

  const activeSession = filteredSessions.find((s) => s.status === 'OPEN');
  const otherSessions = filteredSessions.filter(
    (s) => s.id !== activeSession?.id
  );

  const handleOpenSession = (sessionId: string) => {
    router.push(`/student/attendance/${sessionId}` as Href);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 350);
  };

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    await signOutUser();
    router.replace('/' as Href);
  };

  return (
    <Screen
      withBottomNavPadding
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Header Greeting */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <AppText variant="caption" color={Colors.textMuted} weight="semibold">
            JADWAL PRAKTIKUM
          </AppText>
          <AppText variant="h1" numberOfLines={1} style={styles.title}>
            Halo, {currentUser.name.split(' ')[0]} 👋
          </AppText>
          <AppText variant="caption" color={Colors.primary} weight="semibold">
            Praktikan • {currentUser.identifier}
          </AppText>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setLogoutModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Keluar dari akun"
            style={styles.logoutButton}
          >
            <Icon name="log-out-outline" size={20} color={Colors.danger} />
          </Pressable>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(
          [
            { key: 'ALL', label: 'Semua' },
            { key: 'OPEN', label: 'Dibuka' },
            { key: 'NOT_STARTED', label: 'Belum Mulai' },
            { key: 'CLOSED', label: 'Ditutup' },
          ] as const
        ).map((item) => {
          const isActive = activeFilter === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(item.key)}
            >
              <AppText
                variant="caption"
                weight={isActive ? 'semibold' : 'regular'}
                color={isActive ? Colors.textWhite : Colors.textSecondary}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {filteredSessions.length === 0 ? (
        <EmptyState
          title="Belum Ada Sesi"
          message={
            activeFilter === 'ALL'
              ? 'Saat ini belum ada jadwal sesi praktikum yang terdaftar.'
              : 'Tidak ada sesi praktikum dengan status ini.'
          }
          gestureName={resolveEmptyGesture(activeFilter)}
          actionLabel={activeFilter !== 'ALL' ? 'Lihat Semua' : undefined}
          onAction={
            activeFilter !== 'ALL' ? () => setActiveFilter('ALL') : undefined
          }
        />
      ) : (
        <>
          {activeSession ? (
            <SessionCard
              session={activeSession}
              attended={isAlreadyAttended(activeSession.id, currentUser.id)}
              variant="hero"
              onPress={() => handleOpenSession(activeSession.id)}
            />
          ) : null}

          {otherSessions.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <AppText variant="title">Semua Jadwal Sesi</AppText>
                <AppText
                  variant="caption"
                  color={Colors.primary}
                  weight="semibold"
                >
                  {filteredSessions.length} Sesi
                </AppText>
              </View>

              {otherSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  attended={isAlreadyAttended(session.id, currentUser.id)}
                  onPress={() => handleOpenSession(session.id)}
                />
              ))}
            </>
          ) : null}
        </>
      )}

      <FeedbackModal
        visible={logoutModalVisible}
        type="warning"
        title="Keluar dari Akun?"
        message={`Apakah Anda yakin ingin keluar dari sesi ${currentUser.name}?`}
        primaryLabel="Ya, Keluar"
        secondaryLabel="Batal"
        onPrimary={handleConfirmLogout}
        onSecondary={() => setLogoutModalVisible(false)}
        onClose={() => setLogoutModalVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  headerInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  title: {
    marginTop: 2,
    marginBottom: 2,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.dangerBg,
    borderWidth: 1.2,
    borderColor: Colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.glassSurface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
});
