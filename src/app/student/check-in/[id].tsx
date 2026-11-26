import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { RippleCheckIn } from '@/components/ui/RippleCheckIn';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { AttendanceSuccessCard } from '@/features/attendance/components/AttendanceSuccessCard';
import { LocationStatusBanner } from '@/features/attendance/components/LocationStatusBanner';
import { LatenessBadge } from '@/features/fines/components/LatenessBadge';
import { StatusBadge } from '@/features/sessions/components/StatusBadge';
import { subscribeAllClasses } from '@/services/admin';
import {
  submitAttendanceToFirestore,
  subscribeToSessionAttendance,
} from '@/services/attendance';
import { subscribeStudentFineForSession } from '@/services/fines';
import { getLabByRoomName, subscribeLabs } from '@/services/labs';
import { PermitRequest, subscribeStudentPermits } from '@/services/permits';
import { PracticalClass, subscribeSessionDoc } from '@/services/sessions';
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';
import { AttendanceRecord, PracticalSession } from '@/types/attendance';
import { FineRecord } from '@/types/fine';
import {
  Coordinates,
  LabLocation,
  LocationValidationResult,
} from '@/types/lab';
import { formatTime } from '@/utils/formatTime';
import { isRoomMatchingLab, validateStudentLocation } from '@/utils/geo';
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
  const [myFine, setMyFine] = useState<FineRecord | null>(null);
  const [labLocation, setLabLocation] = useState<LabWithPolicy | null>(null);

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
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
    redirectOnClose?: boolean;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    redirectOnClose: false,
  });

  // 1. Real-time listener sesi
  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeSessionDoc(sessionId, (sess) => {
      setRealtimeSession(sess);
    });
    return () => unsub();
  }, [sessionId]);

  // 2. Real-time listener rekaman presensi + kelas + izin + denda praktikan (SRS-S4-04)
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
    const unsubFine = subscribeStudentFineForSession(
      sessionId,
      currentUser.id,
      (fine) => {
        setMyFine(fine);
      }
    );
    return () => {
      unsubAtt();
      unsubClasses();
      unsubPermits();
      unsubFine();
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
  const effectiveGracePeriod =
    session?.gracePeriodMinutes ??
    labLocation?.gracePeriodMinutes ??
    DEFAULT_GRACE_PERIOD_MINUTES;
  const effectiveFineAmount =
    session?.fineAmount ?? labLocation?.fineAmount ?? DEFAULT_FINE_AMOUNT;

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

  // Cek apakah praktikan sudah presensi hadir (ON_TIME / LATE) atau izin disetujui (EXCUSED_ABSENCE)
  const realtimeAttendedRecord = realtimeRecords.find(
    (r) => r.studentId === currentUser.id
  );
  const isExcusedRecord =
    realtimeAttendedRecord?.attendanceStatus === 'EXCUSED_ABSENCE';
  const localAttended = session
    ? isAlreadyAttended(session.id, currentUser.id)
    : false;
  const alreadyAttended = Boolean(
    (realtimeAttendedRecord && isPresentAttendanceRecord(realtimeAttendedRecord)) ||
      (!isExcusedRecord && localAttended)
  );

  const attendedRecord =
    (realtimeAttendedRecord && isPresentAttendanceRecord(realtimeAttendedRecord)
      ? realtimeAttendedRecord
      : undefined) ||
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
        const timeStr = formatTime(
          res.record?.timestamp || new Date().toISOString()
        );
        const isLate = res.record?.attendanceStatus === 'LATE';
        const lateMins = res.record?.lateMinutes || 0;
        const fineNominal = res.fine?.amount ?? effectiveFineAmount;

        if (res.fine) {
          setMyFine(res.fine);
        }

        setFeedbackState({
          visible: true,
          type: isLate ? 'warning' : 'success',
          title: isLate
            ? `Presensi Tercatat (Terlambat +${lateMins} Menit)`
            : 'Presensi Berhasil (Tepat Waktu)!',
          message: isLate
            ? `Kehadiran Anda pada sesi ${session.courseName} (${session.classCode}) dicatat pada pukul ${timeStr} (melewati grace period ${effectiveGracePeriod} menit).\n\nTagihan denda tetap sebesar ${formatRupiah(fineNominal)} telah dibuat otomatis. Catatan: pembayaran denda tidak mengubah status kehadiran Anda (tetap Terlambat).`
            : `Kehadiran Anda pada sesi ${session.courseName} (${session.classCode}) telah tercatat tepat waktu pada pukul ${timeStr} tanpa denda.`,
          redirectOnClose: true,
        });
      } else {
        setFeedbackState({
          visible: true,
          type: 'error',
          title: 'Presensi Gagal',
          message: res.message,
          redirectOnClose: false,
        });
      }
    } catch (err: any) {
      setFeedbackState({
        visible: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: err?.message || 'Terjadi kesalahan saat memproses presensi.',
        redirectOnClose: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackClose = () => {
    const shouldRedirect = Boolean(feedbackState.redirectOnClose);
    setFeedbackState((prev) => ({ ...prev, visible: false }));
    if (shouldRedirect && session) {
      router.replace({
        pathname: '/student/attendance/[id]',
        params: { id: session.id },
      });
    }
  };

  if (currentUser.role !== 'STUDENT') {
    return (
      <Screen>
        <View style={styles.topNav}>
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
          <AppText variant="title" align="center" numberOfLines={1} style={styles.navTitle}>
            Halaman Presensi
          </AppText>
          <View style={styles.navSpacer} />
        </View>
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
        <View style={styles.topNav}>
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
          <AppText variant="title" align="center" numberOfLines={1} style={styles.navTitle}>
            Halaman Presensi
          </AppText>
          <View style={styles.navSpacer} />
        </View>
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
          <AppText variant="title" align="center" numberOfLines={1} style={styles.navTitle}>
            Halaman Presensi
          </AppText>
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

  const hasApprovedPermit =
    sessionPermit?.status === 'APPROVED' || isExcusedRecord;

  const canSubmitAttendance =
    session.status === 'OPEN' &&
    !alreadyAttended &&
    !hasApprovedPermit &&
    !checkingLocation &&
    (session.deliveryMode === 'ONLINE' || effectiveValidationResult.allowed);

  const rippleHelperText = canSubmitAttendance
    ? 'Ketuk lingkaran di atas untuk mencatat kehadiran'
    : session.status !== 'OPEN'
    ? 'Presensi dibuka setelah sesi dimulai oleh asisten'
    : checkingLocation
    ? 'Mendeteksi posisi GPS perangkat...'
    : session.deliveryMode !== 'ONLINE' && !effectiveValidationResult.allowed
    ? 'Berada di dalam radius lab untuk mengaktifkan tombol check-in'
    : undefined;

  return (
    <Screen scroll={false}>
      {/* Top Header Navigation (Sticky) */}
      <View style={styles.topNav}>
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
        <AppText variant="title" align="center" numberOfLines={1} style={styles.navTitle}>
          Halaman Presensi
        </AppText>
        <View style={styles.navSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexContainer}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Ringkasan Sesi */}
          <Card variant="flat" padding="md" style={styles.sessionCard}>
            <View style={styles.sessionCardHeader}>
              <View style={styles.sessionTitleCol}>
                <Badge
                  label={`Kelas ${session.classCode}`}
                  variant="attended"
                  size="sm"
                />
                <AppText variant="title" weight="bold" numberOfLines={2}>
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
                <AppText
                  variant="bodySm"
                  color={Colors.textSecondary}
                  style={styles.metaItemText}
                >
                  {session.deliveryMode === 'ONLINE'
                    ? 'Daring (Online)'
                    : session.room}
                </AppText>
              </View>

              <View style={styles.metaItem}>
                <Icon name="time-outline" size={16} color={Colors.primary} />
                <AppText
                  variant="bodySm"
                  color={Colors.textSecondary}
                  style={styles.metaItemText}
                >
                  {session.timeSlot}
                </AppText>
              </View>
            </View>

            {/* Informasi Kebijakan Grace Period & Denda Tetap */}
            <View style={styles.policyInfoBox}>
              <Icon name="alert-circle-outline" size={15} color={Colors.warning} />
              <AppText
                variant="caption"
                color={Colors.textSecondary}
                style={styles.policyInfoText}
              >
                Toleransi keterlambatan: {effectiveGracePeriod} menit. Lewat batas dikenakan denda tetap {formatRupiah(effectiveFineAmount)} (izin disetujui bebas denda).
              </AppText>
            </View>
          </Card>

          {/* Validasi Lokasi */}
          <View style={styles.bannerSection}>
            <AppText variant="caption" color={Colors.textMuted} weight="bold">
              VALIDASI LOKASI FISIK
            </AppText>
            <LocationStatusBanner
              result={effectiveValidationResult}
              labName={labLocation?.name || session.room}
              loading={checkingLocation}
              onRefresh={handleCheckLocation}
            />
          </View>

          {hasApprovedPermit ? (
            <Card variant="flat" padding="md" style={styles.excusedCard}>
              <View style={styles.excusedHeaderRow}>
                <Icon name="document-text" size={22} color={Colors.info} />
                <AppText variant="title" weight="bold" style={styles.excusedTitle}>
                  Tidak Hadir dengan Izin (Excused Absence)
                </AppText>
              </View>
              <LatenessBadge
                status="EXCUSED_ABSENCE"
                fineStatus={myFine?.status ?? 'WAIVED'}
                size="md"
              />
              <AppText variant="bodySm" color={Colors.textSecondary}>
                Pengajuan izin Anda telah disetujui Asprak. Anda tercatat izin resmi dan bebas dari denda sesi ini.
              </AppText>
            </Card>
          ) : alreadyAttended && attendedRecord ? (
            <View style={styles.attendedStack}>
              <AttendanceSuccessCard record={attendedRecord} />
              <Card variant="flat" padding="md" style={styles.latenessResultCard}>
                <AppText variant="caption" color={Colors.textMuted} weight="bold">
                  STATUS KETEPATAN WAKTU & DENDA
                </AppText>
                <LatenessBadge
                  status={attendedRecord.attendanceStatus ?? 'ON_TIME'}
                  lateMinutes={attendedRecord.lateMinutes}
                  fineStatus={myFine?.status}
                  fineAmount={myFine?.amount}
                  size="md"
                />
                {attendedRecord.attendanceStatus === 'LATE' ? (
                  <AppText variant="caption" color={Colors.textSecondary}>
                    Anda check-in melewati toleransi {effectiveGracePeriod} menit. Tagihan denda tetap{' '}
                    {formatRupiah(myFine?.amount ?? effectiveFineAmount)} tercatat (status tetap Terlambat setelah pembayaran).
                  </AppText>
                ) : (
                  <AppText variant="caption" color={Colors.textSecondary}>
                    Presensi tercatat tepat waktu di dalam masa toleransi. Tidak ada tagihan denda.
                  </AppText>
                )}
              </Card>
            </View>
          ) : (
            /* Formulir & Ripple Check-In Presensi (Single Primary CTA) */
            <Card variant="flat" padding="md" style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={styles.formIconWrap}>
                  <Icon
                    name="clipboard-outline"
                    size={22}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.formTitleWrap}>
                  <AppText variant="title" weight="bold">
                    Konfirmasi Check-In
                  </AppText>
                  <AppText variant="caption" color={Colors.textMuted}>
                    Identitas terverifikasi dari akun praktikan aktif.
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
                  <AppText variant="body" weight="semibold" numberOfLines={1}>
                    {currentUser.name}
                  </AppText>
                  <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
                    NIM: {currentUser.identifier}
                  </AppText>
                </View>
                <Badge
                  label={session.status === 'OPEN' ? 'Siap Hadir' : 'Terkunci'}
                  variant={session.status === 'OPEN' ? 'open' : 'closed'}
                  size="sm"
                />
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
                  editable={session.status === 'OPEN'}
                />
              </View>

              {/* Single Ripple Check-In CTA */}
              <View style={styles.rippleSection}>
                <RippleCheckIn
                  onPress={handleSubmitAttendance}
                  checkedIn={false}
                  disabled={!canSubmitAttendance || isSubmitting}
                  label={isSubmitting ? 'MEMPROSES' : 'TAP PRESENSI'}
                  checkedLabel="TERPRESENSI"
                  helperText={rippleHelperText}
                />
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Feedback */}
      <FeedbackModal
        visible={feedbackState.visible}
        type={feedbackState.type}
        title={feedbackState.title}
        message={feedbackState.message}
        primaryLabel={
          feedbackState.redirectOnClose ? 'Lihat Bukti Presensi' : 'Tutup'
        }
        onPrimary={handleFeedbackClose}
        onClose={handleFeedbackClose}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
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
  backButtonPressed: {
    opacity: 0.75,
  },
  navTitle: {
    flex: 1,
  },
  navSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
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
    gap: Spacing.xs,
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
    flexShrink: 1,
  },
  metaItemText: {
    flexShrink: 1,
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
    gap: Spacing.xxs,
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
    gap: Spacing.xs,
  },
  textInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: Typography.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  rippleSection: {
    paddingVertical: Spacing.xs,
  },
  policyInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.warningBg,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  policyInfoText: {
    flex: 1,
    lineHeight: 18,
  },
  excusedCard: {
    borderWidth: 1,
    borderColor: Colors.infoBorder,
    backgroundColor: Colors.infoBg,
    gap: Spacing.sm,
  },
  excusedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  excusedTitle: {
    flex: 1,
  },
  attendedStack: {
    gap: Spacing.md,
  },
  latenessResultCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
});
