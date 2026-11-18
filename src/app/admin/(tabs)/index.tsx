import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  reviewSessionRequest,
  subscribeSessionRequests,
} from '@/services/admin';
import { useCurrentUser } from '@/store/hooks';
import { SessionChangeRequest } from '@/types/attendance';

type FilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export default function AdminSessionRequestsScreen() {
  const { currentUser } = useCurrentUser();
  const [requests, setRequests] = useState<SessionChangeRequest[]>([]);
  const [filter, setFilter] = useState<FilterType>('PENDING');
  const [selectedReq, setSelectedReq] = useState<SessionChangeRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    const unsub = subscribeSessionRequests((list) => {
      setRequests(list);
    });
    return () => unsub();
  }, []);

  const filteredRequests = requests.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const handleOpenDecision = (req: SessionChangeRequest, decision: 'APPROVED' | 'REJECTED') => {
    setSelectedReq(req);
    setDecisionAction(decision);
    setAdminNote('');
  };

  const handleConfirmDecision = async () => {
    if (!selectedReq || !decisionAction) return;

    setSubmitting(true);
    try {
      await reviewSessionRequest(
        selectedReq.id,
        decisionAction,
        currentUser.name || 'Admin Lab',
        adminNote
      );

      setFeedback({
        visible: true,
        type: 'success',
        title: decisionAction === 'APPROVED' ? 'Permohonan Disetujui' : 'Permohonan Ditolak',
        message: `Permintaan ${selectedReq.type === 'DELETE' ? 'penghapusan' : 'reschedule'} sesi ${selectedReq.courseName} (${selectedReq.classCode}) telah berhasil diproses.`,
      });
      setSelectedReq(null);
      setDecisionAction(null);
    } catch (err: any) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Gagal Memproses',
        message: err?.message || 'Terjadi kesalahan sistem.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll withBottomNavPadding style={styles.screen}>
      <View style={styles.header}>
        <AppText variant="caption" color={Colors.primary} weight="bold">
          PORTAL ADMINISTRATOR LAB
        </AppText>
        <AppText variant="h1" style={styles.title}>
          Persetujuan Perubahan Sesi
        </AppText>
        <AppText variant="bodySm" color={Colors.textSecondary}>
          Otorisasi penghapusan atau penjadwalan ulang (reschedule) sesi praktikum yang diajukan oleh asisten
        </AppText>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(
          [
            { key: 'PENDING', label: 'Menunggu' },
            { key: 'APPROVED', label: 'Disetujui' },
            { key: 'REJECTED', label: 'Ditolak' },
            { key: 'ALL', label: 'Semua' },
          ] as const
        ).map((item) => {
          const isActive = filter === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setFilter(item.key)}
            >
              <AppText
                variant="caption"
                weight={isActive ? 'semibold' : 'regular'}
                color={isActive ? Colors.textWhite : Colors.textSecondary}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {filteredRequests.length === 0 ? (
        <EmptyState
          title="Tidak Ada Permohonan"
          message={
            filter === 'PENDING'
              ? 'Tidak ada permohonan perubahan sesi yang sedang menunggu persetujuan saat ini.'
              : 'Tidak ada data permohonan untuk filter ini.'
          }
          iconName="document-text-outline"
        />
      ) : (
        filteredRequests.map((req) => {
          const isDelete = req.type === 'DELETE';
          const isPending = req.status === 'PENDING';

          return (
            <Card key={req.id} variant="default" padding="md" style={styles.requestCard}>
              <View style={styles.cardHeader}>
                <Badge
                  label={isDelete ? 'Permintaan Hapus Sesi' : 'Permintaan Reschedule'}
                  variant={isDelete ? 'danger' : 'waiting'}
                  size="sm"
                />
                <Badge
                  label={
                    req.status === 'PENDING'
                      ? 'Menunggu Admin'
                      : req.status === 'APPROVED'
                      ? 'Disetujui'
                      : 'Ditolak'
                  }
                  variant={
                    req.status === 'PENDING'
                      ? 'waiting'
                      : req.status === 'APPROVED'
                      ? 'open'
                      : 'closed'
                  }
                  size="sm"
                  showDot
                />
              </View>

              <AppText variant="title" weight="bold" style={styles.courseTitle}>
                {req.courseName} ({req.classCode})
              </AppText>

              <AppText variant="caption" color={Colors.textMuted} style={styles.metaText}>
                Diajukan oleh: <AppText variant="caption" weight="semibold">{req.requestedByName}</AppText>
              </AppText>

              <View style={styles.reasonBox}>
                <AppText variant="caption" weight="semibold" color={Colors.textSecondary}>
                  Alasan Asisten:
                </AppText>
                <AppText variant="bodySm" color={Colors.text}>
                  {`"${req.reason}"`}
                </AppText>
              </View>

              {!isDelete && (req.newTimeSlot || req.newRoom) ? (
                <View style={styles.rescheduleDetailBox}>
                  <AppText variant="caption" weight="semibold" color={Colors.primaryDark}>
                    Rincian Perubahan yang Diajukan:
                  </AppText>
                  {req.newTimeSlot ? (
                    <AppText variant="caption" color={Colors.textSecondary}>
                      ⏰ Jam Baru: {req.newTimeSlot}
                    </AppText>
                  ) : null}
                  {req.newRoom ? (
                    <AppText variant="caption" color={Colors.textSecondary}>
                      📍 Ruangan Baru: {req.newRoom}
                    </AppText>
                  ) : null}
                  {req.newDate ? (
                    <AppText variant="caption" color={Colors.textSecondary}>
                      📅 Tanggal Baru: {new Date(req.newDate).toLocaleDateString('id-ID')}
                    </AppText>
                  ) : null}
                </View>
              ) : null}

              {isPending ? (
                <View style={styles.actionRow}>
                  <CustomButton
                    title="Tolak"
                    variant="outline"
                    size="sm"
                    style={styles.actionButton}
                    onPress={() => handleOpenDecision(req, 'REJECTED')}
                  />
                  <CustomButton
                    title="Setujui"
                    variant="primary"
                    size="sm"
                    style={styles.actionButton}
                    onPress={() => handleOpenDecision(req, 'APPROVED')}
                  />
                </View>
              ) : (
                <View style={styles.reviewedFooter}>
                  <AppText variant="caption" color={Colors.textMuted}>
                    Ditinjau oleh {req.reviewedBy || 'Admin'} pada{' '}
                    {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString('id-ID') : '-'}
                  </AppText>
                </View>
              )}
            </Card>
          );
        })
      )}

      {/* Decision Modal */}
      {selectedReq && decisionAction ? (
        <Card variant="flat" padding="lg" style={styles.decisionModalCard}>
          <AppText variant="title" weight="bold">
            {decisionAction === 'APPROVED' ? 'Konfirmasi Persetujuan' : 'Konfirmasi Penolakan'}
          </AppText>
          <AppText variant="bodySm" color={Colors.textSecondary} style={styles.decisionSub}>
            Anda akan {decisionAction === 'APPROVED' ? 'menyetujui' : 'menolak'} permintaan{' '}
            {selectedReq.type === 'DELETE' ? 'penghapusan' : 'reschedule'} sesi praktikum{' '}
            <AppText variant="bodySm" weight="bold">{selectedReq.courseName}</AppText>.
          </AppText>

          <View style={styles.inputGroup}>
            <AppText variant="label">Catatan Admin (Opsional):</AppText>
            <TextInput
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="Berikan catatan untuk asisten..."
              placeholderTextColor={Colors.textLight}
              style={styles.noteInput}
            />
          </View>

          <View style={styles.actionRow}>
            <CustomButton
              title="Batal"
              variant="outline"
              size="md"
              style={styles.actionButton}
              onPress={() => setSelectedReq(null)}
            />
            <CustomButton
              title={decisionAction === 'APPROVED' ? 'Ya, Setujui' : 'Ya, Tolak'}
              variant={decisionAction === 'APPROVED' ? 'primary' : 'danger'}
              size="md"
              loading={submitting}
              style={styles.actionButton}
              onPress={handleConfirmDecision}
            />
          </View>
        </Card>
      ) : null}

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
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    marginTop: 2,
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  requestCard: {
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  courseTitle: {
    marginTop: Spacing.xs,
  },
  metaText: {
    marginBottom: Spacing.sm,
  },
  reasonBox: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  rescheduleDetailBox: {
    backgroundColor: Colors.primaryBg,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flex: 1,
  },
  reviewedFooter: {
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: Spacing.xs,
  },
  decisionModalCard: {
    position: 'absolute',
    top: 100,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 9999,
  },
  decisionSub: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  noteInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
    fontSize: 14,
    color: Colors.text,
  },
});
