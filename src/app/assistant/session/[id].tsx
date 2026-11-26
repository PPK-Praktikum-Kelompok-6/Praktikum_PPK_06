import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal, FeedbackType } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { AttendanceTable } from '@/features/attendance/components/AttendanceTable';
import { StatSummaryCard } from '@/features/attendance/components/StatSummaryCard';
import { LatenessBadge } from '@/features/fines/components/LatenessBadge';
import {
  SessionControlAction,
  SessionControlModal,
} from '@/features/sessions/components/SessionControlModal';
import { StatusBadge } from '@/features/sessions/components/StatusBadge';
import { requestSessionChange, subscribeAllClasses } from '@/services/admin';
import {
  recordManualAttendanceByAssistant,
  setSessionStatus,
  subscribeToSessionAttendance,
} from '@/services/attendance';
import { AuthUser, subscribeAllUsers } from '@/services/auth';
import { subscribeFinesBySession } from '@/services/fines';
import { subscribeLabs } from '@/services/labs';
import {
  PermitRequest,
  recordManualPermitByAssistant,
  subscribeIncomingPermits,
} from '@/services/permits';
import { PracticalClass, subscribeSessionDoc } from '@/services/sessions';
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';
import { canOpen, isSessionExpired } from '@/store/rules';
import { AttendanceRecord, PracticalSession } from '@/types/attendance';
import { FineRecord } from '@/types/fine';
import { LabLocation } from '@/types/lab';
import { formatDateIndonesian } from '@/utils/formatTime';
import { isRoomMatchingLab } from '@/utils/geo';
import {
  DEFAULT_FINE_AMOUNT,
  DEFAULT_GRACE_PERIOD_MINUTES,
  formatRupiah,
  isPresentAttendanceRecord,
} from '@/utils/lateness';

type LabWithPolicy = LabLocation & {
  gracePeriodMinutes?: number;
  fineAmount?: number;
};

