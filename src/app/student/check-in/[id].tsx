import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { RippleCheckIn } from '@/components/ui/RippleCheckIn';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AttendanceSuccessCard } from '@/features/attendance/components/AttendanceSuccessCard';
import { LocationStatusBanner } from '@/features/attendance/components/LocationStatusBanner';
import { StatusBadge } from '@/features/sessions/components/StatusBadge';
import { subscribeAllClasses } from '@/services/admin';
import {
  submitAttendanceToFirestore,
  subscribeToSessionAttendance,
} from '@/services/attendance';
import { getLabByRoomName, subscribeLabs } from '@/services/labs';
import { PermitRequest, subscribeStudentPermits } from '@/services/permits';
import { PracticalClass, subscribeSessionDoc } from '@/services/sessions';
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';
import { AttendanceRecord, PracticalSession } from '@/types/attendance';
import {
  Coordinates,
  LabLocation,
  LocationValidationResult,
} from '@/types/lab';
import { formatTime } from '@/utils/formatTime';
import { isRoomMatchingLab, validateStudentLocation } from '@/utils/geo';

export default function StudentCheckInRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { currentUser } = useCurrentUser();
  const { getSessionById } = useSessions();
  const { attendanceRecords, submitAttendance, isAlreadyAttended } =
    useAttendance();

  const [realtimeSession, setRealtimeSession] = useState<
    PracticalSession | undefined
  >(undefined);
  const [realtimeRecords, setRealtimeRecords] = useState<AttendanceRecord[]>(
    []
  );
  const [allClasses, setAllClasses] = useState<PracticalClass[]>([]);
  const [myPermits, setMyPermits] = useState<PermitRequest[]>([]);
  const [labLocation, setLabLocation] = useState<LabLocation | null>(null);

  // Geolocation states
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(true);
  const [validationResult, setValidationResult] =
    useState<LocationValidationResult>({
      allowed: false,
      status: 'CHECKING',
      distanceMeters: null,
      maxRadiusMeters: 60,
      message: 'Sedang mendeteksi posisi GPS perangkat Anda...',
    });

  const [notes, setNotes] = useState('');
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

  // 1. Real-time listener sesi
  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeSessionDoc(sessionId, (sess) => {
      setRealtimeSession(sess);
    });
    return () => unsub();
  }, [sessionId]);

  // 2. Real-time listener rekaman presensi + kelas + izin praktikan
  useEffect(() => {
    if (!sessionId) return;
    const unsubAtt = subscribeToSessionAttendance(sessionId, (records) => {
      setRealtimeRecords(records);
    });
    const unsubClasses = subscribeAllClasses((cls) => {
      setAllClasses(cls);
    });
    const unsubPermits = subscribeStudentPermits(currentUser.id, (permits) => {
      setMyPermits(permits);
    });
    return () => {
      unsubAtt();
      unsubClasses();
      unsubPermits();
    };
  }, [sessionId, currentUser.id]);

  const session =
    realtimeSession || (sessionId ? getSessionById(sessionId) : undefined);

  // 3. Sinkronisasi data Lab dari Firestore
  useEffect(() => {
    if (!session?.room) return;
    const unsubLabs = subscribeLabs((labs) => {
      const found = labs.find((l) =>
        isRoomMatchingLab(session.room, l, session.labId)
      );
      if (found) {
        setLabLocation(found);
      }
    });
    return () => unsubLabs();
  }, [session?.room, session?.labId]);

  const effectiveRadius =
    session?.radiusMeters ?? labLocation?.radiusMeters ?? 60;

  // 4. Deteksi & Validasi Lokasi Praktikan (SRS-S3-02)
  const handleCheckLocation = async () => {
    if (!session) return;

    setCheckingLocation(true);
    setValidationResult((prev) => ({
      ...prev,
      status: 'CHECKING',
      message: 'Membaca sensor GPS perangkat...',
    }));

    // Kasus Sesi Daring (Online): Validasi lokasi dilewati
    if (session.deliveryMode === 'ONLINE') {
      setCheckingLocation(false);
      setValidationResult({
        allowed: true,
        status: 'INSIDE_RADIUS',
        distanceMeters: 0,
        maxRadiusMeters: 0,
        message:
          'Sesi ini diselenggarakan daring (online). Validasi radius laboratorium tidak diwajibkan.',
      });
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCheckingLocation(false);
        setValidationResult({
          allowed: false,
          status: 'PERMISSION_DENIED',
          distanceMeters: null,
          maxRadiusMeters: effectiveRadius,
          message:
            'Izin akses lokasi perangkat ditolak. Buka pengaturan perangkat untuk mengaktifkan izin lokasi.',
        });
        return;
      }

      const isServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isServicesEnabled) {
        setCheckingLocation(false);
        setValidationResult({
          allowed: false,
          status: 'GPS_DISABLED',
          distanceMeters: null,
          maxRadiusMeters: effectiveRadius,
          message:
            'Layanan lokasi (GPS) pada perangkat belum aktif. Harap aktifkan GPS terlebih dahulu.',
        });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setUserCoords(coords);

      let targetLab = labLocation;
      if (!targetLab) {
        targetLab = await getLabByRoomName(session.room);
        if (targetLab) {
          setLabLocation(targetLab);
        }
      }

      if (targetLab) {
        const radius = session.radiusMeters ?? targetLab.radiusMeters ?? 60;
        const result = validateStudentLocation(coords, {
          latitude: targetLab.latitude,
          longitude: targetLab.longitude,
          radiusMeters: radius,
          name: targetLab.name,
        });
        setValidationResult(result);
      } else {
        setValidationResult({
          allowed: true,
          status: 'INSIDE_RADIUS',
          distanceMeters: null,
          maxRadiusMeters: effectiveRadius,
          message: `Lokasi laboratorium ${session.room} belum terdaftar. Presensi dapat dilanjutkan.`,
        });
      }
    } catch (err: any) {
      setValidationResult({
        allowed: false,
        status: 'UNAVAILABLE',
        distanceMeters: null,
        maxRadiusMeters: effectiveRadius,
        message:
          err?.message ||
          'Gagal membaca posisi GPS. Pastikan Anda berada di area dengan sinyal lokasi yang memadai.',
      });
    } finally {
      setCheckingLocation(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      void handleCheckLocation();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.deliveryMode, session?.room]);

  // Nilai validasi efektif yang otomatis menyesuaikan perubahan radius sesi secara real-time tanpa cascading render
  const effectiveValidationResult = React.useMemo<LocationValidationResult>(() => {
    if (
      !checkingLocation &&
      session &&
      session.deliveryMode !== 'ONLINE' &&
      userCoords &&
      labLocation
    ) {
      return validateStudentLocation(userCoords, {
        latitude: labLocation.latitude,
        longitude: labLocation.longitude,
        radiusMeters: effectiveRadius,
        name: labLocation.name,
      });
    }
    return validationResult;
  }, [
    checkingLocation,
    session,
    userCoords,
    labLocation,
    effectiveRadius,
    validationResult,
  ]);

  // Cek apakah praktikan sudah presensi
  const realtimeAttendedRecord = realtimeRecords.find(
    (r) => r.studentId === currentUser.id
  );
  const localAttended = session
    ? isAlreadyAttended(session.id, currentUser.id)
    : false;
  const alreadyAttended = Boolean(realtimeAttendedRecord || localAttended);

  const attendedRecord =
    realtimeAttendedRecord ||
    (alreadyAttended && session
      ? attendanceRecords.find(
          (rec) =>
            rec.sessionId === session.id && rec.studentId === currentUser.id
        )
      : undefined);

  const sessionPermit = session
    ? myPermits.find(
        (p) => p.sessionId === session.id && p.status !== 'REJECTED'
      )
    : undefined;

  // Evaluasi kelas yang diikuti praktikan (RBAC)
  const effectiveEnrolledCodes = Array.from(
    new Set([
      ...(currentUser.enrolledClasses || []).map((c) => c.toUpperCase()),
      ...allClasses
        .filter((cls) => (cls.studentIds || []).includes(currentUser.id))
        .map((cls) => cls.classCode.toUpperCase()),
    ])
  );

  // Submit Presensi
  const handleSubmitAttendance = async () => {
    if (!session || isSubmitting || alreadyAttended) return;

    if (session.status !== 'OPEN') {
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Sesi Belum Dibuka',
        message: 'Presensi hanya dapat dilakukan saat sesi berstatus OPEN.',
      });
      return;
    }

    if (session.deliveryMode !== 'ONLINE' && !effectiveValidationResult.allowed) {
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Presensi Ditolak',
        message: effectiveValidationResult.message,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitAttendanceToFirestore({
        sessionId: session.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentNim: currentUser.identifier,
        notes: notes.trim(),
        userCoords,
        labLocation,
      });

      if (res.success) {
        submitAttendance(session.id, currentUser, notes.trim());
        const timeStr = formatTime(new Date().toISOString());
        setFeedbackState({
          visible: true,
          type: 'success',
          title: 'Presensi Berhasil!',
          message: `Kehadiran Anda pada sesi ${session.courseName} (${session.classCode}) telah tercatat resmi pada pukul ${timeStr}.`,
        });
      } else {
        setFeedbackState({
          visible: true,
          type: 'error',
          title: 'Presensi Gagal',
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

  const handleFeedbackClose = () => {
    const isSuccess = feedbackState.type === 'success';
    setFeedbackState((prev) => ({ ...prev, visible: false }));
    if (isSuccess && session) {
      router.replace({
        pathname: '/student/attendance/[id]',
        params: { id: session.id },
      });
    }
  };

  if (currentUser.role !== 'STUDENT') {
    return (
      <Screen>
        <EmptyState
          title="Akses Khusus Praktikan"
          message="Halaman check-in presensi ini hanya diperuntukkan bagi Praktikan."
          iconName="lock-closed-outline"
          actionLabel="Kembali"
          onAction={() => router.replace('/assistant')}
        />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <EmptyState
          title="Sesi Tidak Ditemukan"
          message="Informasi sesi praktikum tidak ditemukan."
          iconName="alert-circle-outline"
          actionLabel="Kembali"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const isJoinedByClassId =
    Boolean(session.classId) &&
    allClasses.some(
      (c) =>
        c.id === session.classId &&
        (c.studentIds || []).includes(currentUser.id)
    );
  const isEnrolled =
    isJoinedByClassId ||
    effectiveEnrolledCodes.length === 0 ||
    effectiveEnrolledCodes.includes(session.classCode.toUpperCase());

  if (!isEnrolled) {
    return (
      <Screen>
        <View style={styles.topNav}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <Icon name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <AppText variant="title">Halaman Presensi</AppText>
          <View style={styles.navSpacer} />
        </View>
        <EmptyState
          title="Akses Ditolak: Bukan Kelas Anda"
          message={`Anda tidak terdaftar di kelas praktikum ${session.classCode} (${session.courseName}).`}
          iconName="lock-closed-outline"
          actionLabel="Kembali ke Jadwal Saya"
          onAction={() => router.replace('/student')}
        />
      </Screen>
    );
  }

  const hasApprovedPermit = sessionPermit?.status === 'APPROVED';

  const canSubmitAttendance =
    session.status === 'OPEN' &&
    !alreadyAttended &&
    !hasApprovedPermit &&
    !checkingLocation &&
    (session.deliveryMode === 'ONLINE' || effectiveValidationResult.allowed);

  const getButtonTitle = () => {
    if (isSubmitting) return 'Mengirim Presensi...';
    if (alreadyAttended) return 'Anda Sudah Hadir';
    if (hasApprovedPermit) return 'Izin Telah Disetujui';
    if (session.status === 'NOT_STARTED') return 'Sesi Belum Dibuka';
    if (session.status === 'CLOSED') return 'Sesi Sudah Ditutup';
    if (checkingLocation) return 'Mendeteksi Lokasi GPS...';
    if (session.deliveryMode !== 'ONLINE' && !effectiveValidationResult.allowed) {
      return 'Di Luar Radius Lab';
    }
    return 'Kirim Presensi (Check-In)';
  };

  return (
    <Screen>
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
        <AppText variant="title">Halaman Presensi</AppText>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Ringkasan Sesi */}
        <Card variant="flat" padding="md" style={styles.sessionCard}>
          <View style={styles.sessionCardHeader}>
            <View style={styles.sessionTitleCol}>
              <Badge
                label={`Kelas ${session.classCode}`}
                variant="attended"
                size="sm"
              />
              <AppText variant="h2" numberOfLines={1} style={styles.courseTitle}>
                {session.courseName}
              </AppText>
            </View>
            <StatusBadge status={session.status} attended={alreadyAttended} />
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon
                name={
                  session.deliveryMode === 'ONLINE'
                    ? 'videocam-outline'
                    : 'location-outline'
                }
                size={16}
                color={Colors.primary}
              />
              <AppText variant="bodySm" color={Colors.textSecondary}>
                {session.deliveryMode === 'ONLINE'
                  ? 'Daring (Online)'
                  : session.room}
              </AppText>
            </View>

            <View style={styles.metaItem}>
              <Icon name="time-outline" size={16} color={Colors.primary} />
              <AppText variant="bodySm" color={Colors.textSecondary}>
                {session.timeSlot}
              </AppText>
            </View>
          </View>
        </Card>

        {/* Validasi Lokasi (SRS-S3-02) */}
        <View style={styles.bannerSection}>
          <AppText variant="caption" color={Colors.textMuted} weight="bold">
            VALIDASI LOKASI FISIK (GEOFENCING • RADIUS {effectiveRadius}M)
          </AppText>
          <LocationStatusBanner
            result={effectiveValidationResult}
            labName={labLocation?.name || session.room}
            loading={checkingLocation}
            onRefresh={handleCheckLocation}
          />
        </View>

        {alreadyAttended && attendedRecord ? (
          <AttendanceSuccessCard record={attendedRecord} session={session} />
        ) : (
          /* Formulir & Ripple Check-In Presensi */
          <Card variant="flat" padding="lg" style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIconWrap}>
                <Icon
                  name="clipboard-outline"
                  size={22}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.formTitleWrap}>
                <AppText variant="h2">Data Kehadiran</AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  Identitas Anda diverifikasi secara otomatis dari akun aktif.
                </AppText>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Profil Mahasiswa */}
            <View style={styles.profileBox}>
              <View style={styles.avatarCircle}>
                <Icon name="person" size={20} color={Colors.primary} />
              </View>
              <View style={styles.profileInfo}>
                <AppText variant="body" weight="semibold">
                  {currentUser.name}
                </AppText>
                <AppText variant="caption" color={Colors.textSecondary}>
                  NIM: {currentUser.identifier}
                </AppText>
              </View>
              {alreadyAttended ? (
                <Badge
                  label="Sudah Hadir"
                  variant="attended"
                  size="sm"
                  showDot
                />
              ) : (
                <Badge
                  label={session.status === 'OPEN' ? 'Siap Hadir' : 'Terkunci'}
                  variant={session.status === 'OPEN' ? 'open' : 'closed'}
                  size="sm"
                />
              )}
            </View>

            {/* Input Catatan (Opsional) */}
            <View style={styles.inputGroup}>
              <AppText variant="caption" color={Colors.textMuted} weight="bold">
                CATATAN PRESENSI (OPSIONAL)
              </AppText>
              <TextInput
                style={styles.textInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Tambahkan catatan singkat kehadiran jika diperlukan..."
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={2}
                editable={!alreadyAttended && session.status === 'OPEN'}
              />
            </View>

            {/* Ripple Check-In Visual Control */}
            <View style={styles.rippleSection}>
              <RippleCheckIn
                onPress={handleSubmitAttendance}
                checkedIn={alreadyAttended}
                disabled={!canSubmitAttendance || isSubmitting}
                label={isSubmitting ? 'MEMPROSES' : 'TAP PRESENSI'}
                checkedLabel="TERPRESENSI"
                helperText={
                  canSubmitAttendance
                    ? 'Ketuk lingkaran atau tombol di bawah untuk mencatat kehadiran'
                    : undefined
                }
              />
            </View>

            {/* Tombol Check-In */}
            <View style={styles.submitSection}>
              <CustomButton
                title={getButtonTitle()}
                variant="primary"
                size="lg"
                loading={isSubmitting}
                disabled={!canSubmitAttendance}
                icon={
                  <Icon
                    name={alreadyAttended ? 'checkmark-circle' : 'finger-print'}
                    size={20}
                    color={Colors.textWhite}
                  />
                }
                onPress={handleSubmitAttendance}
              />

              {!canSubmitAttendance && !alreadyAttended && (
                <AppText
                  variant="caption"
                  color={Colors.danger}
                  style={styles.disabledReasonText}
                >
                  {hasApprovedPermit
                    ? 'Anda telah memiliki izin ketidakhadiran yang disetujui pada sesi ini.'
                    : session.status !== 'OPEN'
                    ? 'Presensi dinonaktifkan karena sesi belum dibuka atau sudah ditutup oleh asisten.'
                    : checkingLocation
                    ? 'Menunggu pembacaan sensor GPS perangkat...'
                    : session.deliveryMode !== 'ONLINE' &&
                      !effectiveValidationResult.allowed
                    ? 'Presensi terkunci. Anda harus berada di dalam batas radius laboratorium untuk melakukan check-in.'
                    : ''}
                </AppText>
              )}
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Modal Feedback */}
      <FeedbackModal
        visible={feedbackState.visible}
        type={feedbackState.type}
        title={feedbackState.title}
        message={feedbackState.message}
        primaryLabel={
          feedbackState.type === 'success' ? 'Lihat Bukti Presensi' : 'Tutup'
        }
        onPrimary={handleFeedbackClose}
        onClose={handleFeedbackClose}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
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
  navSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  sessionCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sessionTitleCol: {
    flex: 1,
    gap: 4,
  },
  courseTitle: {
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  bannerSection: {
    gap: Spacing.xs,
  },
  formCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  formIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitleWrap: {
    flex: 1,
    gap: 2,
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  inputGroup: {
    gap: Spacing.xxs,
  },
  textInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  rippleSection: {
    paddingVertical: Spacing.xs,
  },
  submitSection: {
    gap: Spacing.xs,
  },
  disabledReasonText: {
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.xxs,
  },
});
