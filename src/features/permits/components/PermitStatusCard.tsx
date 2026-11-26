import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { BoxIcon, Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AICategory, PermitRequest, PermitStatus } from '@/types/permit';
import { formatDateIndonesian, formatTime } from '@/utils/formatTime';

export interface PermitStatusCardProps {
  permit: PermitRequest;
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

export function PermitStatusCard({ permit }: PermitStatusCardProps) {
  const statusInfo = STATUS_BADGE_MAP[permit.status];
  const aiInfo = permit.aiClassification;
  const categoryConfig = aiInfo
    ? CATEGORY_LABEL_MAP[aiInfo.category]
    : null;

  return (
    <Card variant="default" padding="md">
      {/* Header: Judul Mata Kuliah & Status Badge */}
      <View style={styles.header}>
        <View style={styles.courseWrap}>
          <AppText variant="title" weight="bold" numberOfLines={2}>
            {permit.courseName}
            {permit.classCode ? ` (${permit.classCode})` : ''}
          </AppText>
          <AppText variant="caption" color={Colors.textSecondary}>
            Diajukan: {formatDateIndonesian(permit.submittedAt)} •{' '}
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
      <View style={styles.reasonContainer}>
        <AppText variant="label" weight="semibold" color={Colors.textSecondary}>
          Alasan Izin:
        </AppText>
        <AppText variant="bodySm" color={Colors.text} style={styles.reasonText}>
          &ldquo;{permit.reason}&rdquo;
        </AppText>
      </View>

      {/* Lampiran Bukti */}
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
              {(permit.attachment.size / 1024).toFixed(1)} KB • Bukti Lampiran
            </AppText>
          </View>
        </View>
      )}

      {/* Ringkasan AI Singkat */}
      <View style={styles.aiBox}>
        <View style={styles.aiBoxHeader}>
          <View style={styles.aiTag}>
            <Icon name="sparkles" size={13} color={Colors.primary} />
            <AppText variant="caption" weight="bold" color={Colors.primary}>
              Ringkasan AI
            </AppText>
          </View>
          {aiInfo ? (
            <View style={styles.categoryChip}>
              <AppText variant="caption" weight="semibold" color={Colors.primaryDark}>
                {categoryConfig?.label || aiInfo.category}
              </AppText>
            </View>
          ) : null}
        </View>

        {aiInfo ? (
          <View style={styles.aiSummaryRow}>
            <BoxIcon name="light-bulb" size={14} color={Colors.warning} style={styles.aiSummaryIcon} />
            <AppText variant="caption" color={Colors.textSecondary} style={styles.aiSummary}>
              {aiInfo.summary}
            </AppText>
          </View>
        ) : (
          <AppText variant="caption" color={Colors.textMuted} style={styles.aiSummary}>
            Ringkasan AI sedang diproses.
          </AppText>
        )}
      </View>

      {/* Catatan Keputusan Asisten (Jika ada) */}
      {permit.decisionNote && (
        <View style={styles.decisionNoteBox}>
          <Icon name="chatbubble-ellipses-outline" size={14} color={Colors.primaryDark} />
          <View style={styles.decisionNoteContent}>
            <AppText variant="caption" weight="semibold" color={Colors.text}>
              Catatan Asisten ({permit.reviewedBy || 'Asisten'}):
            </AppText>
            <AppText variant="caption" color={Colors.textSecondary}>
              {permit.decisionNote}
            </AppText>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  courseWrap: {
    flex: 1,
    gap: Spacing.xxs,
  },
  reasonContainer: {
    marginVertical: Spacing.xs,
  },
  reasonText: {
    marginTop: Spacing.xxs,
    fontStyle: 'italic',
  },
  aiBox: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  aiBoxHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  categoryChip: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.sm,
  },
  aiSummaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  aiSummaryIcon: {
    marginTop: Spacing.xxs,
  },
  aiSummary: {
    flex: 1,
  },
  decisionNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primaryGhost,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  decisionNoteContent: {
    flex: 1,
    gap: Spacing.xxs,
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
    marginVertical: Spacing.xs,
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
