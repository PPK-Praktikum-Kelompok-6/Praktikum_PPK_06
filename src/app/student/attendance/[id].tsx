import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AttendanceSuccessCard } from '@/features/attendance/components/AttendanceSuccessCard';
import { StatusBadge } from '@/features/sessions/components/StatusBadge';
import { subscribeAllClasses } from '@/services/admin';
import { subscribeToSessionAttendance } from '@/services/attendance';
import { PermitRequest, subscribeStudentPermits } from '@/services/permits';
import { PracticalClass, subscribeSessionDoc } from '@/services/sessions';
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';
import { AttendanceRecord, PracticalSession } from '@/types/attendance';
import { formatDateIndonesian } from '@/utils/formatTime';

export default function StudentAttendanceDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { currentUser } = useCurrentUser();
  const { getSessionById } = useSessions();
  const { attendanceRecords, isAlreadyAttended } = useAttendance();

  const [realtimeRecords, setRealtimeRecords] = useState<AttendanceRecord[]>([]);
  const [realtimeSession, setRealtimeSession] = useState<PracticalSession | undefined>(undefined);
  const [allClasses, setAllClasses] = useState<PracticalClass[]>([]);
  const [myPermits, setMyPermits] = useState<PermitRequest[]>([]);
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

  // Real-time listener attendance record untuk sesi ini + daftar kelas & izin (SRS-SYNC-01)
  useEffect(() => {
    if (!sessionId) return;
    const unsubscribe = subscribeToSessionAttendance(sessionId, (records) => {
      setRealtimeRecords(records);
    });
    const unsubClasses = subscribeAllClasses((cls) => {
      setAllClasses(cls);
    });
    const unsubPermits = subscribeStudentPermits(currentUser.id, (permits) => {
      setMyPermits(permits);
    });
    return () => {
      unsubscribe();
      unsubClasses();
      unsubPermits();
    };
  }, [sessionId, currentUser.id]);

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

  // Evaluasi kelas yang diikuti praktikan (dari enrolledClasses maupun studentIds kelas)
  const effectiveEnrolledCodes = Array.from(
    new Set([
      ...(currentUser.enrolledClasses || []).map((c) => c.toUpperCase()),
      ...allClasses
        .filter((cls) => (cls.studentIds || []).includes(currentUser.id))
        .map((cls) => cls.classCode.toUpperCase()),
    ])
  );

  const sessionPermit = session
    ? myPermits.find((p) => p.sessionId === session.id && p.status !== 'REJECTED')
    : undefined;

  const handleCloseFeedback = () => {
    setFeedbackState((prev) => ({ ...prev, visible: false }));
  };

  // Tangani kasus sesi tidak ditemukan
  if (!session) {
    return (
      <Screen>
        <View style={styles.navHeader}>
          <Pressable
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <Icon name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <AppText variant="title" align="center" numberOfLines={1} style={styles.headerTitle}>
            Detail Sesi
          </AppText>
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
  const isJoinedByClassId =
    Boolean(session.classId) &&
    allClasses.some(
      (c) => c.id === session.classId && (c.studentIds || []).includes(currentUser.id)
    );
  const isEnrolled =
    isJoinedByClassId ||
    effectiveEnrolledCodes.length === 0 ||
    effectiveEnrolledCodes.includes(session.classCode.toUpperCase());

  if (!isEnrolled) {
    return (
      <Screen>
        <View style={styles.navHeader}>
          <Pressable
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <Icon name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <AppText variant="title" align="center" numberOfLines={1} style={styles.headerTitle}>
            Detail Sesi
          </AppText>
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
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Icon name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <AppText variant="title" align="center" numberOfLines={1} style={styles.headerTitle}>
          Presensi Praktikum
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Detail Kartu Sesi */}
      <Card variant="flat" padding="md" style={styles.sessionHeaderCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.courseTitleWrapper}>
            <AppText variant="caption" color={Colors.primary} weight="bold">
              KELAS {session.classCode}
            </AppText>
            <AppText variant="title" weight="bold">
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
              <View style={styles.metaTextCol}>
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
              <View style={styles.metaTextCol}>
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
              <View style={styles.metaTextCol}>
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
              <View style={styles.metaTextCol}>
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

      {/* Bagian Bukti Kehadiran, Bukti Izin Disetujui, atau Status Check-In */}
      <View style={styles.contentSection}>
        {attended && attendedRecord ? (
          <AttendanceSuccessCard
            record={attendedRecord}
            style={styles.successCard}
          />
        ) : sessionPermit?.status === 'APPROVED' ? (
          <Card variant="default" padding="md" style={styles.permitApprovedCard}>
            <View style={styles.permitApprovedHeader}>
              <View style={styles.permitIconWrap}>
                <Icon name="checkmark-done-circle" size={26} color={Colors.primary} />
              </View>
              <View style={styles.permitHeaderTitleCol}>
                <Badge label="Izin Praktikum Disetujui" variant="open" size="sm" showDot />
                <AppText variant="title" weight="bold" style={styles.permitApprovedTitle}>
                  Ketidakhadiran Anda Tercatat Resmi
                </AppText>
              </View>
            </View>
            <AppText variant="bodySm" color={Colors.textSecondary}>
              Alasan: &ldquo;{sessionPermit.reason}&rdquo;
            </AppText>
            {sessionPermit.decisionNote ? (
              <View style={styles.permitDecisionNote}>
                <AppText variant="caption" weight="bold" color={Colors.primaryDark}>
                  Catatan Asisten ({sessionPermit.reviewedBy || 'Asisten'}):
                </AppText>
                <AppText variant="caption" color={Colors.textSecondary}>
                  {sessionPermit.decisionNote}
                </AppText>
              </View>
            ) : null}
          </Card>
        ) : (
          <Card variant="flat" padding="md" style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
              <View style={styles.actionCardIconWrap}>
                <Icon name="finger-print" size={24} color={Colors.primary} />
              </View>
              <View style={styles.actionCardTitleWrap}>
                <AppText variant="title" weight="bold">
                  Status Check-In
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {session.status === 'OPEN'
                    ? 'Sesi sedang dibuka. Silakan lakukan check-in kehadiran.'
                    : session.status === 'NOT_STARTED'
                    ? 'Sesi belum dibuka oleh Asisten Praktikum.'
                    : 'Sesi praktikum telah ditutup.'}
                </AppText>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.actionCardBody}>
              {session.deliveryMode !== 'ONLINE' && (
                <View style={styles.locationNoticeBox}>
                  <Icon name="location-outline" size={16} color={Colors.primary} />
                  <AppText variant="caption" color={Colors.textSecondary} style={styles.locationNoticeText}>
                    Presensi tatap muka (luring) memvalidasi keberadaan fisik Anda di dalam radius {session.room}.
                  </AppText>
                </View>
              )}

              {session.status === 'OPEN' ? (
                <CustomButton
                  title="Masuk ke Halaman Presensi"
                  variant="primary"
                  size="lg"
                  icon={<Icon name="arrow-forward-circle" size={20} color={Colors.textWhite} />}
                  iconPosition="right"
                  onPress={() =>
                    router.push({
                      pathname: '/student/check-in/[id]' as any,
                      params: { id: session.id },
                    })
                  }
                />
              ) : session.status === 'NOT_STARTED' ? (
                <CustomButton
                  title="Sesi Belum Dibuka"
                  variant="secondary"
                  size="lg"
                  disabled
                  icon={<Icon name="time-outline" size={20} color={Colors.textMuted} />}
                  onPress={() => {}}
                />
              ) : (
                <CustomButton
                  title="Presensi Ditutup"
                  variant="secondary"
                  size="lg"
                  disabled
                  icon={<Icon name="lock-closed-outline" size={20} color={Colors.textMuted} />}
                  onPress={() => {}}
                />
              )}

              {session.status !== 'CLOSED' && (
                <Pressable
                  hitSlop={4}
                  style={styles.permitLinkBtn}
                  onPress={() => router.push('/student/permit')}
                >
                  <Icon name="document-text-outline" size={16} color={Colors.primary} />
                  <AppText
                    variant="caption"
                    weight="semibold"
                    color={Colors.primary}
                    style={styles.permitLinkText}
                  >
                    Berhalangan hadir? Ajukan Izin Ketidakhadiran
                  </AppText>
                </Pressable>
              )}
            </View>
          </Card>
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
    gap: Spacing.sm,
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
  backButtonPressed: {
    opacity: 0.75,
  },
  headerTitle: {
    flex: 1,
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
  metaTextCol: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xxs,
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
    gap: Spacing.xxs,
  },
  contentSection: {
    marginBottom: Spacing.lg,
  },
  successCard: {
    marginTop: Spacing.xs,
  },
  emptyContainer: {
    marginTop: Spacing.xxl,
  },
  permitApprovedCard: {
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryBg,
    gap: Spacing.sm,
  },
  permitApprovedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  permitIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permitHeaderTitleCol: {
    flex: 1,
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  permitApprovedTitle: {
    marginTop: Spacing.xxs,
  },
  permitDecisionNote: {
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    gap: Spacing.xxs,
  },
  actionCard: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitleWrap: {
    flex: 1,
    gap: Spacing.xxs,
  },
  actionCardBody: {
    gap: Spacing.md,
  },
  locationNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  locationNoticeText: {
    flex: 1,
  },
  permitLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  permitLinkText: {
    flexShrink: 1,
  },
});

