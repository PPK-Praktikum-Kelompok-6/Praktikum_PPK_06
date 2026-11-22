import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { PermitForm } from '@/features/permits/components/PermitForm';
import { PermitStatusCard } from '@/features/permits/components/PermitStatusCard';
import { subscribeAllClasses } from '@/services/admin';
import {
  getStudentPermits,
  getStudentPermitsSync,
  submitPermit,
  subscribeStudentPermits,
} from '@/services/permits';
import { PracticalClass, subscribeStudentSessions } from '@/services/sessions';
import { useCurrentUser, useSessions } from '@/store/hooks';
import { PracticalSession } from '@/types/attendance';
import { PermitAttachment, PermitRequest } from '@/types/permit';

export default function StudentPermitScreen() {
  const { currentUser } = useCurrentUser();
  const { sessions } = useSessions();

  const [permits, setPermits] = useState<PermitRequest[]>(() =>
    getStudentPermitsSync(currentUser.id)
  );
  const [liveSessions, setLiveSessions] = useState<PracticalSession[]>([]);
  const [allClasses, setAllClasses] = useState<PracticalClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Feedback State
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  useEffect(() => {
    if (!currentUser.id) return;

    // 1. Berlangganan daftar kelas di Firestore untuk mengetahui kelas yang diikuti praktikan
    const unsubClasses = subscribeAllClasses((clsList) => {
      setAllClasses(clsList);
    });

    // 2. Sinkronisasi real-time data permohonan izin dari Firestore
    const unsubPermits = subscribeStudentPermits(currentUser.id, (loaded) => {
      setPermits(loaded);
    });

    // 3. Sinkronisasi daftar sesi secara real-time dari Firestore
    const unsubSessions = subscribeStudentSessions(
      currentUser.id,
      currentUser.enrolledClasses || [],
      (sessList) => {
        setLiveSessions(sessList);
      }
    );

    return () => {
      unsubClasses();
      unsubPermits();
      unsubSessions();
    };
  }, [currentUser.id, currentUser.enrolledClasses]);

  // Kelas yang diikuti praktikan (baik via Kode Kelas maupun enrolledClasses)
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

  const rawSessions = liveSessions.length > 0 ? liveSessions : sessions;
  const studentAvailableSessions = rawSessions.filter((s) => {
    if (myJoinedClasses.length === 0 && joinedClassCodes.length === 0) {
      return false;
    }
    if (s.classId && joinedClassIds.includes(s.classId)) {
      return true;
    }
    return joinedClassCodes.includes((s.classCode || '').toUpperCase());
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const latest = await getStudentPermits(currentUser.id);
      setPermits(latest);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmitPermit = async (data: {
    sessionId: string;
    classId?: string;
    classCode?: string;
    courseName: string;
    reason: string;
    attachment?: PermitAttachment;
  }) => {
    setLoading(true);
    try {
      const result = await submitPermit({
        sessionId: data.sessionId,
        classId: data.classId,
        classCode: data.classCode,
        courseName: data.courseName,
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentNim: currentUser.identifier,
        reason: data.reason,
        attachment: data.attachment,
      });

      if (result.success) {
        setFeedback({
          visible: true,
          type: 'success',
          title: 'Izin Tersimpan di Database!',
          message:
            'Permohonan izin Anda berhasil dianalisis oleh AI, tersimpan di Cloud Firestore, dan terkirim ke asisten kelas untuk ditinjau.',
        });
        setPermits(getStudentPermitsSync(currentUser.id));
      } else {
        setFeedback({
          visible: true,
          type: 'warning',
          title: 'Gagal Mengajukan Izin',
          message: result.message,
        });
      }
    } catch (err: unknown) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message:
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan saat memproses izin.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      scroll
      withBottomNavPadding
      refreshing={refreshing}
      onRefresh={handleRefresh}
      style={styles.screen}
    >
      <View style={styles.content}>
        {/* Header Layar */}
        <View style={styles.header}>
          <AppText variant="h2" weight="bold">
            Pengajuan Izin
          </AppText>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Ajukan permohonan ketidakhadiran praktikum dan pantau status persetujuannya secara real-time
          </AppText>
        </View>

        {/* Form Pengajuan Izin */}
        <PermitForm
          sessions={studentAvailableSessions}
          onSubmit={handleSubmitPermit}
          isLoading={loading}
        />

        {/* Riwayat & Status Pengajuan Izin */}
        <View style={styles.historySection}>
          <AppText variant="title" weight="bold" style={styles.sectionTitle}>
            Status Permohonan Saya ({permits.length})
          </AppText>

          {permits.length === 0 ? (
            <EmptyState
              title="Belum Ada Permohonan Izin"
              message="Riwayat permohonan izin praktikum yang Anda ajukan akan langsung tampil dan tersinkronisasi di sini."
              iconName="document-text-outline"
            />
          ) : (
            permits.map((item) => (
              <PermitStatusCard key={item.id} permit={item} />
            ))
          )}
        </View>
      </View>

      {/* Feedback Modal (SRS-UI-01) */}
      <FeedbackModal
        visible={feedback.visible}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onPrimary={() => setFeedback((prev) => ({ ...prev, visible: false }))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
  },
  historySection: {
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
});
