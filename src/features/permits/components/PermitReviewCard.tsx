import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { BoxIcon, Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { AICategory, PermitRequest, PermitStatus } from '@/types/permit';
import { formatDateIndonesian, formatTime } from '@/utils/formatTime';

export interface PermitReviewCardProps {
  permit: PermitRequest;
  onReview: (
    permitId: string,
    decision: 'APPROVED' | 'REJECTED',
    note?: string
  ) => Promise<void>;
  isLoading?: boolean;
}

const STATUS_BADGE_MAP: Record<
  PermitStatus,
  { label: string; variant: BadgeVariant }
> = {
  PENDING: { label: 'Menunggu Review', variant: 'waiting' },
  APPROVED: { label: 'Disetujui', variant: 'attended' },
  REJECTED: { label: 'Ditolak', variant: 'danger' },
};

const CATEGORY_LABEL_MAP: Record<AICategory, { label: string; icon: string }> = {
  SAKIT: { label: 'Sakit / Kesehatan', icon: 'medkit-outline' },
  KEDUKAAN_URGEN: { label: 'Kedukaan / Darurat', icon: 'alert-circle-outline' },
  TUGAS_AKADEMIK: { label: 'Tugas Akademik', icon: 'school-outline' },
  KEPERLUAN_PRIBADI: { label: 'Keperluan Pribadi', icon: 'person-outline' },
  LAINNYA: { label: 'Lainnya', icon: 'help-circle-outline' },
};

export function PermitReviewCard({
  permit,
  onReview,
  isLoading = false,
}: PermitReviewCardProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [activeAction, setActiveAction] = useState<'APPROVED' | 'REJECTED' | null>(null);

  const statusInfo = STATUS_BADGE_MAP[permit.status];
  const aiInfo = permit.aiClassification;
  const isPending = permit.status === 'PENDING';

  const handleAction = async (decision: 'APPROVED' | 'REJECTED') => {
    setActiveAction(decision);
    try {
      await onReview(permit.id, decision, note);
      setShowNoteInput(false);
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <Card variant="default" padding="md" style={styles.card}>
      {/* Header: Info Praktikan & Status */}
      <View style={styles.header}>
        <View style={styles.studentInfo}>
          <AppText variant="title" weight="bold">
            {permit.studentName}
          </AppText>
          <AppText variant="caption" color={Colors.textSecondary}>
            NIM: {permit.studentNim} • {permit.courseName}
            {permit.classCode ? ` (Kelas ${permit.classCode})` : ''}
          </AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            Waktu Pengajuan: {formatDateIndonesian(permit.submittedAt)} •{' '}
            {formatTime(permit.submittedAt)}
          </AppText>
        </View>
        <Badge
          label={statusInfo.label}
          variant={statusInfo.variant}
          size="sm"
          showDot
        />
      </View>

      {/* Alasan Praktikan */}
      <View style={styles.reasonBox}>
        <AppText variant="label" weight="semibold" color={Colors.textSecondary}>
          Alasan Ketidakhadiran:
        </AppText>
        <AppText variant="bodySm" color={Colors.text} style={styles.reasonText}>
          &ldquo;{permit.reason}&rdquo;
        </AppText>
      </View>

      {/* Lampiran Bukti dari Praktikan */}
      {permit.attachment && (
        <View style={styles.attachmentBox}>
          <View style={styles.attachmentIconCircle}>
            <Icon
              name={permit.attachment.mimeType.includes('pdf') ? 'document-text' : 'image'}
              size={18}
              color={Colors.primary}
            />
          </View>
          <View style={styles.attachmentTexts}>
            <AppText variant="caption" weight="bold" color={Colors.text} numberOfLines={1}>
              {permit.attachment.name}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {(permit.attachment.size / 1024).toFixed(1)} KB • Berkas Bukti Mahasiswa
            </AppText>
          </View>
        </View>
      )}

      {/* Panel Analisis AI (SRS-AI-01: Bahan Pertimbangan Asisten) */}
      <View style={styles.aiPanel}>
        <View style={styles.aiPanelHeader}>
          <View style={styles.aiTitleWrap}>
            <Icon name="sparkles" size={14} color={Colors.primary} />
            <AppText variant="caption" weight="bold" color={Colors.primary}>
              Analisis Model AI
            </AppText>
          </View>
          {aiInfo && (
            <Badge
              label={`${Math.round(aiInfo.confidence * 100)}% Confidence`}
              variant="primary"
              size="sm"
            />
          )}
        </View>

        {aiInfo ? (
          <View style={styles.aiDetails}>
            <View style={styles.metaRow}>
              <View style={styles.categoryBadge}>
                <AppText variant="caption" weight="semibold" color={Colors.primaryDark}>
                  Kategori: {CATEGORY_LABEL_MAP[aiInfo.category]?.label || aiInfo.category}
                </AppText>
              </View>

              <View
                style={[
                  styles.urgencyBadge,
                  aiInfo.urgencyLevel === 'TINGGI'
                    ? styles.urgencyHigh
                    : aiInfo.urgencyLevel === 'SEDANG'
                    ? styles.urgencyMedium
                    : styles.urgencyLow,
                ]}
              >
                <AppText
                  variant="caption"
                  weight="semibold"
                  color={
                    aiInfo.urgencyLevel === 'TINGGI'
                      ? Colors.danger
                      : aiInfo.urgencyLevel === 'SEDANG'
                      ? Colors.warning
                      : Colors.success
                  }
                >
                  Urgensi: {aiInfo.urgencyLevel}
                </AppText>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <BoxIcon name="light-bulb" size={14} color={Colors.warning} style={styles.summaryIcon} />
              <AppText variant="caption" color={Colors.textSecondary} style={styles.summaryText}>
                Ringkasan: {aiInfo.summary}
              </AppText>
            </View>
          </View>
        ) : (
          <AppText variant="caption" color={Colors.textMuted}>
            Analisis AI tidak tersedia (layanan sedang sibuk atau offline).
          </AppText>
        )}
      </View>

      {/* Catatan hasil review jika sudah diputuskan */}
      {!isPending && permit.decisionNote && (
        <View style={styles.reviewedNoteBox}>
          <AppText variant="caption" weight="bold" color={Colors.text}>
            Catatan Keputusan ({permit.reviewedBy || 'Asisten'}):
          </AppText>
          <AppText variant="caption" color={Colors.textSecondary}>
            {permit.decisionNote}
          </AppText>
        </View>
      )}

      {/* Kontrol Aksi Asisten (SRS-IZIN-02: Terima/Tolak Manual) */}
      {isPending && (
        <View style={styles.actionContainer}>
          <CustomButton
            title={showNoteInput ? 'Sembunyikan Catatan' : '+ Tambah Catatan'}
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={() => setShowNoteInput(!showNoteInput)}
            style={styles.noteToggleBtn}
          />

          {showNoteInput && (
            <TextInput
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={note}
              onChangeText={setNote}
              placeholder="Catatan untuk praktikan (opsional)..."
              placeholderTextColor={Colors.textMuted}
              style={styles.noteInput}
            />
          )}

          <View style={styles.actionRow}>
            <CustomButton
              title="Tolak"
              variant="danger"
              size="sm"
              loading={isLoading && activeAction === 'REJECTED'}
              disabled={isLoading}
              fullWidth={false}
              onPress={() => handleAction('REJECTED')}
              icon={<Icon name="close" size={14} color={Colors.surface} />}
              style={styles.decisionBtn}
            />

            <CustomButton
              title="Setujui"
              variant="primary"
              size="sm"
              loading={isLoading && activeAction === 'APPROVED'}
              disabled={isLoading}
              fullWidth={false}
              onPress={() => handleAction('APPROVED')}
              icon={<Icon name="checkmark" size={14} color={Colors.surface} />}
              style={styles.decisionBtn}
            />
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  studentInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  reasonBox: {
    marginVertical: Spacing.xs,
  },
  reasonText: {
    marginTop: Spacing.xxs,
    fontStyle: 'italic',
  },
  aiPanel: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  aiPanelHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  aiTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  aiDetails: {
    gap: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.sm,
  },
  urgencyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.sm,
  },
  urgencyHigh: {
    backgroundColor: Colors.dangerBg,
  },
  urgencyMedium: {
    backgroundColor: Colors.warningBg,
  },
  urgencyLow: {
    backgroundColor: Colors.successBg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  summaryIcon: {
    marginTop: Spacing.xxs,
  },
  summaryText: {
    flex: 1,
  },
  reviewedNoteBox: {
    backgroundColor: Colors.primaryGhost,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
    gap: Spacing.xxs,
  },
  actionContainer: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  noteToggleBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
  },
  noteInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    fontSize: Typography.sm,
    color: Colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  decisionBtn: {
    flex: 1,
  },
  attachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  attachmentIconCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentTexts: {
    flex: 1,
  },
});