export default function AssistantSessionDetailRoute() {
  const { currentUser } = useCurrentUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSessionById, openSession, closeSession } = useSessions();
  const { getAttendanceBySession } = useAttendance();
  const insets = useSafeAreaInsets();

  const [controlModalVisible, setControlModalVisible] = useState(false);
  const [controlAction, setControlAction] = useState<SessionControlAction>('OPEN');
  const [realtimeRecords, setRealtimeRecords] = useState<AttendanceRecord[]>([]);
  const [realtimeSession, setRealtimeSession] = useState<PracticalSession | undefined>(undefined);
  const [allClasses, setAllClasses] = useState<PracticalClass[]>([]);
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [sessionPermits, setSessionPermits] = useState<PermitRequest[]>([]);
  const [sessionFines, setSessionFines] = useState<FineRecord[]>([]);
  const [manualActionLoadingId, setManualActionLoadingId] = useState<string | null>(null);

  // State Permintaan Reschedule / Hapus Sesi (Izin Admin)
  const [changeModalVisible, setChangeModalVisible] = useState(false);
  const [changeType, setChangeType] = useState<'DELETE' | 'RESCHEDULE'>('RESCHEDULE');
  const [changeReason, setChangeReason] = useState('');
  const [newTimeSlot, setNewTimeSlot] = useState('13.00 - 15.00 WIB');
  const [newRoom, setNewRoom] = useState('');
  const [submittingChange, setSubmittingChange] = useState(false);

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('success');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Informasi Kebijakan Lokasi, Grace Period, & Denda Laboratorium (Read-Only dari Aslab — SRS-S4-03)
  const [currentLab, setCurrentLab] = useState<LabWithPolicy | null>(null);

  // Real-time listener dokumen sesi praktikum dari Firestore
  useEffect(() => {
    if (!id) return;
    const unsubSession = subscribeSessionDoc(id, (sess) => {
      setRealtimeSession(sess);
    });
    return () => unsubSession();
  }, [id]);

  // Real-time listener rekapitulasi kehadiran (SRS-SYNC-01) + kelas, user, izin, & denda (SRS-S4-04)
  useEffect(() => {
    if (!id) return;
    const unsubscribeAtt = subscribeToSessionAttendance(id, (records) => {
      setRealtimeRecords(records);
    });
    const unsubFines = subscribeFinesBySession(id, (fines) => {
      setSessionFines(fines);
    });
    const unsubClasses = subscribeAllClasses((cls) => {
      setAllClasses(cls);
    });
    const unsubUsers = subscribeAllUsers((users) => {
      setAllUsers(users);
    });
    const unsubPermits = subscribeIncomingPermits((permits) => {
      setSessionPermits(permits.filter((p) => p.sessionId === id));
    });
    return () => {
      unsubscribeAtt();
      unsubFines();
      unsubClasses();
      unsubUsers();
      unsubPermits();
    };
  }, [id]);

  const session = realtimeSession || (id ? getSessionById(id) : undefined);

  // Otomatis tutup sesi bila jam praktikum telah selesai
  useEffect(() => {
    if (session && session.status === 'OPEN') {
      const { expired } = isSessionExpired(session);
      if (expired) {
        setSessionStatus(session.id, 'CLOSED');
        closeSession(session.id);
      }
    }
  }, [session, closeSession]);

  // Real-time listener data laboratorium & sinkronisasi lokasi ruangan sesi (SRS-S3-03)
  useEffect(() => {
    if (!session?.room) return;
    const unsubLabs = subscribeLabs((labs) => {
      const found = labs.find((l) =>
        isRoomMatchingLab(session.room, l, session.labId)
      );
      if (found) {
        setCurrentLab(found);
      }
    });
    return () => unsubLabs();
  }, [session?.room, session?.labId]);

  // Batasan peran: Praktikan tidak boleh mengakses detail dan kontrol sesi asisten
  if (currentUser.role !== 'ASSISTANT') {
    return (
      <Screen>
        <View style={styles.topNav}>
          <Pressable
            onPress={() => router.replace('/student')}
            hitSlop={8}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <Icon name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
        </View>
        <EmptyState
          title="Akses Ditolak"
          message="Halaman detail dan kontrol sesi ini hanya diperuntukkan bagi Asisten Praktikum. Praktikan tidak memiliki izin."
          iconName="lock-closed-outline"
          actionLabel="Kembali ke Jadwal Praktikan"
          onAction={() => router.replace('/student')}
        />
      </Screen>
    );
  }

  // Gunakan record real-time jika ada, fallback ke store lokal
  const attendanceRecords =
    realtimeRecords.length > 0
      ? realtimeRecords
      : id
        ? getAttendanceBySession(id)
        : [];

  // Pisahkan peserta benar-benar hadir (ON_TIME / LATE) dari izin disetujui (EXCUSED_ABSENCE)
  const presentRecords = attendanceRecords.filter(isPresentAttendanceRecord);
  const onTimeCount = presentRecords.filter(
    (r) => r.attendanceStatus !== 'LATE'
  ).length;
  const lateCount = presentRecords.filter(
    (r) => r.attendanceStatus === 'LATE'
  ).length;
  const excusedCount = attendanceRecords.filter(
    (r) => r.attendanceStatus === 'EXCUSED_ABSENCE'
  ).length;

  const effectiveGracePeriod =
    session?.gracePeriodMinutes ??
    currentLab?.gracePeriodMinutes ??
    DEFAULT_GRACE_PERIOD_MINUTES;
  const effectiveFineAmount =
    session?.fineAmount ?? currentLab?.fineAmount ?? DEFAULT_FINE_AMOUNT;

  if (!session) {
    return (
      <Screen>
        <View style={styles.topNav}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <Icon name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
        </View>
        <EmptyState
          title="Sesi Tidak Ditemukan"
          message="Sesi praktikum dengan ID tersebut tidak ditemukan atau telah dihapus."
          iconName="alert-circle-outline"
        />
      </Screen>
    );
  }

  const handleOpenControl = (action: SessionControlAction) => {
    if (action === 'OPEN') {
      const rule = canOpen(session, currentUser.role);
      if (!rule.allowed) {
        setFeedbackType('warning');
        setFeedbackTitle('Sesi Belum Dapat Dibuka');
        setFeedbackMessage(
          rule.reason ||
            'Sesi praktikum belum masuk jam mulai. Sesi hanya dapat dibuka saat jam praktikum telah tiba.'
        );
        setFeedbackVisible(true);
        return;
      }
    }
    setControlAction(action);
    setControlModalVisible(true);
  };

  const handleOpenChangeModal = (type: 'DELETE' | 'RESCHEDULE') => {
    setChangeType(type);
    setChangeReason('');
    setNewTimeSlot(session?.timeSlot || '13.00 - 15.00 WIB');
    setNewRoom(session?.room || '');
    setChangeModalVisible(true);
  };

  const handleSubmitChangeRequest = async () => {
    if (!session) return;
    if (changeReason.trim().length < 5) {
      setFeedbackType('warning');
      setFeedbackTitle('Alasan Wajib Diisi');
      setFeedbackMessage('Mohon sertakan alasan pengajuan perubahan sesi minimal 5 karakter untuk ditinjau admin.');
      setFeedbackVisible(true);
      return;
    }

    setSubmittingChange(true);
    try {
      await requestSessionChange({
        sessionId: session.id,
        courseName: session.courseName,
        classCode: session.classCode,
        type: changeType,
        requestedBy: currentUser.id,
        requestedByName: currentUser.name,
        reason: changeReason.trim(),
        newTimeSlot: changeType === 'RESCHEDULE' ? newTimeSlot.trim() : undefined,
        newRoom: changeType === 'RESCHEDULE' ? newRoom.trim() : undefined,
      });

      setChangeModalVisible(false);
      setFeedbackType('success');
      setFeedbackTitle('Permohonan Terkirim ke Admin');
      setFeedbackMessage(
        `Permintaan ${changeType === 'DELETE' ? 'penghapusan' : 'penjadwalan ulang'} sesi praktikum telah dikirim ke Administrator dan menunggu otorisasi.`
      );
      setFeedbackVisible(true);
    } catch (err: any) {
      setFeedbackType('error');
      setFeedbackTitle('Gagal Mengajukan Permintaan');
      setFeedbackMessage(err?.message || 'Terjadi kesalahan sistem.');
      setFeedbackVisible(true);
    } finally {
      setSubmittingChange(false);
    }
  };

  const handleConfirmAction = async () => {
    setControlModalVisible(false);
    try {
      if (controlAction === 'OPEN') {
        // 1. Simpan perubahan status ke Firestore (SRS-PRES-01)
        await setSessionStatus(session.id, 'OPEN');
        openSession(session.id); // Selaraskan store lokal

        setFeedbackType('success');
        setFeedbackTitle('Sesi Berhasil Dibuka!');
        setFeedbackMessage(
          `Sesi ${session.courseName} (${session.classCode}) sekarang dibuka. Praktikan dapat mengisi presensi.`
        );
        setFeedbackVisible(true);
      } else {
        // 2. Tutup status sesi di Firestore (SRS-PRES-01)
        await setSessionStatus(session.id, 'CLOSED');
        closeSession(session.id); // Selaraskan store lokal

        setFeedbackType('success');
        setFeedbackTitle('Sesi Berhasil Ditutup!');
        setFeedbackMessage(
          `Sesi ${session.courseName} (${session.classCode}) resmi ditutup. Presensi baru telah dikunci.`
        );
        setFeedbackVisible(true);
      }
    } catch (err: any) {
      setFeedbackType('error');
      setFeedbackTitle('Gagal Mengubah Status Sesi');
      setFeedbackMessage(err?.message || 'Terjadi kesalahan saat menghubungi server.');
      setFeedbackVisible(true);
    }
  };

  return (
    <Screen>
      {/* Top Header Navigation */}
      <View style={styles.topNav}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Icon name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.topNavTitle}>
          <AppText variant="title" numberOfLines={1}>
            Detail Sesi Praktikum
          </AppText>
        </View>
        <View style={styles.placeholderButton} />
      </View>

      {/* Session Hero Information Card */}
      <Card variant="hero" padding="lg" style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <AppText variant="caption" color={Colors.textWhiteMuted} weight="bold">
            KELAS {session.classCode}
          </AppText>
          <StatusBadge status={session.status} size="sm" />
        </View>

        <AppText variant="h1" color={Colors.textWhite} style={styles.courseTitle}>
          {session.courseName}
        </AppText>

        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <Icon
              name={session.deliveryMode === 'ONLINE' ? 'videocam-outline' : 'location-outline'}
              size={16}
              color={Colors.textWhiteMuted}
            />
            <AppText variant="bodySm" color={Colors.textWhite} style={styles.flexText}>
              {session.deliveryMode === 'ONLINE' ? 'Daring (Online)' : session.room}
            </AppText>
          </View>

          <View style={styles.detailRow}>
            <Icon name="time-outline" size={16} color={Colors.textWhiteMuted} />
            <AppText variant="bodySm" color={Colors.textWhite} style={styles.flexText}>
              {session.timeSlot}
            </AppText>
          </View>

          <View style={styles.detailRow}>
            <Icon name="calendar-outline" size={16} color={Colors.textWhiteMuted} />
            <AppText variant="bodySm" color={Colors.textWhite} style={styles.flexText}>
              {formatDateIndonesian(session.date)}
            </AppText>
          </View>

          <View style={styles.detailRow}>
            <Icon name="person-outline" size={16} color={Colors.textWhiteMuted} />
            <AppText variant="bodySm" color={Colors.textWhite} style={styles.flexText}>
              {session.assistantName}
            </AppText>
          </View>

          {session.meetingLink ? (
            <Pressable
              style={styles.meetingLinkBox}
              onPress={() => Linking.openURL(session.meetingLink!)}
            >
              <Icon name="link-outline" size={16} color={Colors.primaryLight} />
              <AppText
                variant="caption"
                weight="bold"
                color={Colors.textWhite}
                numberOfLines={1}
                style={styles.meetingLinkText}
              >
                Buka Link Praktikum: {session.meetingLink}
              </AppText>
            </Pressable>
          ) : null}

          {session.description ? (
            <View style={styles.descriptionRow}>
              <Icon name="document-text-outline" size={16} color={Colors.textWhiteMuted} />
              <AppText variant="caption" color={Colors.textWhiteMuted} style={styles.descriptionText}>
                {session.description}
              </AppText>
            </View>
          ) : null}
        </View>
      </Card>

      {/* Session Control Action Box */}
      <Card variant="default" padding="md" style={styles.controlCard}>
        <View style={styles.controlHeader}>
          <AppText variant="title">Kontrol Sesi Asisten</AppText>
          <AppText variant="bodySm" color={Colors.textMuted}>
            {session.status === 'NOT_STARTED' &&
              'Buka sesi praktikum agar praktikan dapat melakukan presensi.'}
            {session.status === 'OPEN' &&
              'Sesi sedang berlangsung. Tutup sesi jika kegiatan praktikum telah usai.'}
            {session.status === 'CLOSED' &&
              'Sesi ini telah selesai ditutup dan presensi terkunci.'}
          </AppText>
        </View>

        <View style={styles.actionButtonContainer}>
          {session.status === 'NOT_STARTED' && (
            <CustomButton
              title="Buka Sesi Praktikum"
              onPress={() => handleOpenControl('OPEN')}
              variant="primary"
              size="md"
              icon={<Icon name="play-circle" size={20} color={Colors.textWhite} />}
            />
          )}

          {session.status === 'OPEN' && (
            <CustomButton
              title="Tutup Sesi Praktikum"
              onPress={() => handleOpenControl('CLOSE')}
              variant="danger"
              size="md"
              icon={<Icon name="stop-circle" size={20} color={Colors.textWhite} />}
            />
          )}

          {session.status === 'CLOSED' && (
            <CustomButton
              title="Sesi Praktikum Telah Ditutup"
              onPress={() => {}}
              variant="secondary"
              size="md"
              disabled
              icon={<Icon name="checkmark-done-circle" size={20} color={Colors.textMuted} />}
            />
          )}
        </View>
      </Card>

      {/* Kebijakan Lokasi, Grace Period & Denda Laboratorium (Read-Only dari Aslab — SRS-S4-03 & SRS-S4-04) */}
      <Card variant="default" padding="md" style={styles.labConfigCard}>
        <View style={styles.labConfigHeader}>
          <View style={styles.labConfigTitleRow}>
            <Icon name="shield-checkmark-outline" size={18} color={Colors.primary} />
            <AppText variant="title" style={styles.flexShrinkText}>
              Kebijakan Lab & Keterlambatan
            </AppText>
          </View>
          <Badge
            label={
              session.deliveryMode === 'ONLINE'
                ? 'Mode Daring'
                : `${session.radiusMeters ?? currentLab?.radiusMeters ?? 60} Meter`
            }
            variant={session.deliveryMode === 'ONLINE' ? 'closed' : 'attended'}
            size="sm"
          />
        </View>

        <AppText variant="caption" color={Colors.textMuted} style={styles.labConfigDesc}>
          Konfigurasi lokasi, radius, grace period, dan nominal denda ditetapkan oleh Aslab dan diterapkan otomatis pada sesi ini.
        </AppText>

        <View style={styles.labMetaBox}>
          <View style={styles.labMetaRow}>
            <Icon name="time-outline" size={14} color={Colors.primary} />
            <AppText variant="caption" color={Colors.textSecondary} weight="semibold" style={styles.flexText}>
              Grace Period Keterlambatan: {effectiveGracePeriod} menit dari jadwal mulai
            </AppText>
          </View>
          <View style={styles.labMetaRow}>
            <Icon name="cash-outline" size={14} color={Colors.warning} />
            <AppText variant="caption" color={Colors.textSecondary} weight="semibold" style={styles.flexText}>
              Denda Tetap Keterlambatan: {formatRupiah(effectiveFineAmount)} / kejadian (Izin disetujui bebas denda)
            </AppText>
          </View>
          {currentLab && session.deliveryMode !== 'ONLINE' ? (
            <>
              <View style={styles.labMetaRow}>
                <Icon name="business-outline" size={14} color={Colors.textMuted} />
                <AppText variant="caption" color={Colors.textSecondary} style={styles.flexText}>
                  {currentLab.name} • {currentLab.building}
                </AppText>
              </View>
              <View style={styles.labMetaRow}>
                <Icon name="navigate-outline" size={14} color={Colors.textMuted} />
                <AppText variant="caption" color={Colors.textMuted} style={styles.flexText}>
                  Koordinat Lab: {currentLab.latitude.toFixed(5)}, {currentLab.longitude.toFixed(5)}
                </AppText>
              </View>
            </>
          ) : null}
        </View>
      </Card>

      {/* Tata Kelola Sesi: Reschedule / Hapus dengan Izin Admin */}
      <Card variant="default" padding="md" style={styles.governanceCard}>
        <View style={styles.governanceHeader}>
          <Icon name="shield-checkmark" size={18} color={Colors.primary} />
          <AppText variant="title" style={styles.flexText}>
            Pengaturan Jadwal & Otorisasi
          </AppText>
        </View>
        <AppText variant="caption" color={Colors.textMuted} style={styles.governanceDesc}>
          Setiap perubahan jadwal (reschedule) atau penghapusan sesi wajib mendapatkan persetujuan dari Administrator Lab.
        </AppText>

        {session.pendingChangeRequest ? (
          <View style={styles.pendingNoticeBox}>
            <Icon name="time-outline" size={16} color={Colors.warning} />
            <AppText variant="caption" weight="semibold" color={Colors.warning} style={styles.flexText}>
              Sesi ini sedang menunggu persetujuan Admin untuk{' '}
              {session.pendingChangeRequest === 'DELETE' ? 'penghapusan' : 'reschedule'}.
            </AppText>
          </View>
        ) : (
          <View style={styles.governanceBtnRow}>
            <CustomButton
              title="Reschedule"
              variant="outline"
              size="sm"
              fullWidth={false}
              icon={<Icon name="calendar-outline" size={16} color={Colors.primary} />}
              style={styles.govBtn}
              onPress={() => handleOpenChangeModal('RESCHEDULE')}
            />
            <CustomButton
              title="Hapus Sesi"
              variant="outline"
              size="sm"
              fullWidth={false}
              icon={<Icon name="trash-outline" size={16} color={Colors.danger} />}
              style={styles.govBtn}
              onPress={() => handleOpenChangeModal('DELETE')}
            />
          </View>
        )}
      </Card>

      {/* Attendance Ratio Summary (Hanya hitung ON_TIME + LATE, tidak menghitung EXCUSED_ABSENCE) */}
      <StatSummaryCard
        attendedCount={presentRecords.length}
        totalStudents={session.totalStudents}
      />

      {/* Ringkasan Ketepatan Waktu, Izin Bebas Denda & Status Tagihan (SRS-S4-04) */}
      <Card variant="flat" padding="md" style={styles.punctualityCard}>
        <AppText variant="caption" color={Colors.textMuted} weight="bold">
          RINGKASAN KETEPATAN WAKTU & DENDA SESI
        </AppText>
        <View style={styles.punctualityRow}>
          <Badge label={`Tepat Waktu: ${onTimeCount}`} variant="open" size="sm" />
          <Badge label={`Terlambat: ${lateCount}`} variant="waiting" size="sm" />
          <Badge label={`Izin (Bebas Denda): ${excusedCount}`} variant="attended" size="sm" />
          <Badge
            label={`Denda Aktif: ${sessionFines.filter((f) => f.status === 'UNPAID' || f.status === 'PENDING').length}`}
            variant="danger"
            size="sm"
          />
        </View>
      </Card>

      {/* Attendance Recap Table (Peserta Hadir: ON_TIME & LATE) */}
      <AttendanceTable records={presentRecords} />

      {/* Kontrol Override Presensi & Izin Manual oleh Asisten (Untuk Praktikan Lupa Presensi / Telat Join / Surat Dokter Fisik) */}
      <Card variant="default" padding="md" style={styles.rosterCard}>
        <View style={styles.rosterHeader}>
          <Icon name="people-outline" size={18} color={Colors.primary} />
          <AppText variant="title" style={styles.flexText}>
            Status Peserta Kelas & Input Manual
          </AppText>
        </View>
        <AppText variant="caption" color={Colors.textMuted} style={styles.rosterDesc}>
          Jika praktikan lupa presensi di aplikasi, telat bergabung kode kelas, atau menyerahkan surat izin/dokter fisik secara langsung, Asisten dapat mencatat statusnya di bawah ini:
        </AppText>

        {(() => {
          const matchedClass = allClasses.find(
            (c) =>
              (session.classId && c.id === session.classId) ||
              c.classCode.toUpperCase() === session.classCode.toUpperCase()
          );
          const classStudentIds = matchedClass?.studentIds || [];
          const enrolledStudents = allUsers.filter(
            (u) =>
              u.role === 'STUDENT' &&
              (classStudentIds.includes(u.uid) ||
                (u.enrolledClasses || [])
                  .map((c) => c.toUpperCase())
                  .includes(session.classCode.toUpperCase()))
          );

          if (enrolledStudents.length === 0) {
            return (
              <AppText variant="caption" color={Colors.textMuted}>
                Belum ada praktikan yang tergabung di Kelas {session.classCode}.
              </AppText>
            );
          }

          return (
            <View style={styles.rosterList}>
              {enrolledStudents.map((std) => {
                const attendedRec = attendanceRecords.find(
                  (r) =>
                    r.studentId === std.uid ||
                    r.studentNim === std.identifier
                );
                const permitRec = sessionPermits.find(
                  (p) =>
                    (p.studentId === std.uid ||
                      p.studentNim === std.identifier) &&
                    p.status !== 'REJECTED'
                );
                const studentFine = sessionFines.find(
                  (f) =>
                    f.studentId === std.uid || f.studentNim === std.identifier
                );
                const isExcused =
                  attendedRec?.attendanceStatus === 'EXCUSED_ABSENCE' ||
                  permitRec?.status === 'APPROVED';
                const isPresent = Boolean(
                  attendedRec && isPresentAttendanceRecord(attendedRec)
                );
                const isProcessing = manualActionLoadingId === std.uid;

                return (
                  <View key={std.uid} style={styles.rosterItem}>
                    <View style={styles.rosterStudentCol}>
                      <AppText variant="bodySm" weight="bold">
                        {std.name}
                      </AppText>
                      <AppText variant="caption" color={Colors.textMuted}>
                        NIM: {std.identifier}
                      </AppText>
                      {isPresent && attendedRec ? (
                        <LatenessBadge
                          status={attendedRec.attendanceStatus ?? 'ON_TIME'}
                          lateMinutes={attendedRec.lateMinutes}
                          fineStatus={studentFine?.status}
                          fineAmount={studentFine?.amount}
                          size="sm"
                        />
                      ) : isExcused ? (
                        <LatenessBadge
                          status="EXCUSED_ABSENCE"
                          fineStatus={studentFine?.status}
                          size="sm"
                        />
                      ) : permitRec ? (
                        <Badge
                          label="Izin Menunggu Review"
                          variant="waiting"
                          size="sm"
                          showDot
                        />
                      ) : (
                        <Badge
                          label="Belum Hadir / Alpha"
                          variant="danger"
                          size="sm"
                        />
                      )}
                    </View>

                    {!isPresent && !isExcused ? (
                      <View style={styles.rosterBtnRow}>
                        <CustomButton
                          title="Tandai Hadir"
                          variant="primary"
                          size="sm"
                          fullWidth={false}
                          style={styles.rosterActionBtn}
                          loading={isProcessing}
                          onPress={async () => {
                            setManualActionLoadingId(std.uid);
                            try {
                              const res = await recordManualAttendanceByAssistant({
                                sessionId: session.id,
                                studentId: std.uid,
                                studentName: std.name,
                                studentNim: std.identifier,
                                assistantName: currentUser.name,
                              });
                              setFeedbackType(res.success ? 'success' : 'error');
                              setFeedbackTitle(
                                res.success ? 'Hadir Manual Dicatat' : 'Gagal'
                              );
                              setFeedbackMessage(res.message);
                              setFeedbackVisible(true);
                            } finally {
                              setManualActionLoadingId(null);
                            }
                          }}
                        />
                        <CustomButton
                          title="Izin Fisik"
                          variant="outline"
                          size="sm"
                          fullWidth={false}
                          style={styles.rosterActionBtn}
                          disabled={isProcessing}
                          onPress={async () => {
                            setManualActionLoadingId(std.uid);
                            try {
                              const res = await recordManualPermitByAssistant({
                                sessionId: session.id,
                                classId: session.classId,
                                classCode: session.classCode,
                                courseName: session.courseName,
                                studentId: std.uid,
                                studentName: std.name,
                                studentNim: std.identifier,
                                assistantName: currentUser.name,
                              });
                              setFeedbackType(res.success ? 'success' : 'error');
                              setFeedbackTitle(
                                res.success ? 'Izin Fisik Dicatat' : 'Gagal'
                              );
                              setFeedbackMessage(res.message);
                              setFeedbackVisible(true);
                            } finally {
                              setManualActionLoadingId(null);
                            }
                          }}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          );
        })()}
      </Card>

      {/* Confirmation Modal */}
      <SessionControlModal
        visible={controlModalVisible}
        action={controlAction}
        courseName={session.courseName}
        classCode={session.classCode}
        onConfirm={handleConfirmAction}
        onCancel={() => setControlModalVisible(false)}
      />

      {/* Modal Pengajuan Reschedule / Hapus Sesi */}
      <Modal
        visible={changeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChangeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setChangeModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardAvoid}
          >
            <View
              style={[
                styles.changeModalSheet,
                { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
              ]}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <AppText variant="title" weight="bold">
                  {changeType === 'DELETE'
                    ? 'Ajukan Izin Hapus Sesi ke Admin'
                    : 'Ajukan Izin Reschedule Sesi ke Admin'}
                </AppText>
                <AppText variant="caption" color={Colors.textSecondary} style={styles.changeModalSub}>
                  Sesi praktikum {session.courseName} ({session.classCode})
                </AppText>

                {changeType === 'RESCHEDULE' ? (
                  <>
                    <View style={styles.fieldGroup}>
                      <AppText variant="label">Jadwal Jam Baru:</AppText>
                      <TextInput
                        value={newTimeSlot}
                        onChangeText={setNewTimeSlot}
                        placeholder="Contoh: 13.00 - 15.00 WIB"
                        placeholderTextColor={Colors.textLight}
                        style={styles.modalInput}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <AppText variant="label">Ruangan Baru (Opsional):</AppText>
                      <TextInput
                        value={newRoom}
                        onChangeText={setNewRoom}
                        placeholder={session.room}
                        placeholderTextColor={Colors.textLight}
                        style={styles.modalInput}
                      />
                    </View>
                  </>
                ) : null}

                <View style={styles.fieldGroup}>
                  <AppText variant="label">
                    Alasan Pengajuan {changeType === 'DELETE' ? 'Penghapusan' : 'Reschedule'} *
                  </AppText>
                  <TextInput
                    value={changeReason}
                    onChangeText={setChangeReason}
                    placeholder="Jelaskan alasan pengajuan kepada admin lab..."
                    placeholderTextColor={Colors.textLight}
                    multiline
                    numberOfLines={3}
                    style={[styles.modalInput, styles.modalTextArea]}
                  />
                </View>

                <View style={styles.changeActionRow}>
                  <CustomButton
                    title="Batal"
                    variant="outline"
                    size="md"
                    fullWidth={false}
                    style={styles.changeCancelBtn}
                    onPress={() => setChangeModalVisible(false)}
                  />
                  <CustomButton
                    title="Kirim"
                    variant={changeType === 'DELETE' ? 'danger' : 'primary'}
                    size="md"
                    fullWidth={false}
                    loading={submittingChange}
                    style={styles.changeSubmitBtn}
                    onPress={handleSubmitChangeRequest}
                  />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <FeedbackModal
        visible={feedbackVisible}
        type={feedbackType}
        title={feedbackTitle}
        message={feedbackMessage}
        primaryLabel="Mengerti"
        onPrimary={() => setFeedbackVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavTitle: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
  },
  placeholderButton: {
    width: 40,
  },
  flexText: {
    flex: 1,
  },
  flexShrinkText: {
    flexShrink: 1,
  },
  heroCard: {
    marginBottom: Spacing.md,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  courseTitle: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  detailsGrid: {
    gap: Spacing.xs,
    backgroundColor: Colors.glassOverlay,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  meetingLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(37, 99, 235, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    marginTop: Spacing.xxs,
  },
  meetingLinkText: {
    flex: 1,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.midnightBorder,
  },
  descriptionText: {
    flex: 1,
    lineHeight: 18,
  },
  controlCard: {
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  controlHeader: {
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  actionButtonContainer: {
    width: '100%',
  },
  governanceCard: {
    marginBottom: Spacing.md,
  },
  governanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  governanceDesc: {
    marginBottom: Spacing.md,
  },
  pendingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.warningBg,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
  },
  governanceBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  govBtn: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalKeyboardAvoid: {
    width: '100%',
  },
  changeModalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    maxHeight: '85%',
  },
  changeModalSub: {
    marginTop: Spacing.xxs,
    marginBottom: Spacing.md,
  },
  fieldGroup: {
    marginBottom: Spacing.sm,
  },
  modalInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sm,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  modalTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  changeActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  changeCancelBtn: {
    flex: 1,
  },
  changeSubmitBtn: {
    flex: 1.4,
  },
  rosterCard: {
    marginBottom: Spacing.md,
  },
  rosterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  rosterDesc: {
    marginBottom: Spacing.md,
  },
  rosterList: {
    gap: Spacing.xs,
  },
  rosterItem: {
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  rosterStudentCol: {
    width: '100%',
    alignItems: 'flex-start',
    gap: Spacing.xxs,
  },
  rosterBtnRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    width: '100%',
  },
  rosterActionBtn: {
    flex: 1,
  },
  labConfigCard: {
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  labConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  labConfigTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  labConfigDesc: {
    lineHeight: 18,
  },
  labMetaBox: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  labMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  punctualityCard: {
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  punctualityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
});
