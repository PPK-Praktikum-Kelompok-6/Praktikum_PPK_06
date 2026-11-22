import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal, FeedbackType } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AttendanceTable } from '@/features/attendance/components/AttendanceTable';
import { StatSummaryCard } from '@/features/attendance/components/StatSummaryCard';
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
import {
  PermitRequest,
  recordManualPermitByAssistant,
  subscribeIncomingPermits,
} from '@/services/permits';
import { PracticalClass, subscribeSessionDoc } from '@/services/sessions';
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';
import { canOpen, isSessionExpired } from '@/store/rules';
import { AttendanceRecord, PracticalSession } from '@/types/attendance';
import { formatDateIndonesian } from '@/utils/formatTime';

export default function AssistantSessionDetailRoute() {
  const { currentUser } = useCurrentUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSessionById, openSession, closeSession } = useSessions();
  const { getAttendanceBySession } = useAttendance();

  const [controlModalVisible, setControlModalVisible] = useState(false);
  const [controlAction, setControlAction] = useState<SessionControlAction>('OPEN');
  const [realtimeRecords, setRealtimeRecords] = useState<AttendanceRecord[]>([]);
  const [realtimeSession, setRealtimeSession] = useState<PracticalSession | undefined>(undefined);
  const [allClasses, setAllClasses] = useState<PracticalClass[]>([]);
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [sessionPermits, setSessionPermits] = useState<PermitRequest[]>([]);
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

  // Real-time listener dokumen sesi praktikum dari Firestore
  useEffect(() => {
    if (!id) return;
    const unsubSession = subscribeSessionDoc(id, (sess) => {
      setRealtimeSession(sess);
    });
    return () => unsubSession();
  }, [id]);

  // Real-time listener rekapitulasi kehadiran (SRS-SYNC-01) + kelas, user, & izin
  useEffect(() => {
    if (!id) return;
    const unsubscribeAtt = subscribeToSessionAttendance(id, (records) => {
      setRealtimeRecords(records);
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

  // Batasan peran: Praktikan tidak boleh mengakses detail dan kontrol sesi asisten
  if (currentUser.role !== 'ASSISTANT') {
    return (
      <Screen style={styles.container}>
        <View style={styles.topNav}>
          <Pressable
            onPress={() => router.replace('/student')}
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
      : (id ? getAttendanceBySession(id) : []);

  if (!session) {
    return (
      <Screen style={styles.container}>
        <View style={styles.topNav}>
          <Pressable
            onPress={() => router.back()}
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
    <Screen style={styles.container}>
      {/* Top Header Navigation */}
      <View style={styles.topNav}>
        <Pressable
          onPress={() => router.back()}
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
            <AppText variant="bodySm" color={Colors.textWhite}>
              {session.deliveryMode === 'ONLINE' ? 'Daring (Online)' : session.room}
            </AppText>
          </View>

          <View style={styles.detailRow}>
            <Icon name="time-outline" size={16} color={Colors.textWhiteMuted} />
            <AppText variant="bodySm" color={Colors.textWhite}>
              {session.timeSlot}
            </AppText>
          </View>

          <View style={styles.detailRow}>
            <Icon name="calendar-outline" size={16} color={Colors.textWhiteMuted} />
            <AppText variant="bodySm" color={Colors.textWhite}>
              {formatDateIndonesian(session.date)}
            </AppText>
          </View>

          <View style={styles.detailRow}>
            <Icon name="person-outline" size={16} color={Colors.textWhiteMuted} />
            <AppText variant="bodySm" color={Colors.textWhite}>
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

      {/* Tata Kelola Sesi: Reschedule / Hapus dengan Izin Admin */}
      <Card variant="default" padding="md" style={styles.governanceCard}>
        <View style={styles.governanceHeader}>
          <Icon name="shield-checkmark" size={18} color={Colors.primary} />
          <AppText variant="title">Pengaturan Jadwal & Otorisasi</AppText>
        </View>
        <AppText variant="caption" color={Colors.textMuted} style={styles.governanceDesc}>
          Setiap perubahan jadwal (reschedule) atau penghapusan sesi wajib mendapatkan persetujuan dari Administrator Lab.
        </AppText>

        {session.pendingChangeRequest ? (
          <View style={styles.pendingNoticeBox}>
            <Icon name="time-outline" size={16} color={Colors.warning} />
            <AppText variant="caption" weight="semibold" color={Colors.warning}>
              Sesi ini sedang menunggu persetujuan Admin untuk{' '}
              {session.pendingChangeRequest === 'DELETE' ? 'penghapusan' : 'reschedule'}.
            </AppText>
          </View>
        ) : (
          <View style={styles.governanceBtnRow}>
            <CustomButton
              title="Minta Reschedule"
              variant="outline"
              size="sm"
              icon={<Icon name="calendar-outline" size={16} color={Colors.primary} />}
              style={styles.govBtn}
              onPress={() => handleOpenChangeModal('RESCHEDULE')}
            />
            <CustomButton
              title="Minta Hapus Sesi"
              variant="outline"
              size="sm"
              icon={<Icon name="trash-outline" size={16} color={Colors.danger} />}
              style={styles.govBtn}
              onPress={() => handleOpenChangeModal('DELETE')}
            />
          </View>
        )}
      </Card>

      {/* Attendance Ratio Summary */}
      <StatSummaryCard
        attendedCount={attendanceRecords.length}
        totalStudents={session.totalStudents}
      />

      {/* Attendance Recap Table */}
      <AttendanceTable records={attendanceRecords} />

      {/* Kontrol Override Presensi & Izin Manual oleh Asisten (Untuk Praktikan Lupa Presensi / Telat Join / Surat Dokter Fisik) */}
      <Card variant="default" padding="md" style={styles.rosterCard}>
        <View style={styles.rosterHeader}>
          <Icon name="people-outline" size={18} color={Colors.primary} />
          <AppText variant="title">Status Peserta Kelas & Input Manual</AppText>
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
                      {attendedRec ? (
                        <Badge label="Sudah Hadir" variant="attended" size="sm" showDot />
                      ) : permitRec ? (
                        <Badge
                          label={
                            permitRec.status === 'APPROVED'
                              ? 'Izin Disetujui'
                              : 'Izin Menunggu Review'
                          }
                          variant={
                            permitRec.status === 'APPROVED' ? 'open' : 'waiting'
                          }
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

                    {!attendedRec && permitRec?.status !== 'APPROVED' ? (
                      <View style={styles.rosterBtnCol}>
                        <CustomButton
                          title="Tandai Hadir"
                          variant="primary"
                          size="sm"
                          fullWidth={false}
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
                          title="Izin/Sakit Fisik"
                          variant="outline"
                          size="sm"
                          fullWidth={false}
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
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setChangeModalVisible(false)}
        />
        <View style={styles.changeModalSheet}>
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
              style={styles.govBtn}
              onPress={() => setChangeModalVisible(false)}
            />
            <CustomButton
              title="Kirim ke Admin"
              variant={changeType === 'DELETE' ? 'danger' : 'primary'}
              size="md"
              loading={submittingChange}
              style={styles.govBtn}
              onPress={handleSubmitChangeRequest}
            />
          </View>
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
  container: {
    paddingHorizontal: Spacing.md,
  },
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
  heroCard: {
    marginBottom: Spacing.lg,
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
    alignItems: 'center',
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
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  controlHeader: {
    marginBottom: Spacing.md,
    gap: 4,
  },
  actionButtonContainer: {
    width: '100%',
  },
  governanceCard: {
    marginBottom: Spacing.lg,
  },
  governanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  governanceDesc: {
    marginBottom: Spacing.md,
  },
  pendingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  changeModalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  changeModalSub: {
    marginTop: 2,
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
    fontSize: 14,
    color: Colors.text,
    marginTop: 4,
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
  rosterCard: {
    marginBottom: Spacing.xl,
  },
  rosterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  rosterDesc: {
    marginBottom: Spacing.md,
  },
  rosterList: {
    gap: Spacing.sm,
  },
  rosterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  rosterStudentCol: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 3,
  },
  rosterBtnCol: {
    flexDirection: 'column',
    gap: 6,
  },
});
