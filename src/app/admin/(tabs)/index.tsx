import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { BoxIcon } from '@/components/ui/Icon';
import { LiveClock } from '@/components/ui/LiveClock';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
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
    <Screen scroll withBottomNavPadding>
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

      {/* Live Real-time Clock */}
      <LiveClock variant="light" />

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
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
      </ScrollView>

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
                  label={isDelete ? 'Hapus Sesi' : 'Reschedule'}
                  variant={isDelete ? 'danger' : 'waiting'}
                  size="sm"
                />
                <Badge
                  label={
                    req.status === 'PENDING'
                      ? 'Menunggu'
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
                  {[
                    req.newTimeSlot
                      ? { icon: 'clock' as const, text: `Jam Baru: ${req.newTimeSlot}` }
                      : null,
                    req.newRoom
                      ? { icon: 'location' as const, text: `Ruangan Baru: ${req.newRoom}` }
                      : null,
                    req.newDate
                      ? {
                          icon: 'calendar' as const,
                          text: `Tanggal Baru: ${new Date(req.newDate).toLocaleDateString('id-ID')}`,
                        }
                      : null,
                  ].map((item) =>
                    item ? (
                      <View key={item.icon} style={styles.rescheduleDetailRow}>
                        <BoxIcon name={item.icon} size={14} color={Colors.primaryDark} />
                        <AppText
                          variant="caption"
                          color={Colors.textSecondary}
                          style={styles.rescheduleDetailText}
                        >
                          {item.text}
                        </AppText>
                      </View>
                    ) : null
                  )}
                </View>
              ) : null}

              {isPending ? (
                <View style={styles.actionRow}>
                  <CustomButton
                    title="Tolak"
                    variant="outline"
                    size="sm"
                    fullWidth={false}
                    style={styles.actionButton}
                    onPress={() => handleOpenDecision(req, 'REJECTED')}
                  />
                  <CustomButton
                    title="Setujui"
                    variant="primary"
                    size="sm"
                    fullWidth={false}
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
      <Modal
        visible={Boolean(selectedReq && decisionAction)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReq(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedReq(null)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardAvoid}
          >
            <View style={styles.decisionModalCard}>
              <AppText variant="title" weight="bold">
                {decisionAction === 'APPROVED'
                  ? 'Konfirmasi Persetujuan'
                  : 'Konfirmasi Penolakan'}
              </AppText>
              <AppText variant="bodySm" color={Colors.textSecondary} style={styles.decisionSub}>
                Anda akan {decisionAction === 'APPROVED' ? 'menyetujui' : 'menolak'} permintaan{' '}
                {selectedReq?.type === 'DELETE' ? 'penghapusan' : 'reschedule'} sesi praktikum{' '}
                <AppText variant="bodySm" weight="bold">{selectedReq?.courseName}</AppText>.
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
                  fullWidth={false}
                  style={styles.modalCancelBtn}
                  onPress={() => setSelectedReq(null)}
                />
                <CustomButton
                  title={decisionAction === 'APPROVED' ? 'Ya, Setujui' : 'Ya, Tolak'}
                  variant={decisionAction === 'APPROVED' ? 'primary' : 'danger'}
                  size="md"
                  fullWidth={false}
                  loading={submitting}
                  style={styles.modalConfirmBtn}
                  onPress={handleConfirmDecision}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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
  header: {
    marginBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  title: {
    marginTop: Spacing.xxs,
    marginBottom: Spacing.xs,
  },
  filterScroll: {
    marginBottom: Spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.xs,
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
    gap: Spacing.xxs,
  },
  rescheduleDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  rescheduleDetailText: {
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalKeyboardAvoid: {
    width: '100%',
  },
  decisionModalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.lg,
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
    fontSize: Typography.sm,
    color: Colors.text,
  },
  modalCancelBtn: {
    flex: 1,
  },
  modalConfirmBtn: {
    flex: 1.3,
  },
});
