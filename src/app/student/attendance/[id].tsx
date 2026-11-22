import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { AttendanceForm } from '@/features/attendance/components/AttendanceForm';
import { AttendanceSuccessCard } from '@/features/attendance/components/AttendanceSuccessCard';
import { StatusBadge } from '@/features/sessions/components/StatusBadge';
import {
  submitAttendanceToFirestore,
  subscribeToSessionAttendance,
} from '@/services/attendance';
import { subscribeSessionDoc } from '@/services/sessions';
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';
import { canAttend } from '@/store/rules';
import { AttendanceRecord, PracticalSession } from '@/types/attendance';
import { formatDateIndonesian, formatTime } from '@/utils/formatTime';

export default function StudentAttendanceDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { currentUser } = useCurrentUser();
  const { getSessionById } = useSessions();
  const { attendanceRecords, submitAttendance, isAlreadyAttended } = useAttendance();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [realtimeRecords, setRealtimeRecords] = useState<AttendanceRecord[]>([]);
  const [realtimeSession, setRealtimeSession] = useState<PracticalSession | undefined>(undefined);
  const [feedbackState, setFeedbackState] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Real-time listener dokumen sesi (SRS-SYNC-01)
  useEffect(() => {
    if (!sessionId) return;
    const unsubSession = subscribeSessionDoc(sessionId, (sess) => {
      setRealtimeSession(sess);
    });
    return () => unsubSession();
  }, [sessionId]);

  // Real-time listener attendance record untuk sesi ini (SRS-SYNC-01)
  useEffect(() => {
    if (!sessionId) return;
    const unsubscribe = subscribeToSessionAttendance(sessionId, (records) => {
      setRealtimeRecords(records);
    });
    return () => unsubscribe();
  }, [sessionId]);

  const session = realtimeSession || (sessionId ? getSessionById(sessionId) : undefined);

  // Cek apakah praktikan aktif sudah tercatat hadir (dari real-time atau store lokal)
  const realtimeAttendedRecord = realtimeRecords.find(
    (rec) => rec.studentId === currentUser.id
  );
  const localAttended = session
    ? isAlreadyAttended(session.id, currentUser.id)
    : false;
  const attended = Boolean(realtimeAttendedRecord || localAttended);

  // Ambil record presensi praktikan untuk sesi ini jika sudah hadir
  const attendedRecord =
    realtimeAttendedRecord ||
    (attended && session
      ? attendanceRecords.find(
          (rec) => rec.sessionId === session.id && rec.studentId === currentUser.id
        )
      : undefined);

  // Evaluasi aturan bisnis murni dari store/rules.ts
  const rule = canAttend(
    session,
    attendanceRecords,
    currentUser.id,
    currentUser.enrolledClasses
  );

  const handleAttendanceSubmit = async (notes: string) => {
    if (!session) return;

    setIsSubmitting(true);
    try {
      // 1. Submit ke Firestore dengan proteksi Anti-Bocor (SRS-PRES-02)
      const res = await submitAttendanceToFirestore({
        sessionId: session.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentNim: currentUser.identifier,
        notes,
      });

      // 2. Selaraskan juga ke store lokal Sprint 1
      submitAttendance(session.id, currentUser, notes);

      if (res.success) {
        const nowIso = new Date().toISOString();
        const timeStr = formatTime(nowIso);
        setFeedbackState({
          visible: true,
          type: 'success',
          title: 'Presensi Berhasil!',
          message: `Kehadiran Anda pada sesi ${session.courseName} (${session.classCode}) telah tercatat pada pukul ${timeStr}.`,
        });
      } else {
        setFeedbackState({
          visible: true,
          type: 'error',
          title: 'Presensi Tidak Dapat Diproses',
          message: res.message,
        });
      }
    } catch (err: any) {
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: err?.message || 'Terjadi kesalahan saat memproses presensi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseFeedback = () => {
    setFeedbackState((prev) => ({ ...prev, visible: false }));
  };

  // Tangani kasus sesi tidak ditemukan
  if (!session) {
    return (
      <Screen>
        <View style={styles.navHeader}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <Icon name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <AppText variant="title">Detail Sesi</AppText>
          <View style={styles.headerSpacer} />
        </View>

        <EmptyState
          title="Sesi Tidak Ditemukan"
          message="Sesi praktikum yang Anda cari tidak tersedia atau ID sesi salah."
          iconName="alert-circle-outline"
          actionLabel="Kembali ke Jadwal"
          onAction={() => router.back()}
          style={styles.emptyContainer}
        />
      </Screen>
    );
  }

  // Batasan kelas: Praktikan hanya berhak mengakses kelas yang diikutinya (SRS-RBAC-01)
  const isEnrolled =
    !currentUser.enrolledClasses ||
    currentUser.enrolledClasses.length === 0 ||
    currentUser.enrolledClasses.some(
      (c) => c.toUpperCase() === session.classCode.toUpperCase()
    );

  if (!isEnrolled) {
    return (
      <Screen>
        <View style={styles.navHeader}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <Icon name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <AppText variant="title">Detail Sesi</AppText>
          <View style={styles.headerSpacer} />
        </View>

        <EmptyState
          title="Akses Ditolak: Bukan Kelas Anda"
          message={`Anda tidak terdaftar di kelas praktikum ${session.classCode} (${session.courseName}). Anda hanya berhak mengakses kelas yang Anda ikuti.`}
          iconName="lock-closed-outline"
          actionLabel="Kembali ke Jadwal Saya"
          onAction={() => router.replace('/student')}
          style={styles.emptyContainer}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Icon name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <AppText variant="title" style={styles.headerTitle}>
          Presensi Praktikum
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Detail Kartu Sesi */}
      <Card variant="flat" padding="lg" style={styles.sessionHeaderCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.courseTitleWrapper}>
            <AppText variant="caption" color={Colors.primary} weight="bold">
              KELAS {session.classCode}
            </AppText>
            <AppText variant="h2" style={styles.courseName}>
              {session.courseName}
            </AppText>
          </View>
          <StatusBadge status={session.status} attended={attended} />
        </View>

        <View style={styles.divider} />

        <View style={styles.metaGrid}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon
                name={session.deliveryMode === 'ONLINE' ? 'videocam-outline' : 'location-outline'}
                size={16}
                color={Colors.primary}
              />
              <View>
                <AppText variant="caption" color={Colors.textMuted}>
                  {session.deliveryMode === 'ONLINE' ? 'METODE' : 'RUANGAN'}
                </AppText>
                <AppText variant="bodySm" weight="semibold">
                  {session.deliveryMode === 'ONLINE' ? 'Daring (Online)' : session.room}
                </AppText>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Icon name="time-outline" size={16} color={Colors.primary} />
              <View>
                <AppText variant="caption" color={Colors.textMuted}>
                  WAKTU
                </AppText>
                <AppText variant="bodySm" weight="semibold">
                  {session.timeSlot}
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="calendar-outline" size={16} color={Colors.primary} />
              <View>
                <AppText variant="caption" color={Colors.textMuted}>
                  TANGGAL
                </AppText>
                <AppText variant="bodySm" weight="semibold">
                  {formatDateIndonesian(session.date)}
                </AppText>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Icon name="person-outline" size={16} color={Colors.primary} />
              <View>
                <AppText variant="caption" color={Colors.textMuted}>
                  ASISTEN
                </AppText>
                <AppText variant="bodySm" weight="semibold">
                  {session.assistantName}
                </AppText>
              </View>
            </View>
          </View>

          {session.meetingLink ? (
            <Pressable
              style={styles.meetingLinkBox}
              onPress={() => Linking.openURL(session.meetingLink!)}
            >
              <Icon name="link-outline" size={16} color={Colors.primary} />
              <AppText
                variant="caption"
                weight="bold"
                color={Colors.primaryDark}
                numberOfLines={1}
                style={styles.meetingLinkText}
              >
                Buka Link Praktikum: {session.meetingLink}
              </AppText>
            </Pressable>
          ) : null}

          {session.description ? (
            <View style={styles.descriptionContainer}>
              <Icon name="document-text-outline" size={16} color={Colors.primary} />
              <View style={styles.descriptionContent}>
                <AppText variant="caption" color={Colors.textMuted} weight="bold">
                  DESKRIPSI / TOPIK
                </AppText>
                <AppText variant="bodySm" color={Colors.textSecondary}>
                  {session.description}
                </AppText>
              </View>
            </View>
          ) : null}
        </View>
      </Card>

      {/* Bagian Bukti Kehadiran atau Form Presensi */}
      <View style={styles.contentSection}>
        {attended && attendedRecord ? (
          <AttendanceSuccessCard
            record={attendedRecord}
            session={session}
            style={styles.successCard}
          />
        ) : (
          <AttendanceForm
            session={session}
            currentUser={currentUser}
            isAttended={attended}
            canSubmit={rule.allowed}
            disabledReason={rule.reason}
            loading={isSubmitting}
            onSubmit={handleAttendanceSubmit}
          />
        )}
      </View>

      {/* Feedback Modal Konfirmasi */}
      <FeedbackModal
        visible={feedbackState.visible}
        type={feedbackState.type}
        title={feedbackState.title}
        message={feedbackState.message}
        primaryLabel="Tutup"
        onPrimary={handleCloseFeedback}
        onClose={handleCloseFeedback}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.xl,
  },
  headerSpacer: {
    width: 40,
  },
  sessionHeaderCard: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  courseTitleWrapper: {
    flex: 1,
    gap: Spacing.xxs,
  },
  courseName: {
    fontSize: Typography.lg,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  metaGrid: {
    gap: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  meetingLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    marginTop: Spacing.xxs,
  },
  meetingLinkText: {
    flex: 1,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  descriptionContent: {
    flex: 1,
    gap: 2,
  },
  contentSection: {
    marginBottom: Spacing.xl,
  },
  successCard: {
    marginTop: Spacing.xs,
  },
  emptyContainer: {
    marginTop: Spacing.xxl,
  },
});

