import { Href, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal, FeedbackType } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { LiveClock } from '@/components/ui/LiveClock';
import { Screen } from '@/components/ui/Screen';
import {
  Colors,
  HandGestureName,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from '@/constants/theme';
import { SessionCard } from '@/features/sessions/components/SessionCard';
import { subscribeAllClasses } from '@/services/admin';
import { subscribeStudentAttendance } from '@/services/attendance';
import { signOutUser } from '@/services/auth';
import { PermitRequest, subscribeStudentPermits } from '@/services/permits';
import {
  confirmJoinClassAsStudent,
  leaveClassAsStudent,
  lookupClassByInviteCode,
  PracticalClass,
  subscribeStudentSessions,
} from '@/services/sessions';
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';
import {
  AttendanceRecord,
  PracticalSession,
  SessionStatus,
} from '@/types/attendance';

type FilterOption = 'ALL' | SessionStatus;

function resolveEmptyGesture(filter: FilterOption): HandGestureName {
  if (filter === 'NOT_STARTED') return 'handTimer';
  if (filter === 'CLOSED') return 'handLocked';
  return 'peace';
}

export default function StudentScheduleRoute() {
  const { currentUser, setCurrentUser } = useCurrentUser();
  const { sessions } = useSessions();
  const { isAlreadyAttended } = useAttendance();

  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [firestoreSessions, setFirestoreSessions] = useState<PracticalSession[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<AttendanceRecord[]>([]);
  const [studentPermits, setStudentPermits] = useState<PermitRequest[]>([]);
  const [allClasses, setAllClasses] = useState<PracticalClass[]>([]);

  // State Gabung Kelas via Kode Kelas Praktikan (dengan Konfirmasi Nama Kelas & Nama Asprak)
  const [joinClassModalVisible, setJoinClassModalVisible] = useState(false);
  const [classCodeInput, setClassCodeInput] = useState('');
  const [previewClassToJoin, setPreviewClassToJoin] =
    useState<PracticalClass | null>(null);
  const [joiningClass, setJoiningClass] = useState(false);

  // State Konfirmasi Keluar dari Kelas
  const [classToLeave, setClassToLeave] = useState<PracticalClass | null>(null);

  const [feedback, setFeedback] = useState<{
    visible: boolean;
    type: FeedbackType;
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  // Berlangganan daftar kelas, sesi praktikum & kehadiran secara real-time
  useEffect(() => {
    if (!currentUser.id) return;

    const unsubClasses = subscribeAllClasses((clsList) => {
      setAllClasses(clsList);
    });

    const unsubSessions = subscribeStudentSessions(
      currentUser.id,
      currentUser.enrolledClasses || [],
      (loaded) => {
        setFirestoreSessions(loaded);
      }
    );

    const unsubAttendance = subscribeStudentAttendance(
      currentUser.id,
      (records) => {
        setStudentAttendance(records);
      }
    );

    const unsubPermits = subscribeStudentPermits(
      currentUser.id,
      (permits) => {
        setStudentPermits(permits);
      }
    );

    return () => {
      unsubClasses();
      unsubSessions();
      unsubAttendance();
      unsubPermits();
    };
  }, [currentUser.id, currentUser.enrolledClasses]);

  // Daftar kelas yang diikuti praktikan saat ini (berdasarkan studentIds di kelas atau enrolledClasses lama)
  const myJoinedClasses = allClasses.filter((cls) => {
    const inStudentIds = (cls.studentIds || []).includes(currentUser.id);
    const inEnrolledCodes = (currentUser.enrolledClasses || [])
      .map((c) => c.toUpperCase())
      .includes(cls.classCode.toUpperCase());
    return inStudentIds || inEnrolledCodes;
  });

  const joinedClassIds = myJoinedClasses.map((c) => c.id);
  const joinedClassCodes = Array.from(
    new Set([
      ...myJoinedClasses.map((c) => c.classCode.toUpperCase()),
      ...(currentUser.enrolledClasses || []).map((c) => c.toUpperCase()),
    ])
  );

  // Step 1: Praktikan Memasukkan Kode Kelas -> Tampilkan Pratinjau Nama Kelas & Nama Asprak
  const handleLookupStudentCode = async () => {
    setJoiningClass(true);
    try {
      const found = await lookupClassByInviteCode(classCodeInput, 'STUDENT');
      setPreviewClassToJoin(found);
    } catch (err: any) {
      setFeedback({
        visible: true,
        type: 'warning',
        title: 'Kode Kelas Tidak Ditemukan',
        message:
          err?.message ||
          'Kode kelas praktikum tidak ditemukan. Pastikan kode yang diberikan asisten sudah benar.',
      });
    } finally {
      setJoiningClass(false);
    }
  };

  // Step 2: Praktikan Konfirmasi Gabung Kelas
  const handleConfirmJoinStudentClass = async () => {
    if (!previewClassToJoin) return;
    setJoiningClass(true);
    try {
      const joined = await confirmJoinClassAsStudent(
        previewClassToJoin,
        currentUser.id
      );
      const nextCodes = Array.from(
        new Set([
          ...(currentUser.enrolledClasses || []),
          joined.classCode.toUpperCase(),
        ])
      );
      setCurrentUser({
        ...currentUser,
        enrolledClasses: nextCodes,
      });

      setJoinClassModalVisible(false);
      setPreviewClassToJoin(null);
      setClassCodeInput('');

      const asprakNames =
        joined.assistantNames && joined.assistantNames.length > 0
          ? joined.assistantNames.join(', ')
          : joined.assistantName;

      setFeedback({
        visible: true,
        type: 'success',
        title: 'Berhasil Gabung Kelas!',
        message: `Anda telah terdaftar di kelas ${joined.courseName} (Kelas ${joined.classCode}) yang diampu oleh Asprak ${asprakNames}. Semua sesi praktikum kelas ini akan otomatis muncul di jadwal Anda.`,
      });
    } catch (err: any) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Gagal Bergabung',
        message: err?.message || 'Terjadi kesalahan saat bergabung ke kelas.',
      });
    } finally {
      setJoiningClass(false);
    }
  };

  // Praktikan Keluar dari Kelas
  const handleConfirmLeaveClass = async () => {
    if (!classToLeave) return;
    const target = classToLeave;
    setClassToLeave(null);
    try {
      await leaveClassAsStudent(target, currentUser.id);
      const remainingOtherSameCode = myJoinedClasses.some(
        (c) =>
          c.id !== target.id &&
          c.classCode.toUpperCase() === target.classCode.toUpperCase()
      );
      const nextEnrolled = remainingOtherSameCode
        ? currentUser.enrolledClasses || []
        : (currentUser.enrolledClasses || []).filter(
            (code) => code.toUpperCase() !== target.classCode.toUpperCase()
          );

      setCurrentUser({
        ...currentUser,
        enrolledClasses: nextEnrolled,
      });

      setFeedback({
        visible: true,
        type: 'info',
        title: 'Keluar dari Kelas',
        message: `Anda telah keluar dari kelas ${target.courseName} (Kelas ${target.classCode}). Jika Anda pindah jadwal kelas, silakan masukkan Kode Kelas baru dari asisten.`,
      });
    } catch (err: any) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Gagal Keluar Kelas',
        message: err?.message || 'Terjadi kesalahan sistem.',
      });
    }
  };

  const hasAttended = (sessionId: string) => {
    return (
      studentAttendance.some((r) => r.sessionId === sessionId) ||
      isAlreadyAttended(sessionId, currentUser.id)
    );
  };

  const getPermitStatus = (
    sessionId: string
  ): 'PENDING' | 'APPROVED' | 'REJECTED' | undefined => {
    const found = studentPermits.find(
      (p) => p.sessionId === sessionId && p.status !== 'REJECTED'
    );
    return found?.status;
  };

  const rawSessions =
    firestoreSessions.length > 0 ? firestoreSessions : sessions;

  // Filter sesi: Praktikan melihat sesi dari kelas yang sudah di-join via kode
  const sourceSessions = rawSessions.filter((s) => {
    if (myJoinedClasses.length === 0 && joinedClassCodes.length === 0) {
      return false;
    }
    if (s.classId && joinedClassIds.includes(s.classId)) {
      return true;
    }
    return myJoinedClasses.some(
      (cls) =>
        cls.classCode.toUpperCase() === (s.classCode || '').toUpperCase() &&
        (!cls.courseName ||
          !s.courseName ||
          cls.courseName.toLowerCase() === s.courseName.toLowerCase() ||
          cls.courseName.toLowerCase().includes('praktikum'))
    ) || joinedClassCodes.includes((s.classCode || '').toUpperCase());
  });

  const filteredSessions = sourceSessions.filter((s) => {
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

      {/* Live Real-time Clock */}
      <LiveClock variant="light" />

      {/* Kartu Kelas Praktikum Saya + Tombol "+ Gabung Kelas" */}
      <View style={styles.myClassesCard}>
        <View style={styles.myClassesHeader}>
          <View style={styles.myClassesTitleGroup}>
            <Icon name="school" size={18} color={Colors.primary} />
            <AppText variant="caption" weight="bold" color={Colors.primaryDark}>
              KELAS PRAKTIKUM SAYA ({myJoinedClasses.length})
            </AppText>
          </View>

          <Pressable
            style={styles.joinClassBtn}
            onPress={() => {
              setClassCodeInput('');
              setPreviewClassToJoin(null);
              setJoinClassModalVisible(true);
            }}
          >
            <Icon name="add" size={15} color={Colors.textWhite} />
            <AppText variant="caption" weight="bold" color={Colors.textWhite}>
              Gabung Kelas
            </AppText>
          </Pressable>
        </View>

        {myJoinedClasses.length === 0 ? (
          <AppText variant="caption" color={Colors.textMuted}>
            Anda belum tergabung di kelas praktikum. Klik &quot;+ Gabung Kelas&quot; dan masukkan Kode Kelas dari asisten praktikum.
          </AppText>
        ) : (
          <View style={styles.joinedClassList}>
            {myJoinedClasses.map((cls) => {
              const asprakNames =
                cls.assistantNames && cls.assistantNames.length > 0
                  ? cls.assistantNames.join(', ')
                  : cls.assistantName;
              return (
                <View key={cls.id} style={styles.joinedClassItem}>
                  <View style={styles.joinedClassInfo}>
                    <AppText variant="bodySm" weight="bold" color={Colors.text}>
                      {cls.courseName || 'Praktikum'} • Kelas {cls.classCode}
                    </AppText>
                    <AppText variant="caption" color={Colors.primaryDark} weight="medium">
                      👨‍🏫 Asprak: {asprakNames}
                    </AppText>
                    <AppText variant="caption" color={Colors.textMuted}>
                      📍 {cls.room || 'Lab D'} • Kode: {cls.studentJoinCode}
                    </AppText>
                  </View>

                  <Pressable
                    onPress={() => setClassToLeave(cls)}
                    style={styles.leaveBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Keluar dari kelas ${cls.classCode}`}
                  >
                    <Icon name="exit-outline" size={16} color={Colors.danger} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
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
          title={
            myJoinedClasses.length === 0
              ? 'Belum Tergabung di Kelas'
              : 'Belum Ada Sesi Praktikum'
          }
          message={
            myJoinedClasses.length === 0
              ? 'Masukkan Kode Kelas yang diberikan oleh asisten praktikum agar jadwal sesi otomatis masuk ke akun Anda.'
              : activeFilter === 'ALL'
              ? `Saat ini belum ada jadwal praktikum yang dibuat asisten untuk kelas yang Anda ikuti.`
              : 'Tidak ada sesi praktikum dengan status ini.'
          }
          gestureName={resolveEmptyGesture(activeFilter)}
          actionLabel={
            myJoinedClasses.length === 0
              ? 'Gabung Kelas dengan Kode'
              : activeFilter !== 'ALL'
              ? 'Lihat Semua'
              : undefined
          }
          onAction={
            myJoinedClasses.length === 0
              ? () => {
                  setClassCodeInput('');
                  setPreviewClassToJoin(null);
                  setJoinClassModalVisible(true);
                }
              : activeFilter !== 'ALL'
              ? () => setActiveFilter('ALL')
              : undefined
          }
        />
      ) : (
        <>
          {activeSession ? (
            <SessionCard
              session={activeSession}
              attended={hasAttended(activeSession.id)}
              permitStatus={getPermitStatus(activeSession.id)}
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
                  attended={hasAttended(session.id)}
                  permitStatus={getPermitStatus(session.id)}
                  onPress={() => handleOpenSession(session.id)}
                />
              ))}
            </>
          ) : null}
        </>
      )}

      {/* Modal Gabung Kelas Praktikan via Kode Kelas (dengan Konfirmasi Nama Kelas & Nama Asprak) */}
      <Modal
        visible={joinClassModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setJoinClassModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setJoinClassModalVisible(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeaderRow}>
            <View>
              <AppText variant="caption" weight="bold" color={Colors.primary}>
                GABUNG RUANG KELAS
              </AppText>
              <AppText variant="title" weight="bold">
                Masukkan Kode Kelas
              </AppText>
            </View>
            <Pressable
              onPress={() => setJoinClassModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Icon name="close" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {!previewClassToJoin ? (
            <>
              <AppText variant="caption" color={Colors.textMuted} style={styles.modalSubText}>
                Mintalah Kode Kelas Praktikan (contoh: PPK-C1-103, SDA-B2-102, BDL-A1-101) kepada asisten praktikum Anda.
              </AppText>

              <View style={styles.modalFieldGroup}>
                <AppText variant="label">KODE KELAS PRAKTIKUM *</AppText>
                <TextInput
                  value={classCodeInput}
                  onChangeText={(txt) => setClassCodeInput(txt.toUpperCase())}
                  placeholder="Contoh: PPK-C1-103"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="characters"
                  style={styles.modalInput}
                />
              </View>

              <View style={styles.modalFooterBtns}>
                <CustomButton
                  title="Batal"
                  variant="outline"
                  size="md"
                  style={styles.flexBtn}
                  onPress={() => setJoinClassModalVisible(false)}
                />
                <CustomButton
                  title="Cek Kelas"
                  variant="primary"
                  size="md"
                  loading={joiningClass}
                  style={styles.flexBtn}
                  onPress={handleLookupStudentCode}
                />
              </View>
            </>
          ) : (
            <>
              <AppText variant="caption" color={Colors.textSecondary} style={styles.modalSubText}>
                Periksa kembali informasi kelas praktikum dan asisten pengampu di bawah ini sebelum bergabung:
              </AppText>

              <View style={styles.previewConfirmCard}>
                <View style={styles.previewBadgeRow}>
                  <Badge
                    label={`Kelas ${previewClassToJoin.classCode}`}
                    variant="primary"
                    size="sm"
                  />
                  <Badge
                    label={`Kode: ${previewClassToJoin.studentJoinCode}`}
                    variant="open"
                    size="sm"
                  />
                </View>

                <AppText variant="h2" weight="bold" color={Colors.text}>
                  {previewClassToJoin.courseName || 'Praktikum'}
                </AppText>

                <View style={styles.previewMetaList}>
                  <View style={styles.previewMetaRow}>
                    <Icon name="people-outline" size={16} color={Colors.primary} />
                    <AppText variant="bodySm" color={Colors.textSecondary}>
                      Asisten Praktikum:{' '}
                      <AppText variant="bodySm" weight="bold" color={Colors.primaryDark}>
                        {(previewClassToJoin.assistantNames &&
                        previewClassToJoin.assistantNames.length > 0
                          ? previewClassToJoin.assistantNames.join(', ')
                          : previewClassToJoin.assistantName) || 'Belum Ditugaskan'}
                      </AppText>
                    </AppText>
                  </View>

                  <View style={styles.previewMetaRow}>
                    <Icon name="location-outline" size={16} color={Colors.primary} />
                    <AppText variant="bodySm" color={Colors.textSecondary}>
                      Ruangan Lab: {previewClassToJoin.room || 'Lab D'}
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={styles.modalFooterBtns}>
                <CustomButton
                  title="Ganti Kode"
                  variant="outline"
                  size="md"
                  style={styles.flexBtn}
                  onPress={() => setPreviewClassToJoin(null)}
                />
                <CustomButton
                  title="Ya, Gabung Kelas Ini"
                  variant="primary"
                  size="md"
                  loading={joiningClass}
                  style={styles.flexBtn}
                  onPress={handleConfirmJoinStudentClass}
                />
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Modal Konfirmasi Keluar dari Kelas */}
      <FeedbackModal
        visible={Boolean(classToLeave)}
        type="warning"
        title="Keluar dari Kelas Praktikum?"
        message={
          classToLeave
            ? `Apakah Anda yakin ingin keluar dari kelas ${classToLeave.courseName} (Kelas ${classToLeave.classCode})? Anda dapat masuk ke kelas baru kapan saja menggunakan Kode Kelas.`
            : ''
        }
        primaryLabel="Ya, Keluar Kelas"
        secondaryLabel="Batal"
        onPrimary={handleConfirmLeaveClass}
        onSecondary={() => setClassToLeave(null)}
        onClose={() => setClassToLeave(null)}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        visible={feedback.visible}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        primaryLabel="Mengerti"
        onPrimary={() => setFeedback((prev) => ({ ...prev, visible: false }))}
        onClose={() => setFeedback((prev) => ({ ...prev, visible: false }))}
      />

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
  myClassesCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  myClassesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  myClassesTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  joinClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  joinedClassList: {
    gap: Spacing.xs,
  },
  joinedClassItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 4,
    gap: Spacing.xs,
  },
  joinedClassInfo: {
    flex: 1,
    gap: 2,
  },
  leaveBtn: {
    width: 32,
    height: 32,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  modalCloseBtn: {
    padding: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
  },
  modalSubText: {
    marginBottom: Spacing.md,
  },
  modalFieldGroup: {
    marginBottom: Spacing.md,
    gap: 6,
  },
  modalInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.md,
    color: Colors.text,
  },
  modalFooterBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  flexBtn: {
    flex: 1,
  },
  previewConfirmCard: {
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewMetaList: {
    gap: 6,
    marginTop: Spacing.xs,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
