import { Href, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal, FeedbackType } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { LiveClock } from '@/components/ui/LiveClock';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { CreateSessionModal } from '@/features/sessions/components/CreateSessionModal';
import { SessionCard } from '@/features/sessions/components/SessionCard';
import { subscribeAllClasses } from '@/services/admin';
import {
  createSession,
  PracticalClass,
  subscribeAssistantSessions,
} from '@/services/sessions';
import { useCurrentUser, useSessions } from '@/store/hooks';
import {
  CreateSessionInput,
  PracticalSession,
  SessionStatus,
} from '@/types/attendance';

type FilterOption = 'ALL' | SessionStatus;

export default function AssistantScheduleRoute() {
  const { currentUser } = useCurrentUser();
  const { sessions, addSession } = useSessions();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
  const [selectedClassTab, setSelectedClassTab] = useState<string>('ALL');
  const [firestoreSessions, setFirestoreSessions] = useState<PracticalSession[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<PracticalClass[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [classesExpanded, setClassesExpanded] = useState(false);

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

  // Berlangganan real-time jadwal sesi & kelas yang menjadi tanggung jawab Asprak (SRS-S4-03)
  useEffect(() => {
    if (!currentUser.id || currentUser.role !== 'ASSISTANT') return;

    const unsubSessions = subscribeAssistantSessions(
      currentUser.id,
      (records) => {
        setFirestoreSessions(records);
      },
      currentUser.name
    );

    const unsubClasses = subscribeAllClasses((classList) => {
      const firstName = (currentUser.name || '')
        .toLowerCase()
        .split(' ')[0];
      const myCls = classList.filter((c) => {
        const ids = c.assistantIds || (c.assistantId ? [c.assistantId] : []);
        const names =
          c.assistantNames || (c.assistantName ? [c.assistantName] : []);
        const matchId = ids.includes(currentUser.id);
        const matchName =
          Boolean(firstName) &&
          names.some((n) => n.toLowerCase().includes(firstName));
        return matchId || matchName;
      });
      setAssignedClasses(myCls);
    });

    return () => {
      unsubSessions();
      unsubClasses();
    };
  }, [currentUser.id, currentUser.name, currentUser.role]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 350);
  };

  const handleCreateSession = async (input: CreateSessionInput) => {
    try {
      const finalClassCode = (
        input.classCode ||
        (selectedClassTab !== 'ALL' ? selectedClassTab : 'A1')
      )
        .trim()
        .toUpperCase();
      const matchedClass = assignedClasses.find(
        (c) =>
          c.id === input.classId ||
          (c.classCode.toUpperCase() === finalClassCode &&
            (c.courseName || '').toLowerCase() ===
              input.courseName.trim().toLowerCase()) ||
          c.classCode.toUpperCase() === finalClassCode
      );
      const finalDate =
        input.date?.trim() || new Date().toISOString().split('T')[0];
      const finalDeliveryMode = input.deliveryMode || 'OFFLINE';
      const finalRoom =
        finalDeliveryMode === 'ONLINE'
          ? input.room?.trim() || 'Daring (Google Meet / Zoom)'
          : input.room.trim();

      const assistantDisplayNames =
        matchedClass?.assistantNames && matchedClass.assistantNames.length > 0
          ? matchedClass.assistantNames.join(', ')
          : currentUser.name;

      const newSessionData: Omit<PracticalSession, 'id'> = {
        classId: matchedClass?.id || input.classId,
        courseName: input.courseName.trim(),
        classCode: finalClassCode,
        room: finalRoom,
        timeSlot: `${input.startTime.trim()} - ${input.endTime.trim()} WIB`,
        date: finalDate,
        status: 'NOT_STARTED',
        assistantId: currentUser.id,
        assistantName: assistantDisplayNames,
        totalStudents:
          input.totalStudents ??
          (matchedClass?.studentIds?.length
            ? Math.max(matchedClass.studentIds.length, 25)
            : 30),
        deliveryMode: finalDeliveryMode,
        meetingLink: input.meetingLink?.trim() || undefined,
        description: input.description?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await createSession(newSessionData);

      addSession({
        ...input,
        classId: matchedClass?.id || input.classId,
        classCode: finalClassCode,
        room: finalRoom,
        date: finalDate,
      });

      setFeedbackState({
        visible: true,
        type: 'success',
        title: 'Praktikum Ditambahkan!',
        message: `Sesi ${input.courseName} (Kelas ${finalClassCode}) berhasil dijadwalkan untuk ${finalDate} di ${finalRoom}.`,
      });
      return { success: true, message: 'Berhasil' };
    } catch (err: any) {
      const msg = err?.message || 'Gagal menyimpan sesi ke Cloud Firestore.';
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Gagal Menambah Sesi',
        message: msg,
      });
      return { success: false, message: msg };
    }
  };

  if (currentUser.role !== 'ASSISTANT') {
    return (
      <Screen withBottomNavPadding>
        <EmptyState
          title="Akses Ditolak"
          message="Halaman ini khusus untuk Asisten Praktikum (Asprak). Anda tidak memiliki izin mengakses tampilan ini."
          iconName="lock-closed-outline"
          actionLabel="Kembali"
          onAction={() => router.replace('/' as Href)}
        />
      </Screen>
    );
  }

  const myClassCodes = assignedClasses.map((c) => c.classCode.toUpperCase());
  const myClassIds = assignedClasses.map((c) => c.id);

  // Filter ketat hanya untuk kelas & sesi tanggung jawab Asprak (SRS-S4-03)
  const allCandidateSessions =
    firestoreSessions.length > 0 ? firestoreSessions : sessions;

  const sourceSessions = allCandidateSessions.filter((s) => {
    const isDirectOwner =
      s.assistantId === currentUser.id ||
      (s.assistantName || '')
        .toLowerCase()
        .includes((currentUser.name || '').toLowerCase().split(' ')[0]);
    const isCoAssistantClass =
      (s.classId && myClassIds.includes(s.classId)) ||
      myClassCodes.includes((s.classCode || '').toUpperCase());
    return isDirectOwner || isCoAssistantClass;
  });

  const classTabOptions: string[] = Array.from(
    new Set([
      ...assignedClasses.map((c) => c.classCode),
      ...sourceSessions.map((s) => s.classCode).filter(Boolean),
    ])
  ).sort();

  const classFilteredSessions = sourceSessions.filter((s) => {
    if (selectedClassTab === 'ALL') return true;
    return (s.classCode || '').toUpperCase() === selectedClassTab.toUpperCase();
  });

  const displayedSessions = classFilteredSessions.filter((s) => {
    if (activeFilter === 'ALL') return true;
    return s.status === activeFilter;
  });

  const displayedClasses = classesExpanded
    ? assignedClasses
    : assignedClasses.slice(0, 2);

  const handleOpenDetail = (sessionId: string) => {
    router.push(`/assistant/session/${sessionId}` as Href);
  };

  return (
    <Screen
      withBottomNavPadding
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <AppText variant="caption" color={Colors.textMuted}>
            PELAKSANAAN PRAKTIKUM (ASPRAK)
          </AppText>
          <AppText variant="h1" numberOfLines={1} style={styles.title}>
            Halo, {currentUser.name.split(' ')[0]}
          </AppText>
          <AppText variant="caption" color={Colors.primary} weight="semibold">
            Asprak • {currentUser.identifier}
          </AppText>
        </View>
      </View>

      {/* Live Real-Time Clock */}
      <LiveClock variant="light" />

      {/* Ringkasan Kelas & Lab Tanggung Jawab Asprak (Read-Only — SRS-S4-03) */}
      <View style={styles.classroomSectionCard}>
        <View style={styles.classroomTopRow}>
          <View style={styles.assignedHeader}>
            <Icon name="school" size={18} color={Colors.primary} />
            <AppText
              variant="caption"
              weight="bold"
              color={Colors.primaryDark}
              style={styles.assignedHeaderText}
            >
              KELAS TANGGUNG JAWAB SAYA ({assignedClasses.length})
            </AppText>
          </View>
        </View>

        {assignedClasses.length === 0 ? (
          <View style={styles.emptyClassroomBox}>
            <AppText variant="caption" color={Colors.textMuted} align="center">
              Belum ada kelas yang ditetapkan kepada Anda. Hubungi Aslab untuk
              penugasan kelas/laboratorium.
            </AppText>
          </View>
        ) : (
          <View style={styles.classBadgeList}>
            {displayedClasses.map((cls) => {
              const assistantsList =
                cls.assistantNames && cls.assistantNames.length > 0
                  ? cls.assistantNames.join(', ')
                  : cls.assistantName;
              return (
                <View key={cls.id} style={styles.classroomItemCard}>
                  <View style={styles.classroomTitleCol}>
                    <AppText variant="bodySm" weight="bold" color={Colors.text}>
                      {cls.courseName || 'Praktikum'} • Kelas {cls.classCode}
                    </AppText>
                    <AppText variant="caption" color={Colors.textSecondary}>
                      Lokasi: {cls.room || 'Lab D'} •{' '}
                      {cls.studentIds?.length || 0} Praktikan
                    </AppText>
                    <AppText
                      variant="caption"
                      color={Colors.primaryDark}
                      weight="medium"
                    >
                      Asprak: {assistantsList}
                    </AppText>
                  </View>
                </View>
              );
            })}

            {assignedClasses.length > 2 ? (
              <Pressable
                onPress={() => setClassesExpanded((prev) => !prev)}
                accessibilityRole="button"
                style={styles.toggleClassesBtn}
              >
                <AppText variant="caption" weight="semibold" color={Colors.primary}>
                  {classesExpanded
                    ? 'Tampilkan lebih sedikit'
                    : `Lihat semua (${assignedClasses.length} kelas)`}
                </AppText>
                <Icon
                  name={classesExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={Colors.primary}
                />
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      {/* Pilihan Filter Tab Kelas */}
      <View style={styles.classSelectorWrap}>
        <View style={styles.classSelectorHeader}>
          <Icon name="layers-outline" size={16} color={Colors.primary} />
          <AppText variant="caption" weight="bold" color={Colors.primary}>
            FILTER SESI PER KELAS
          </AppText>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.classTabsScroll}
        >
          <Pressable
            style={[
              styles.classTabChip,
              selectedClassTab === 'ALL' && styles.classTabChipActive,
            ]}
            onPress={() => setSelectedClassTab('ALL')}
          >
            <AppText
              variant="caption"
              weight={selectedClassTab === 'ALL' ? 'bold' : 'regular'}
              color={
                selectedClassTab === 'ALL'
                  ? Colors.textWhite
                  : Colors.textSecondary
              }
            >
              Semua Kelas
            </AppText>
          </Pressable>

          {classTabOptions.map((code) => {
            const isTabActive =
              selectedClassTab.toUpperCase() === code.toUpperCase();
            return (
              <Pressable
                key={code}
                style={[
                  styles.classTabChip,
                  isTabActive && styles.classTabChipActive,
                ]}
                onPress={() => setSelectedClassTab(code)}
              >
                <AppText
                  variant="caption"
                  weight={isTabActive ? 'bold' : 'regular'}
                  color={isTabActive ? Colors.textWhite : Colors.textSecondary}
                >
                  Kelas {code}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter Status Sesi */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterScrollContent}
      >
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
      </ScrollView>

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
              ? 'Belum ada jadwal sesi praktikum pada kelas yang Anda ampu.'
              : 'Tidak ada sesi praktikum dengan status ini.'
          }
          iconName="calendar-outline"
          actionLabel="Tambah Sesi Praktikum Baru"
          onAction={() => setCreateModalVisible(true)}
        />
      ) : (
        <View>
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
        defaultClassCode={
          selectedClassTab !== 'ALL'
            ? selectedClassTab
            : classTabOptions[0] || 'A1'
        }
        availableClasses={
          classTabOptions.length > 0
            ? classTabOptions
            : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2']
        }
        classObjects={assignedClasses}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        visible={feedbackState.visible}
        type={feedbackState.type}
        title={feedbackState.title}
        message={feedbackState.message}
        primaryLabel="Mengerti"
        onPrimary={() =>
          setFeedbackState((prev) => ({ ...prev, visible: false }))
        }
        onClose={() =>
          setFeedbackState((prev) => ({ ...prev, visible: false }))
        }
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
  },
  title: {
    marginTop: 2,
    marginBottom: 2,
  },
  classroomSectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  classroomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  assignedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  assignedHeaderText: {
    flexShrink: 1,
  },
  emptyClassroomBox: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
  },
  classBadgeList: {
    gap: Spacing.sm,
  },
  classroomItemCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm + 2,
  },
  classroomTitleCol: {
    gap: Spacing.xxs,
  },
  toggleClassesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs + 2,
    marginTop: Spacing.xxs,
  },
  classSelectorWrap: {
    marginBottom: Spacing.md,
  },
  classSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  classTabsScroll: {
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  classTabChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  classTabChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterScroll: {
    marginBottom: Spacing.lg,
  },
  filterScrollContent: {
    flexDirection: 'row',
    gap: Spacing.xs,
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
});
