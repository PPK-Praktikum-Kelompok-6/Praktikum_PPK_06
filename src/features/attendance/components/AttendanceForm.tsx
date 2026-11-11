import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { PracticalSession, UserProfile } from '@/types/attendance';

export interface AttendanceFormProps {
  session: PracticalSession;
  currentUser: UserProfile;
  isAttended: boolean;
  canSubmit: boolean;
  disabledReason?: string;
  loading?: boolean;
  onSubmit: (notes: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function AttendanceForm({
  session,
  currentUser,
  isAttended,
  canSubmit,
  disabledReason,
  loading = false,
  onSubmit,
  style,
}: AttendanceFormProps) {
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!canSubmit || loading || isAttended) return;
    onSubmit(notes.trim());
  };

  const getButtonTitle = (): string => {
    if (loading) return 'Mengirim Presensi...';
    if (isAttended) return 'Sudah Hadir';
    if (session.status === 'NOT_STARTED') return 'Sesi Belum Dibuka';
    if (session.status === 'CLOSED') return 'Sesi Sudah Ditutup';
    return 'Kirim Presensi';
  };

  return (
    <Card variant="flat" padding="lg" style={[styles.card, style]}>
      {/* Header Form */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Icon name="clipboard-outline" size={22} color={Colors.primary} />
          <AppText variant="h2" style={styles.headerTitle}>
            Formulir Presensi
          </AppText>
        </View>
        <AppText variant="caption" color={Colors.textMuted}>
          Pastikan data identitas Anda sudah sesuai sebelum mengirim kehadiran.
        </AppText>
      </View>

      <View style={styles.divider} />

      {/* Identitas Praktikan */}
      <View style={styles.identitySection}>
        <AppText variant="caption" color={Colors.textMuted}>
          IDENTITAS PRAKTIKAN
        </AppText>
        <View style={styles.identityCard}>
          <View style={styles.avatarCircle}>
            <Icon name="person" size={20} color={Colors.primary} />
          </View>
          <View style={styles.identityInfo}>
            <AppText variant="body" weight="semibold">
              {currentUser.name}
            </AppText>
            <AppText variant="caption" color={Colors.textSecondary}>
              NIM: {currentUser.identifier}
            </AppText>
          </View>
          {isAttended ? (
            <Badge label="Sudah Hadir" variant="attended" size="sm" showDot />
          ) : (
            <Badge
              label={session.status === 'OPEN' ? 'Siap Hadir' : 'Terkunci'}
              variant={session.status === 'OPEN' ? 'open' : 'closed'}
              size="sm"
            />
          )}
        </View>
      </View>

      {/* Input Catatan (Opsional) */}
      <View style={styles.fieldSection}>
        <AppText variant="caption" color={Colors.textMuted}>
          CATATAN KEHADIRAN (OPSIONAL)
        </AppText>
        <TextInput
          style={[
            styles.textInput,
            (!canSubmit || isAttended) && styles.textInputDisabled,
          ]}
          placeholder="Tuliskan catatan kehadiran (misal: hadir tepat waktu di lab)..."
          placeholderTextColor={Colors.textLight}
          value={notes}
          onChangeText={setNotes}
          editable={canSubmit && !isAttended && !loading}
          multiline
          numberOfLines={3}
          maxLength={200}
        />
      </View>

      {/* Status Warning / Info Alert */}
      {disabledReason && !isAttended ? (
        <View style={styles.alertBox}>
          <Icon name="alert-circle-outline" size={18} color={Colors.warning} />
          <AppText variant="caption" color={Colors.warning} style={styles.alertText}>
            {disabledReason}
          </AppText>
        </View>
      ) : null}

      {isAttended ? (
        <View style={styles.attendedAlertBox}>
          <Icon name="checkmark-circle-outline" size={18} color={Colors.info} />
          <AppText variant="caption" color={Colors.info} style={styles.alertText}>
            Presensi Anda pada sesi praktikum ini telah tercatat sebelumnya.
          </AppText>
        </View>
      ) : null}

      {/* Tombol Submit */}
      <View style={styles.actionContainer}>
        <CustomButton
          title={getButtonTitle()}
          onPress={handleSubmit}
          variant="primary"
          size="lg"
          disabled={!canSubmit || isAttended}
          loading={loading}
          icon={
            !isAttended && canSubmit ? (
              <Icon name="paper-plane-outline" size={18} color={Colors.textWhite} />
            ) : undefined
          }
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
  },
  header: {
    gap: Spacing.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.xl,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  identitySection: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  identityCard: {
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
  identityInfo: {
    flex: 1,
  },
  fieldSection: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  textInput: {
    minHeight: 76,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    color: Colors.text,
    fontSize: Typography.sm,
    textAlignVertical: 'top',
  },
  textInputDisabled: {
    backgroundColor: Colors.surfaceMuted,
    color: Colors.textMuted,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warningBorder,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  attendedAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.infoBg,
    borderColor: Colors.infoBorder,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  alertText: {
    flex: 1,
  },
  actionContainer: {
    marginTop: Spacing.xs,
  },
});

