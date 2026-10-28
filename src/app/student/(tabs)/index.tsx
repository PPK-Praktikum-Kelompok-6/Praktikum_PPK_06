import { Href, router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { RoleSelectorModal } from '@/features/role/components/RoleSelectorModal';
import { SessionCard } from '@/features/sessions/components/SessionCard';
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';
import { SessionStatus, UserProfile } from '@/types/attendance';

type FilterOption = 'ALL' | SessionStatus;

export default function StudentScheduleRoute() {
  const { currentUser } = useCurrentUser();
  const { sessions } = useSessions();
  const { isAlreadyAttended } = useAttendance();

  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);

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

  const handleUserSelected = (user: UserProfile) => {
    if (user.role === 'ASSISTANT') {
      router.replace('/assistant' as Href);
    }
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
        <Pressable
          onPress={() => setRoleModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Ganti profil atau peran"
          style={styles.avatar}
        >
          <Icon name="person" size={20} color={Colors.primary} />
        </Pressable>
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
          iconName="calendar-outline"
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

      <RoleSelectorModal
        visible={roleModalVisible}
        onClose={() => setRoleModalVisible(false)}
        onUserSelected={handleUserSelected}
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
  title: {
    marginTop: 2,
    marginBottom: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.glassSurface,
    borderWidth: 1.2,
    borderColor: Colors.glassBorder,
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
