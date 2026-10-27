import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
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
import { useAttendance, useSessions } from '@/store/hooks';
import { formatDateIndonesian } from '@/utils/formatTime';

export default function AssistantSessionDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSessionById, openSession, closeSession } = useSessions();
  const { getAttendanceBySession } = useAttendance();

  const [controlModalVisible, setControlModalVisible] = useState(false);
  const [controlAction, setControlAction] = useState<SessionControlAction>('OPEN');

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('success');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const session = id ? getSessionById(id) : undefined;
  const attendanceRecords = id ? getAttendanceBySession(id) : [];

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
    setControlAction(action);
    setControlModalVisible(true);
  };

  const handleConfirmAction = () => {
    setControlModalVisible(false);
    if (controlAction === 'OPEN') {
      const ok = openSession(session.id);
      if (ok) {
        setFeedbackType('success');
        setFeedbackTitle('Sesi Berhasil Dibuka!');
        setFeedbackMessage(
          `Sesi ${session.courseName} (${session.classCode}) sekarang dibuka. Praktikan dapat mengisi presensi.`
        );
        setFeedbackVisible(true);
      } else {
        setFeedbackType('error');
        setFeedbackTitle('Gagal Membuka Sesi');
        setFeedbackMessage('Sesi tidak dapat dibuka.');
        setFeedbackVisible(true);
      }
    } else {
      const ok = closeSession(session.id);
      if (ok) {
        setFeedbackType('success');
        setFeedbackTitle('Sesi Berhasil Ditutup!');
        setFeedbackMessage(
          `Sesi ${session.courseName} (${session.classCode}) resmi ditutup. Presensi baru telah dikunci.`
        );
        setFeedbackVisible(true);
      } else {
        setFeedbackType('error');
        setFeedbackTitle('Gagal Menutup Sesi');
        setFeedbackMessage('Sesi tidak dapat ditutup.');
        setFeedbackVisible(true);
      }
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
            <Icon name="location-outline" size={16} color={Colors.textWhiteMuted} />
            <AppText variant="bodySm" color={Colors.textWhite}>
              {session.room}
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

      {/* Attendance Ratio Summary */}
      <StatSummaryCard
        attendedCount={attendanceRecords.length}
        totalStudents={session.totalStudents}
      />

      {/* Attendance Recap Table */}
      <AttendanceTable records={attendanceRecords} />

      {/* Confirmation Modal */}
      <SessionControlModal
        visible={controlModalVisible}
        action={controlAction}
        courseName={session.courseName}
        classCode={session.classCode}
        onConfirm={handleConfirmAction}
        onCancel={() => setControlModalVisible(false)}
      />

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
});
