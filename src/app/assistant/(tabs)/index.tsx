import { Href, router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { SessionCard } from '@/features/sessions/components/SessionCard';
import { useCurrentUser, useSessions } from '@/store/hooks';
import { SessionStatus } from '@/types/attendance';

type FilterOption = 'ALL' | SessionStatus;

export default function AssistantScheduleRoute() {
  const { currentUser } = useCurrentUser();
  const { sessions } = useSessions();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');

  // Filter sesi yang diampu oleh asisten yang sedang aktif
  const mySessions = sessions.filter(
    (s) => s.assistantId === currentUser.id || currentUser.role !== 'ASSISTANT'
  );

  const displayedSessions = mySessions.filter((s) => {
    if (activeFilter === 'ALL') return true;
    return s.status === activeFilter;
  });

  const handleOpenDetail = (sessionId: string) => {
    router.push(`/assistant/session/${sessionId}` as Href);
  };

  return (
    <Screen withBottomNavPadding>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <AppText variant="caption" color={Colors.textMuted}>
            JADWAL MENGAJAR
          </AppText>
          <AppText variant="h1" numberOfLines={1} style={styles.title}>
            Halo, {currentUser.name.split(' ')[0]} 👋
          </AppText>
          <AppText variant="caption" color={Colors.primary} weight="semibold">
            Asisten • {currentUser.identifier}
          </AppText>
        </View>

        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Ganti peran"
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

      {/* Session List / Empty State */}
      {displayedSessions.length === 0 ? (
        <EmptyState
          title="Tidak Ada Sesi"
          message={
            activeFilter === 'ALL'
              ? 'Belum ada jadwal sesi praktikum yang Anda ampu.'
              : 'Tidak ada sesi praktikum dengan status ini.'
          }
          iconName="calendar-outline"
        />
      ) : (
        <View style={styles.sessionList}>
          <View style={styles.sectionHeader}>
            <AppText variant="title">Daftar Sesi Praktikum</AppText>
            <AppText variant="caption" color={Colors.primary} weight="semibold">
              {displayedSessions.length} Sesi
            </AppText>
          </View>

          {displayedSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              variant={session.status === 'OPEN' ? 'hero' : 'default'}
              onPress={() => handleOpenDetail(session.id)}
            />
          ))}
        </View>
      )}
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
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sessionList: {
    paddingBottom: Spacing.xl,
  },
});
