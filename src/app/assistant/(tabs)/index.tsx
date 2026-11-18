import { Href, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal, FeedbackType } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { CreateSessionModal } from '@/features/sessions/components/CreateSessionModal';
import { SessionCard } from '@/features/sessions/components/SessionCard';
import {
  approveStudentAccount,
  rejectStudentAccount,
  subscribeAllClasses,
  subscribePendingStudents,
} from '@/services/admin';
import { AuthUser, signOutUser } from '@/services/auth';
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
  const [pendingStudents, setPendingStudents] = useState<AuthUser[]>([]);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
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

  // Berlangganan data jadwal sesi asisten, kelas penugasan, dan persetujuan mahasiswa dari Firestore
  useEffect(() => {
    if (!currentUser.id) return;
    const unsubSessions = subscribeAssistantSessions(
      currentUser.id,
      (records) => {
        setFirestoreSessions(records);
      },
      currentUser.name
    );

    const unsubClasses = subscribeAllClasses((classList) => {
      const myCls = classList.filter(
        (c) =>
          c.assistantId === currentUser.id ||
          c.assistantId === 'ast-1' ||
          (currentUser.name &&
            (c.assistantName || '')
              .toLowerCase()
              .includes(currentUser.name.toLowerCase().split(' ')[0]))
      );
      setAssignedClasses(myCls);
    });

    const unsubStudents = subscribePendingStudents((students) => {
      setPendingStudents(students);
    });

    return () => {
      unsubSessions();
      unsubClasses();
      unsubStudents();
    };
  }, [currentUser.id, currentUser.name]);

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    await signOutUser();
    router.replace('/' as Href);
  };

  const handleCreateSession = async (input: CreateSessionInput) => {
    try {
      const finalClassCode = (
        input.classCode || (selectedClassTab !== 'ALL' ? selectedClassTab : 'A1')
      )
        .trim()
        .toUpperCase();
      const newSessionData: Omit<PracticalSession, 'id'> = {
        courseName: input.courseName.trim(),
        classCode: finalClassCode,
        room: input.room.trim(),
        timeSlot: `${input.startTime.trim()} - ${input.endTime.trim()} WIB`,
        date: new Date().toISOString(),
        status: 'NOT_STARTED',
        assistantId: currentUser.id,
        assistantName: currentUser.name,
        totalStudents: input.totalStudents ?? 30,
        description: input.description?.trim() || undefined,
      };

      // 1. Tulis langsung ke Cloud Firestore
      await createSession(newSessionData);

      // 2. Selaraskan juga dengan in-memory store
      addSession({ ...input, classCode: finalClassCode });

      setFeedbackState({
        visible: true,
        type: 'success',
        title: 'Praktikum Ditambahkan!',
        message: `Sesi ${input.courseName} (Kelas ${finalClassCode}) berhasil dijadwalkan di ${input.room} dan tersimpan di Cloud Firestore.`,
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

  // Gunakan data real-time Firestore jika tersedia, atau fallback lokal
  const sourceSessions =
    firestoreSessions.length > 0
      ? firestoreSessions
      : sessions.filter(
          (s) =>
            s.assistantId === currentUser.id ||
            s.assistantId === 'ast-1' ||
            s.assistantName === currentUser.name
        );

  // Daftar opsi kelas yang diampu / tersedia untuk asisten (Requirement 2)
  const classTabOptions: string[] = Array.from(
    new Set([
      ...assignedClasses.map((c) => c.classCode),
      ...sourceSessions.map((s) => s.classCode).filter(Boolean),
    ])
  ).sort();

  // Filter sesi berdasarkan tab kelas yang dipilih
  const classFilteredSessions = sourceSessions.filter((s) => {
    if (selectedClassTab === 'ALL') return true;
    return (s.classCode || '').toUpperCase() === selectedClassTab.toUpperCase();
  });

  const displayedSessions = classFilteredSessions.filter((s) => {
    if (activeFilter === 'ALL') return true;
    return s.status === activeFilter;
  });

  const handleOpenDetail = (sessionId: string) => {
    router.push(`/assistant/session/${sessionId}` as Href);
  };

  const handleApproveStudent = async (student: AuthUser) => {
    try {
      const cls = student.requestedClass || 'C1';
      await approveStudentAccount(student.uid, cls, currentUser.name);
      setFeedbackState({
        visible: true,
        type: 'success',
        title: 'Praktikan Disetujui',
        message: `Mahasiswa ${student.name} (${student.identifier}) berhasil disetujui untuk mengikuti Kelas ${cls}.`,
      });
    } catch (err: any) {
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Gagal Menyetujui',
        message: err?.message || 'Terjadi kesalahan.',
      });
    }
  };

  const handleRejectStudent = async (student: AuthUser) => {
    try {
      await rejectStudentAccount(student.uid);
      setFeedbackState({
        visible: true,
        type: 'info',
        title: 'Pendaftaran Ditolak',
        message: `Pendaftaran mahasiswa ${student.name} telah ditolak.`,
      });
    } catch (err: any) {
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Gagal Menolak',
        message: err?.message || 'Terjadi kesalahan.',
      });
    }
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
          onPress={() => setLogoutModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Keluar dari akun asisten"
          style={styles.logoutButton}
        >
          <Icon name="log-out-outline" size={20} color={Colors.danger} />
        </Pressable>
      </View>

      {/* Tanggung Jawab Kelas Praktikum (Ditetapkan Admin) */}
      <View style={styles.assignedClassesCard}>
        <View style={styles.assignedHeader}>
          <Icon name="school" size={18} color={Colors.primary} />
          <AppText variant="caption" weight="bold" color={Colors.primaryDark}>
            TANGGUNG JAWAB KELAS (DITETAPKAN ADMIN)
          </AppText>
        </View>
        {assignedClasses.length === 0 ? (
          <AppText variant="caption" color={Colors.textMuted}>
            Belum ada kelas laboratorium yang ditugaskan oleh Admin untuk akun Anda.
          </AppText>
        ) : (
          <View style={styles.classBadgeList}>
            {assignedClasses.map((cls) => (
              <View key={cls.id} style={styles.assignedClassChip}>
                <AppText variant="caption" weight="bold" color={Colors.primary}>
                  Kelas {cls.classCode}
                </AppText>
                <AppText variant="caption" color={Colors.textSecondary}>
                  {cls.courseName} ({cls.room})
                </AppText>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Persetujuan Pendaftaran Praktikan Baru (SRS-AUTH-APPROVAL) */}
      {pendingStudents.length > 0 ? (
        <View style={styles.pendingStudentsCard}>
          <View style={styles.pendingStudentsHeader}>
            <Icon name="person-add" size={18} color={Colors.warning} />
            <AppText variant="caption" weight="bold" color={Colors.warning}>
              PERSETUJUAN PRAKTIKAN BARU ({pendingStudents.length})
            </AppText>
          </View>
          <AppText variant="caption" color={Colors.textMuted} style={styles.pendingSub}>
            Mahasiswa berikut mendaftar dan menunggu persetujuan bergabung ke kelas praktikum:
          </AppText>

          {pendingStudents.map((std) => (
            <View key={std.uid} style={styles.pendingStudentItem}>
              <View style={styles.pendingStudentInfo}>
                <AppText variant="bodySm" weight="bold">
                  {std.name}
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  NIM: {std.identifier} • Kelas Pilihan: {std.requestedClass || 'C1'}
                </AppText>
              </View>
              <View style={styles.pendingStudentActions}>
                <CustomButton
                  title="Tolak"
                  variant="outline"
                  size="sm"
                  onPress={() => handleRejectStudent(std)}
                />
                <CustomButton
                  title="Setujui"
                  variant="primary"
                  size="sm"
                  onPress={() => handleApproveStudent(std)}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Pilihan Kelas Praktikum yang Ingin Dibuka / Dikelola (Requirement 2) */}
      <View style={styles.classSelectorWrap}>
        <View style={styles.classSelectorHeader}>
          <Icon name="layers-outline" size={16} color={Colors.primary} />
          <AppText variant="caption" weight="bold" color={Colors.primary}>
            PILIH KELAS PRAKTIKUM
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
              color={selectedClassTab === 'ALL' ? Colors.textWhite : Colors.textSecondary}
            >
              Semua Kelas
            </AppText>
          </Pressable>

          {classTabOptions.map((code) => {
            const isTabActive = selectedClassTab.toUpperCase() === code.toUpperCase();
            return (
              <Pressable
                key={code}
                style={[styles.classTabChip, isTabActive && styles.classTabChipActive]}
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

      {/* Banner Konteks Kelas yang Aktif */}
      {selectedClassTab !== 'ALL' && (
        <View style={styles.activeClassBanner}>
          <Icon name="folder-open" size={16} color={Colors.primary} />
          <AppText variant="caption" weight="semibold" color={Colors.primaryDark}>
            Menampilkan sesi praktikum khusus Kelas {selectedClassTab} ({classFilteredSessions.length} sesi)
          </AppText>
        </View>
      )}

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
        defaultClassCode={selectedClassTab !== 'ALL' ? selectedClassTab : (classTabOptions[0] || 'A1')}
        availableClasses={classTabOptions.length > 0 ? classTabOptions : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2']}
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

      {/* Logout Confirmation Modal */}
      <FeedbackModal
        visible={logoutModalVisible}
        type="warning"
        title="Konfirmasi Keluar"
        message={`Apakah Anda yakin ingin keluar dari akun Asisten (${currentUser.name})?`}
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
  title: {
    marginTop: 2,
    marginBottom: 2,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.dangerBg,
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
  assignedClassesCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  assignedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  classBadgeList: {
    gap: Spacing.xs,
    marginTop: 4,
  },
  assignedClassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  pendingStudentsCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  pendingStudentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  pendingSub: {
    marginBottom: Spacing.sm,
  },
  pendingStudentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  pendingStudentInfo: {
    flex: 1,
    gap: 2,
  },
  pendingStudentActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  classSelectorWrap: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  classSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  classTabsScroll: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  classTabChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  classTabChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  activeClassBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
});
