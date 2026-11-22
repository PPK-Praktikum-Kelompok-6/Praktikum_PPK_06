import { Href, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
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
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { CreateSessionModal } from '@/features/sessions/components/CreateSessionModal';
import { SessionCard } from '@/features/sessions/components/SessionCard';
import { subscribeAllClasses } from '@/services/admin';
import { signOutUser } from '@/services/auth';
import {
  confirmJoinClassAsAssistant,
  createClassroomByAssistant,
  createSession,
  leaveClassAsAssistant,
  lookupClassByInviteCode,
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

const PRESET_COURSE_NAMES = [
  'Pemrograman Perangkat Keras',
  'Basis Data Lanjut',
  'Struktur Data & Algoritma',
  'Pemrograman Web & Mobile',
  'Jaringan Komputer',
];

const PRESET_CLASS_CODES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'];

const PRESET_LAB_ROOMS = [
  'Lab Basis Data',
  'Lab Komputer 1',
  'Lab Komputer 2',
  'Lab Jaringan',
];

export default function AssistantScheduleRoute() {
  const { currentUser } = useCurrentUser();
  const { sessions, addSession } = useSessions();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
  const [selectedClassTab, setSelectedClassTab] = useState<string>('ALL');
  const [firestoreSessions, setFirestoreSessions] = useState<PracticalSession[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<PracticalClass[]>([]);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // State Buat Kelas Praktikum Baru (ala Google Classroom)
  const [createClassModalVisible, setCreateClassModalVisible] = useState(false);
  const [newClassCourse, setNewClassCourse] = useState('');
  const [newClassCode, setNewClassCode] = useState('A1');
  const [newClassRoom, setNewClassRoom] = useState('Lab Basis Data');
  const [creatingClass, setCreatingClass] = useState(false);

  // State Gabung Kelas Asprak via Kode Spesial (dengan Pratinjau Konfirmasi)
  const [joinClassModalVisible, setJoinClassModalVisible] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [previewClassToJoin, setPreviewClassToJoin] =
    useState<PracticalClass | null>(null);
  const [joiningClass, setJoiningClass] = useState(false);

  // State Konfirmasi Keluar dari Kelas
  const [classToLeave, setClassToLeave] = useState<PracticalClass | null>(null);

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

  // Berlangganan data jadwal sesi asisten dan daftar kelas yang diampu
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
      const firstName = (currentUser.name || '')
        .toLowerCase()
        .split(' ')[0];
      const myCls = classList.filter((c) => {
        const ids = c.assistantIds || (c.assistantId ? [c.assistantId] : []);
        const names =
          c.assistantNames ||
          (c.assistantName ? [c.assistantName] : []);
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
  }, [currentUser.id, currentUser.name]);

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    await signOutUser();
    router.replace('/' as Href);
  };

  // 1. Asisten Membuat Kelas Praktikum Baru
  const handleCreateClassroom = async () => {
    setCreatingClass(true);
    try {
      const created = await createClassroomByAssistant({
        courseName: newClassCourse,
        classCode: newClassCode,
        room: newClassRoom,
        assistantId: currentUser.id,
        assistantName: currentUser.name,
      });
      setCreateClassModalVisible(false);
      setNewClassCourse('');
      setFeedbackState({
        visible: true,
        type: 'success',
        title: 'Kelas Praktikum Dibuat!',
        message: `Kelas ${created.courseName} (${created.classCode}) berhasil dibuat.\n\n• Kode Praktikan: ${created.studentJoinCode}\n• Kode Spesial Invite Asprak: ${created.assistantInviteCode}\n\nBagikan kode di atas kepada praktikan atau rekan asprak Anda.`,
      });
    } catch (err: any) {
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Gagal Membuat Kelas',
        message: err?.message || 'Pastikan seluruh kolom kelas telah diisi.',
      });
    } finally {
      setCreatingClass(false);
    }
  };

  // 2. Asisten Mengecek Kode Spesial Undangan Kelas Rekan Asprak (Step 1: Lookup & Preview)
  const handleLookupAssistantCode = async () => {
    setJoiningClass(true);
    try {
      const found = await lookupClassByInviteCode(inviteCodeInput, 'ASSISTANT');
      setPreviewClassToJoin(found);
    } catch (err: any) {
      setFeedbackState({
        visible: true,
        type: 'warning',
        title: 'Kode Tidak Valid',
        message:
          err?.message ||
          'Kode Spesial Asprak tidak ditemukan. Periksa kembali kode dari rekan asprak Anda.',
      });
    } finally {
      setJoiningClass(false);
    }
  };

  // Step 2: Konfirmasi Gabung Kelas sebagai Rekan Asprak
  const handleConfirmJoinAssistantClass = async () => {
    if (!previewClassToJoin) return;
    setJoiningClass(true);
    try {
      const updated = await confirmJoinClassAsAssistant(
        previewClassToJoin,
        currentUser.id,
        currentUser.name
      );
      setJoinClassModalVisible(false);
      setPreviewClassToJoin(null);
      setInviteCodeInput('');
      setFeedbackState({
        visible: true,
        type: 'success',
        title: 'Berhasil Bergabung sebagai Asprak!',
        message: `Anda sekarang tergabung sebagai asisten pengampu di kelas ${updated.courseName} (${updated.classCode}) bersama ${(updated.assistantNames || []).join(', ')}.`,
      });
    } catch (err: any) {
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Gagal Bergabung',
        message: err?.message || 'Terjadi kesalahan saat bergabung ke kelas.',
      });
    } finally {
      setJoiningClass(false);
    }
  };

  // 3. Asisten Keluar dari Kelas Praktikum
  const handleConfirmLeaveClass = async () => {
    if (!classToLeave) return;
    const target = classToLeave;
    setClassToLeave(null);
    try {
      await leaveClassAsAssistant(target.id, currentUser.id, currentUser.name);
      if (
        selectedClassTab.toUpperCase() === target.classCode.toUpperCase()
      ) {
        setSelectedClassTab('ALL');
      }
      setFeedbackState({
        visible: true,
        type: 'info',
        title: 'Keluar dari Kelas',
        message: `Anda telah keluar dari kepengurusan asisten kelas ${target.courseName} (${target.classCode}).`,
      });
    } catch (err: any) {
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Gagal Keluar Kelas',
        message: err?.message || 'Terjadi kesalahan sistem.',
      });
    }
  };

  const handleCreateSession = async (input: CreateSessionInput) => {
    try {
      const finalClassCode = (
        input.classCode || (selectedClassTab !== 'ALL' ? selectedClassTab : 'A1')
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
        message: `Sesi ${input.courseName} (Kelas ${finalClassCode}) berhasil dijadwalkan untuk ${finalDate} di ${finalRoom}. Seluruh praktikan di kelas ini otomatis melihat jadwal sesi.`,
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
          message="Halaman ini khusus untuk Asisten Praktikum. Anda terdaftar sebagai Praktikan dan tidak memiliki izin mengakses tampilan ini."
          iconName="lock-closed-outline"
          actionLabel="Buka Jadwal Praktikan"
          onAction={() => router.replace('/student' as Href)}
        />
      </Screen>
    );
  }

  const myClassCodes = assignedClasses.map((c) => c.classCode.toUpperCase());
  const myClassIds = assignedClasses.map((c) => c.id);

  // Gunakan data real-time Firestore jika tersedia, atau fallback lokal
  // Sesi muncul jika dibuat oleh asprak ini ATAU berada di kelas yang diampu bersama rekan asprak
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
          onPress={() => setLogoutModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Keluar dari akun asisten"
          style={styles.logoutButton}
        >
          <Icon name="log-out-outline" size={20} color={Colors.danger} />
        </Pressable>
      </View>

      {/* Live Real-Time Clock */}
      <LiveClock variant="light" />

      {/* Ruang Kelas Praktikum Saya (Sistem Kode ala Google Classroom) */}
      <View style={styles.classroomSectionCard}>
        <View style={styles.classroomTopRow}>
          <View style={styles.assignedHeader}>
            <Icon name="school" size={18} color={Colors.primary} />
            <AppText variant="caption" weight="bold" color={Colors.primaryDark}>
              KELAS PRAKTIKUM SAYA ({assignedClasses.length})
            </AppText>
          </View>

          <View style={styles.classroomActionBtns}>
            <Pressable
              style={styles.smallOutlineBtn}
              onPress={() => {
                setInviteCodeInput('');
                setPreviewClassToJoin(null);
                setJoinClassModalVisible(true);
              }}
            >
              <Icon name="key-outline" size={14} color={Colors.primary} />
              <AppText variant="caption" weight="bold" color={Colors.primary}>
                Gabung Kelas
              </AppText>
            </Pressable>

            <Pressable
              style={styles.smallPrimaryBtn}
              onPress={() => {
                setNewClassCourse('');
                setNewClassCode('A1');
                setNewClassRoom('Lab Basis Data');
                setCreateClassModalVisible(true);
              }}
            >
              <Icon name="add" size={14} color={Colors.textWhite} />
              <AppText variant="caption" weight="bold" color={Colors.textWhite}>
                Buat Kelas
              </AppText>
            </Pressable>
          </View>
        </View>

        <AppText variant="caption" color={Colors.textMuted} style={styles.classroomHint}>
          Bagikan Kode Praktikan ke mahasiswa atau Kode Spesial Asprak untuk mengundang rekan asprak satu kelas.
        </AppText>

        {assignedClasses.length === 0 ? (
          <View style={styles.emptyClassroomBox}>
            <AppText variant="caption" color={Colors.textMuted} align="center">
              Anda belum tergabung di kelas praktikum manapun. Klik &quot;Buat Kelas&quot; atau &quot;Gabung Kelas&quot; dengan kode dari rekan asprak.
            </AppText>
          </View>
        ) : (
          <View style={styles.classBadgeList}>
            {assignedClasses.map((cls) => {
              const assistantsList =
                cls.assistantNames && cls.assistantNames.length > 0
                  ? cls.assistantNames.join(', ')
                  : cls.assistantName;
              return (
                <View key={cls.id} style={styles.classroomItemCard}>
                  <View style={styles.classroomItemHeader}>
                    <View style={styles.classroomTitleCol}>
                      <AppText variant="bodySm" weight="bold" color={Colors.text}>
                        {cls.courseName || 'Praktikum'} • Kelas {cls.classCode}
                      </AppText>
                      <AppText variant="caption" color={Colors.textSecondary}>
                        📍 {cls.room || 'Lab Komputer'} • 👥 {cls.studentIds?.length || 0} Praktikan
                      </AppText>
                      <AppText variant="caption" color={Colors.primaryDark} weight="medium">
                        👨‍🏫 Asprak: {assistantsList}
                      </AppText>
                    </View>

                    <Pressable
                      onPress={() => setClassToLeave(cls)}
                      style={styles.leaveClassIconBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Keluar dari kelas ${cls.classCode}`}
                    >
                      <Icon name="exit-outline" size={16} color={Colors.danger} />
                    </Pressable>
                  </View>

                  {/* 2 Kode Undangan: Kode Praktikan & Kode Spesial Asprak */}
                  <View style={styles.codesContainer}>
                    <View style={styles.codePillStudent}>
                      <AppText variant="caption" color={Colors.textMuted}>
                        Kode Praktikan:
                      </AppText>
                      <AppText variant="caption" weight="bold" color={Colors.primaryDark}>
                        {cls.studentJoinCode}
                      </AppText>
                    </View>

                    <View style={styles.codePillAssistant}>
                      <AppText variant="caption" color={Colors.textMuted}>
                        Invite Asprak:
                      </AppText>
                      <AppText variant="caption" weight="bold" color={Colors.success}>
                        {cls.assistantInviteCode}
                      </AppText>
                    </View>
                  </View>
                </View>
              );
            })}
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

      {/* Filter Status Sesi */}
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
              ? 'Belum ada jadwal sesi praktikum pada kelas yang Anda ampu.'
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

      {/* Modal 1: Buat Kelas Praktikum Baru */}
      <Modal
        visible={createClassModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateClassModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCreateClassModalVisible(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeaderRow}>
            <View>
              <AppText variant="caption" weight="bold" color={Colors.primary}>
                BUAT RUANG KELAS BARU
              </AppText>
              <AppText variant="title" weight="bold">
                Tambah Kelas Praktikum
              </AppText>
            </View>
            <Pressable
              onPress={() => setCreateClassModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Icon name="close" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <AppText variant="caption" color={Colors.textMuted} style={styles.modalSubText}>
            Sistem akan otomatis membuat Kode Kelas untuk Praktikan dan Kode Spesial untuk mengundang rekan Asprak.
          </AppText>

          <View style={styles.modalFieldGroup}>
            <AppText variant="label">NAMA MATA KULIAH PRAKTIKUM *</AppText>
            <TextInput
              value={newClassCourse}
              onChangeText={setNewClassCourse}
              placeholder="Contoh: Basis Data Lanjut"
              placeholderTextColor={Colors.textLight}
              style={styles.modalInput}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScrollRow}
            >
              {PRESET_COURSE_NAMES.map((c) => (
                <Pressable
                  key={c}
                  style={[
                    styles.presetChip,
                    newClassCourse === c && styles.presetChipActive,
                  ]}
                  onPress={() => setNewClassCourse(c)}
                >
                  <AppText
                    variant="caption"
                    color={newClassCourse === c ? Colors.textWhite : Colors.textSecondary}
                    weight={newClassCourse === c ? 'semibold' : 'regular'}
                  >
                    {c}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.modalFieldGroup}>
            <AppText variant="label">KODE ROMBEL KELAS *</AppText>
            <View style={styles.chipsWrapGrid}>
              {PRESET_CLASS_CODES.map((code) => (
                <Pressable
                  key={code}
                  style={[
                    styles.presetChip,
                    newClassCode === code && styles.presetChipActive,
                  ]}
                  onPress={() => setNewClassCode(code)}
                >
                  <AppText
                    variant="caption"
                    color={newClassCode === code ? Colors.textWhite : Colors.textSecondary}
                    weight={newClassCode === code ? 'bold' : 'regular'}
                  >
                    Kelas {code}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.modalFieldGroup}>
            <AppText variant="label">RUANGAN LAB DEFAULT *</AppText>
            <TextInput
              value={newClassRoom}
              onChangeText={setNewClassRoom}
              placeholder="Contoh: Lab Basis Data"
              placeholderTextColor={Colors.textLight}
              style={styles.modalInput}
            />
            <View style={styles.chipsWrapGrid}>
              {PRESET_LAB_ROOMS.map((r) => (
                <Pressable
                  key={r}
                  style={[
                    styles.presetChip,
                    newClassRoom === r && styles.presetChipActive,
                  ]}
                  onPress={() => setNewClassRoom(r)}
                >
                  <AppText
                    variant="caption"
                    color={newClassRoom === r ? Colors.textWhite : Colors.textSecondary}
                    weight={newClassRoom === r ? 'semibold' : 'regular'}
                  >
                    {r}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.modalFooterBtns}>
            <CustomButton
              title="Batal"
              variant="outline"
              size="md"
              style={styles.flexBtn}
              onPress={() => setCreateClassModalVisible(false)}
            />
            <CustomButton
              title="Buat Kelas & Kode"
              variant="primary"
              size="md"
              loading={creatingClass}
              style={styles.flexBtn}
              onPress={handleCreateClassroom}
            />
          </View>
        </View>
      </Modal>

      {/* Modal 2: Gabung Kelas sebagai Rekan Asprak via Kode Spesial (dengan Pratinjau Konfirmasi) */}
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
                UNDANGAN REKAN ASPRAK
              </AppText>
              <AppText variant="title" weight="bold">
                Gabung Kelas Praktikum
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
                Masukkan Kode Spesial Asprak (contoh: ASP-PPK-C1-203) yang diberikan oleh rekan asprak pembuat kelas.
              </AppText>

              <View style={styles.modalFieldGroup}>
                <AppText variant="label">KODE SPESIAL INVITE ASPRAK *</AppText>
                <TextInput
                  value={inviteCodeInput}
                  onChangeText={(txt) => setInviteCodeInput(txt.toUpperCase())}
                  placeholder="Contoh: ASP-PPK-C1-203"
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
                  onPress={handleLookupAssistantCode}
                />
              </View>
            </>
          ) : (
            <>
              <AppText variant="caption" color={Colors.textSecondary} style={styles.modalSubText}>
                Konfirmasi detail kelas praktikum berikut sebelum Anda bergabung sebagai Asisten Praktikum:
              </AppText>

              <View style={styles.previewConfirmCard}>
                <View style={styles.previewBadgeRow}>
                  <Badge
                    label={`Kelas ${previewClassToJoin.classCode}`}
                    variant="primary"
                    size="sm"
                  />
                  <Badge
                    label={`Kode: ${previewClassToJoin.assistantInviteCode}`}
                    variant="open"
                    size="sm"
                  />
                </View>

                <AppText variant="h2" weight="bold" color={Colors.text}>
                  {previewClassToJoin.courseName || 'Praktikum'}
                </AppText>

                <View style={styles.previewMetaList}>
                  <View style={styles.previewMetaRow}>
                    <Icon name="location-outline" size={16} color={Colors.primary} />
                    <AppText variant="bodySm" color={Colors.textSecondary}>
                      Ruangan: {previewClassToJoin.room || 'Lab Komputer'}
                    </AppText>
                  </View>

                  <View style={styles.previewMetaRow}>
                    <Icon name="people-outline" size={16} color={Colors.primary} />
                    <AppText variant="bodySm" color={Colors.textSecondary}>
                      Asprak Saat Ini:{' '}
                      <AppText variant="bodySm" weight="bold" color={Colors.primaryDark}>
                        {(previewClassToJoin.assistantNames &&
                        previewClassToJoin.assistantNames.length > 0
                          ? previewClassToJoin.assistantNames.join(', ')
                          : previewClassToJoin.assistantName) || 'Belum ada'}
                      </AppText>
                    </AppText>
                  </View>

                  <View style={styles.previewMetaRow}>
                    <Icon name="school-outline" size={16} color={Colors.primary} />
                    <AppText variant="bodySm" color={Colors.textSecondary}>
                      Jumlah Praktikan: {previewClassToJoin.studentIds?.length || 0} Mahasiswa
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
                  title="Ya, Gabung sebagai Asprak"
                  variant="primary"
                  size="md"
                  loading={joiningClass}
                  style={styles.flexBtn}
                  onPress={handleConfirmJoinAssistantClass}
                />
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Modal 3: Konfirmasi Keluar dari Kelas */}
      <FeedbackModal
        visible={Boolean(classToLeave)}
        type="warning"
        title="Keluar dari Kelas Praktikum?"
        message={
          classToLeave
            ? `Apakah Anda yakin ingin keluar dari kelas ${classToLeave.courseName} (Kelas ${classToLeave.classCode})? Anda dapat bergabung kembali kapan saja menggunakan Kode Spesial Asprak.`
            : ''
        }
        primaryLabel="Ya, Keluar Kelas"
        secondaryLabel="Batal"
        onPrimary={handleConfirmLeaveClass}
        onSecondary={() => setClassToLeave(null)}
        onClose={() => setClassToLeave(null)}
      />

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
  classroomSectionCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  classroomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  assignedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  classroomActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  smallOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  smallPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  classroomHint: {
    marginBottom: Spacing.sm,
  },
  emptyClassroomBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  classBadgeList: {
    gap: Spacing.sm,
  },
  classroomItemCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    gap: Spacing.xs,
  },
  classroomItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  classroomTitleCol: {
    flex: 1,
    gap: 2,
  },
  leaveClassIconBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 4,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  codePillStudent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  codePillAssistant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successBg,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '88%',
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
  chipsScrollRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  chipsWrapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  presetChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  presetChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
