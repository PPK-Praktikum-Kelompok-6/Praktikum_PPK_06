import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AICategory, PermitRequest, PermitStatus } from '@/types/permit';
import { formatTime } from '@/utils/formatTime';

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
    <Card variant="default" padding="md" style={styles.card}>
      {/* Header: Judul Mata Kuliah & Status Badge */}
      <View style={styles.header}>
        <View style={styles.courseWrap}>
          <AppText variant="title" weight="bold" numberOfLines={1}>
            {permit.courseName}
          </AppText>
          <AppText variant="caption" color={Colors.textSecondary}>
            Diajukan: {formatTime(permit.submittedAt)}
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

      {/* Widget Analisis AI (SRS-AI-01: Informasi Pendukung) */}
      <View style={styles.aiBox}>
        <View style={styles.aiBoxHeader}>
          <View style={styles.aiTag}>
            <Icon name="sparkles" size={13} color={Colors.primary} />
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
          <View style={styles.aiContent}>
            <View style={styles.aiMetaRow}>
              <View style={styles.categoryChip}>
                <AppText variant="caption" weight="semibold" color={Colors.primaryDark}>
                  Kategori: {categoryConfig?.label || aiInfo.category}
                </AppText>
              </View>
              <View
                style={[
                  styles.urgencyChip,
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
            <AppText variant="caption" color={Colors.textSecondary} style={styles.aiSummary}>
              💡 Ringkasan: {aiInfo.summary}
            </AppText>
          </View>
        ) : (
          <AppText variant="caption" color={Colors.textMuted} style={styles.aiSummary}>
            Analisis AI sedang diproses atau layanan AI sedang sibuk.
          </AppText>
        )}
      </View>

      {/* Catatan Keputusan Asisten (Jika ada) */}
      {permit.decisionNote && (
        <View style={styles.decisionNoteBox}>
          <Icon name="chatbubble-ellipses-outline" size={14} color={Colors.textSecondary} />
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
  courseWrap: {
    flex: 1,
  },
  reasonContainer: {
    marginVertical: Spacing.xs,
  },
  reasonText: {
    marginTop: 2,
    fontStyle: 'italic',
  },
  aiBox: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
  },
  aiBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiContent: {
    gap: 4,
  },
  aiMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  categoryChip: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  urgencyChip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
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
  aiSummary: {
    marginTop: 2,
  },
  decisionNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.xs,
    borderRadius: Radius.xs,
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  decisionNoteContent: {
    flex: 1,
  },
});
