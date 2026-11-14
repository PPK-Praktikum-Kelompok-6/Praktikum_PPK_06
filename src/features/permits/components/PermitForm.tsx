import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { PracticalSession } from '@/types/attendance';

export interface PermitFormProps {
  sessions: PracticalSession[];
  onSubmit: (data: { sessionId: string; courseName: string; reason: string }) => Promise<void>;
  isLoading?: boolean;
}

export function PermitForm({ sessions, onSubmit, isLoading = false }: PermitFormProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions[0]?.id || ''
  );
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!selectedSessionId) {
      setErrorMessage('Silakan pilih sesi praktikum terlebih dahulu.');
      return;
    }

    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setErrorMessage('Alasan izin minimal 10 karakter agar asisten dapat memahami situasi Anda.');
      return;
    }

    try {
      await onSubmit({
        sessionId: selectedSessionId,
        courseName: selectedSession?.courseName || 'Praktikum',
        reason: trimmed,
      });
      setReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim permohonan izin.';
      setErrorMessage(msg);
    }
  };

  return (
    <Card variant="flat" padding="md" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Icon name="document-text-outline" size={20} color={Colors.primary} />
        </View>
        <View style={styles.headerTexts}>
          <AppText variant="title" weight="bold">
            Formulir Izin Praktikum
          </AppText>
          <AppText variant="caption" color={Colors.textSecondary}>
            Sertakan alasan yang jelas untuk dianalisis oleh asisten & AI
          </AppText>
        </View>
      </View>

      {/* Sesi Praktikum Selector */}
      <View style={styles.field}>
        <AppText variant="label" weight="semibold" style={styles.label}>
          Pilih Sesi Praktikum
        </AppText>
        {sessions.length === 0 ? (
          <View style={styles.emptySessionNotice}>
            <AppText variant="caption" color={Colors.textMuted}>
              Tidak ada jadwal praktikum yang tersedia saat ini.
            </AppText>
          </View>
        ) : (
          <View style={styles.sessionChipsWrap}>
            {sessions.map((session) => {
              const isSelected = session.id === selectedSessionId;
              return (
                <CustomButton
                  key={session.id}
                  title={`${session.courseName} (${session.classCode})`}
                  variant={isSelected ? 'primary' : 'outline'}
                  size="sm"
                  fullWidth={false}
                  onPress={() => setSelectedSessionId(session.id)}
                  style={styles.sessionChip}
                />
              );
            })}
          </View>
        )}
      </View>

      {/* Detail singkat sesi yang dipilih */}
      {selectedSession && (
        <View style={styles.sessionInfoBox}>
          <Icon name="time-outline" size={14} color={Colors.primary} />
          <AppText variant="caption" color={Colors.primaryDark} style={styles.sessionInfoText}>
            {selectedSession.date} • {selectedSession.timeSlot} • Ruang {selectedSession.room}
          </AppText>
        </View>
      )}

      {/* Input Alasan */}
      <View style={styles.field}>
        <View style={styles.reasonHeader}>
          <AppText variant="label" weight="semibold" style={styles.label}>
            Alasan Ketidakhadiran
          </AppText>
          <AppText variant="caption" color={reason.trim().length >= 10 ? Colors.success : Colors.textMuted}>
            {reason.trim().length}/10 karakter
          </AppText>
        </View>

        <TextInput
          multiline
          numberOfLines={4}
          value={reason}
          onChangeText={(text) => {
            setReason(text);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="Contoh: Mengalami demam dan disarankan dokter istirahat selama 2 hari (surat dokter terlampir)."
          placeholderTextColor={Colors.textMuted}
          style={styles.textArea}
          textAlignVertical="top"
        />
      </View>

      {/* Error Message Feedback */}
      {errorMessage && (
        <View style={styles.errorBox}>
          <Icon name="alert-circle" size={16} color={Colors.danger} />
          <AppText variant="caption" color={Colors.danger} style={styles.errorText}>
            {errorMessage}
          </AppText>
        </View>
      )}

      <CustomButton
        title={isLoading ? 'Menganalisis & Mengirim...' : 'Kirim Permohonan Izin'}
        variant="primary"
        size="md"
        loading={isLoading}
        disabled={isLoading || sessions.length === 0}
        onPress={handleSubmit}
        icon={<Icon name="paper-plane" size={16} color={Colors.surface} />}
        style={styles.submitBtn}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flex: 1,
  },
  field: {
    marginBottom: Spacing.sm,
  },
  label: {
    marginBottom: Spacing.xs,
    color: Colors.text,
  },
  sessionChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  sessionChip: {
    marginBottom: Spacing.xs,
  },
  emptySessionNotice: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
  },
  sessionInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sessionInfoText: {
    flex: 1,
  },
  reasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textArea: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
    minHeight: 88,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerBg,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  errorText: {
    flex: 1,
  },
  submitBtn: {
    marginTop: Spacing.xs,
  },
});
