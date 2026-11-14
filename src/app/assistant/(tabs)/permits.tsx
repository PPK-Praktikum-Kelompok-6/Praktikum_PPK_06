import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing } from '@/constants/theme';
import { PermitReviewCard } from '@/features/permits/components/PermitReviewCard';
import {
  getIncomingPermitsSync,
  reviewPermit,
  subscribePermits,
} from '@/services/permits';
import { useCurrentUser } from '@/store/hooks';
import { PermitRequest } from '@/types/permit';

export default function AssistantPermitsScreen() {
  const { currentUser } = useCurrentUser();
  const [permits, setPermits] = useState<PermitRequest[]>(() =>
    getIncomingPermitsSync()
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Feedback Modal
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
    // Sinkronisasi otomatis saat ada izin baru atau perubahan status
    const unsubscribe = subscribePermits(() => {
      setPermits(getIncomingPermitsSync());
    });
    return unsubscribe;
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPermits(getIncomingPermitsSync());
    setTimeout(() => {
      setRefreshing(false);
    }, 300);
  };

  const handleReview = async (
    permitId: string,
    decision: 'APPROVED' | 'REJECTED',
    note?: string
  ) => {
    setLoadingId(permitId);
    try {
      const result = await reviewPermit(
        permitId,
        decision,
        currentUser.name || 'Asisten Praktikum',
        note
      );

      if (result.success) {
        setFeedback({
          visible: true,
          type: decision === 'APPROVED' ? 'success' : 'info',
          title: decision === 'APPROVED' ? 'Izin Disetujui' : 'Izin Ditolak',
          message: result.message,
        });
        setPermits(getIncomingPermitsSync());
      } else {
        setFeedback({
          visible: true,
          type: 'warning',
          title: 'Gagal Meninjau Izin',
          message: result.message,
        });
      }
    } catch (err: unknown) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Kesalahan Sistem',
        message: err instanceof Error ? err.message : 'Terjadi kegagalan saat memperbarui izin.',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const pendingCount = permits.filter((p) => p.status === 'PENDING').length;

  return (
    <Screen
      scroll
      withBottomNavPadding
      refreshing={refreshing}
      onRefresh={handleRefresh}
      style={styles.screen}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="h2" weight="bold">
            Verifikasi Izin Praktikan
          </AppText>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Tinjau alasan ketidakhadiran praktikan dengan bantuan analisis klasifikasi AI
          </AppText>

          {/* Quick Counter */}
          <View style={styles.counterRow}>
            <View style={styles.counterBox}>
              <AppText variant="caption" color={Colors.textSecondary}>
                Menunggu Review:
              </AppText>
              <AppText
                variant="title"
                weight="bold"
                color={pendingCount > 0 ? Colors.warning : Colors.text}
              >
                {pendingCount}
              </AppText>
            </View>
            <View style={styles.counterBox}>
              <AppText variant="caption" color={Colors.textSecondary}>
                Total Izin Masuk:
              </AppText>
              <AppText variant="title" weight="bold">
                {permits.length}
              </AppText>
            </View>
          </View>
        </View>

        {/* Daftar Kartu Izin */}
        <View style={styles.listSection}>
          {permits.length === 0 ? (
            <EmptyState
              title="Tidak Ada Izin Masuk"
              message="Belum ada praktikan yang mengajukan permohonan izin praktikum."
              iconName="file-tray-outline"
            />
          ) : (
            permits.map((item) => (
              <PermitReviewCard
                key={item.id}
                permit={item}
                onReview={handleReview}
                isLoading={loadingId === item.id}
              />
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
  counterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  counterBox: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: 8,
  },
  listSection: {
    marginTop: Spacing.xs,
  },
});
