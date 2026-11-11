import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';
import { canAttend } from '@/store/rules';
import { formatDateIndonesian, formatTime } from '@/utils/formatTime';

export default function StudentAttendanceDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { currentUser } = useCurrentUser();
  const { getSessionById } = useSessions();
  const { attendanceRecords, submitAttendance, isAlreadyAttended } = useAttendance();

  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const session = sessionId ? getSessionById(sessionId) : undefined;

  // Cek apakah praktikan aktif sudah tercatat hadir
  const attended = session
    ? isAlreadyAttended(session.id, currentUser.id)
    : false;

  // Ambil record presensi praktikan untuk sesi ini jika sudah hadir
  const attendedRecord = attended && session
    ? attendanceRecords.find(
        (rec) => rec.sessionId === session.id && rec.studentId === currentUser.id
      )
    : undefined;

  // Evaluasi aturan bisnis murni dari store/rules.ts
  const rule = canAttend(session, attendanceRecords, currentUser.id);

  const handleAttendanceSubmit = (notes: string) => {
    if (!session) return;

    setIsSubmitting(true);
    const result = submitAttendance(session.id, currentUser, notes);
    setIsSubmitting(false);

    if (result.success) {
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
        message: result.message,
      });
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
              <Icon name="location-outline" size={16} color={Colors.primary} />
              <View>
                <AppText variant="caption" color={Colors.textMuted}>
                  RUANGAN
                </AppText>
                <AppText variant="bodySm" weight="semibold">
                  {session.room}
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

