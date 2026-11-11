import { Href, router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal, FeedbackType } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { CreateSessionModal } from '@/features/sessions/components/CreateSessionModal';
import { SessionCard } from '@/features/sessions/components/SessionCard';
import { useCurrentUser, useSessions } from '@/store/hooks';
import { CreateSessionInput, SessionStatus } from '@/types/attendance';

type FilterOption = 'ALL' | SessionStatus;

export default function AssistantScheduleRoute() {
  const { currentUser } = useCurrentUser();
  const { sessions, addSession } = useSessions();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [feedbackState, setFeedbackState] = useState<{
    visible: boolean;
    type: FeedbackType;
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const handleCreateSession = (input: CreateSessionInput) => {
    const res = addSession(input);
    if (res.success) {
      setFeedbackState({
        visible: true,
        type: 'success',
        title: 'Praktikum Ditambahkan!',
        message: `Sesi ${input.courseName} (${input.classCode || 'A1'}) berhasil dijadwalkan di ${input.room}.`,
      });
    }
    return res;
  };

  // Batasan peran: Praktikan tidak boleh mengakses jadwal asisten
  if (currentUser.role !== 'ASSISTANT') {
    return (
      <Screen withBottomNavPadding>
        <EmptyState
          title="Akses Ditolak"
          message="Halaman ini khusus untuk Asisten Praktikum. Anda terdaftar sebagai Praktikan dan tidak memiliki izin mengakses tampilan ini."
          iconName="lock-closed-outline"
          actionLabel="Buka Jadwal Praktikan"
          onAction={() => router.replace('/student' as Href)}
        />
      </Screen>
    );
  }

  // Filter sesi yang diampu oleh asisten yang sedang aktif
  const mySessions = sessions.filter(
    (s) => s.assistantId === currentUser.id
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

      {/* Section Header with Add Practical Button */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleGroup}>
          <AppText variant="title">Daftar Sesi Praktikum</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {displayedSessions.length} Sesi Terdaftar
          </AppText>
        </View>

        <CustomButton
          title="Tambah Sesi"
          size="sm"
          variant="primary"
          fullWidth={false}
          style={styles.addButton}
          icon={<Icon name="add" size={16} color={Colors.textWhite} />}
          onPress={() => setCreateModalVisible(true)}
        />
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
          actionLabel="Tambah Sesi Praktikum Baru"
          onAction={() => setCreateModalVisible(true)}
        />
      ) : (
        <View style={styles.sessionList}>
          {displayedSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              variant={session.status === 'OPEN' ? 'hero' : 'default'}
              actionLabel="Kelola Sesi"
              actionIcon="arrow-forward"
              onPress={() => handleOpenDetail(session.id)}
            />
          ))}
        </View>
      )}

      {/* Create Session Modal */}
      <CreateSessionModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreateSession}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        visible={feedbackState.visible}
        type={feedbackState.type}
        title={feedbackState.title}
        message={feedbackState.message}
        primaryLabel="Mengerti"
        onPrimary={() => setFeedbackState((prev) => ({ ...prev, visible: false }))}
        onClose={() => setFeedbackState((prev) => ({ ...prev, visible: false }))}
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
  sectionTitleGroup: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  addButton: {
    flexShrink: 0,
  },
  sessionList: {
    paddingBottom: Spacing.xl,
  },
});
