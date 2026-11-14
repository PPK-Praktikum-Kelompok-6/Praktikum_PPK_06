import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { PermitForm } from '@/features/permits/components/PermitForm';
import { PermitStatusCard } from '@/features/permits/components/PermitStatusCard';
import {
  getStudentPermitsSync,
  submitPermit,
  subscribePermits,
} from '@/services/permits';
import { useCurrentUser, useSessions } from '@/store/hooks';
import { PermitRequest } from '@/types/permit';

export default function StudentPermitScreen() {
  const { currentUser } = useCurrentUser();
  const { sessions } = useSessions();

  const [permits, setPermits] = useState<PermitRequest[]>(() =>
    getStudentPermitsSync(currentUser.id)
  );
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
    // Sinkronisasi otomatis data permohonan izin
    const unsubscribe = subscribePermits(() => {
      setPermits(getStudentPermitsSync(currentUser.id));
    });
    return unsubscribe;
  }, [currentUser.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPermits(getStudentPermitsSync(currentUser.id));
    setTimeout(() => {
      setRefreshing(false);
    }, 300);
  };

  const handleSubmitPermit = async (data: {
    sessionId: string;
    courseName: string;
    reason: string;
  }) => {
    setLoading(true);
    try {
      const result = await submitPermit({
        sessionId: data.sessionId,
        courseName: data.courseName,
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentNim: currentUser.identifier,
        reason: data.reason,
      });

      if (result.success) {
        setFeedback({
          visible: true,
          type: 'success',
          title: 'Izin Terkirim',
          message:
            'Permohonan izin Anda berhasil dianalisis oleh AI dan terkirim ke asisten untuk ditinjau.',
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
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses izin.',
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
            Ajukan permohonan ketidakhadiran praktikum dan pantau status persetujuannya
          </AppText>
        </View>

        {/* Form Pengajuan Izin */}
        <PermitForm
          sessions={sessions}
          onSubmit={handleSubmitPermit}
          isLoading={loading}
        />

        {/* Riwayat & Status Pengajuan Izin */}
        <View style={styles.historySection}>
          <AppText variant="title" weight="bold" style={styles.sectionTitle}>
            Status Permohonan Saya
          </AppText>

          {permits.length === 0 ? (
            <EmptyState
              title="Belum Ada Permohonan Izin"
              message="Riwayat permohonan izin praktikum Anda akan ditampilkan di sini."
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
