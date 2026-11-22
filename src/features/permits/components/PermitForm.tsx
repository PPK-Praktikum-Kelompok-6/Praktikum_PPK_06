import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import {
  Pressable,
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
import { PermitAttachment } from '@/types/permit';

export interface PermitFormProps {
  sessions: PracticalSession[];
  onSubmit: (data: {
    sessionId: string;
    classId?: string;
    classCode?: string;
    courseName: string;
    reason: string;
    attachment?: PermitAttachment;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function PermitForm({ sessions, onSubmit, isLoading = false }: PermitFormProps) {
  const [userSelectedSessionId, setUserSelectedSessionId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<PermitAttachment | null>(null);
  const [pickingFile, setPickingFile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSessionId =
    userSelectedSessionId && sessions.some((s) => s.id === userSelectedSessionId)
      ? userSelectedSessionId
      : sessions[0]?.id || '';

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  const handlePickDocument = async () => {
    setErrorMessage(null);
    setPickingFile(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const MAX_SIZE = 3 * 1024 * 1024; // Maksimal 3 MB (3,145,728 bytes)
      const fileSize = asset.size ?? 0;

      if (fileSize > MAX_SIZE) {
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        setErrorMessage(
          `Ukuran file maksimal 3 MB. File "${asset.name}" yang Anda pilih berukuran ${sizeMB} MB.`
        );
        return;
      }

      setAttachment({
        name: asset.name,
        size: fileSize,
        mimeType: asset.mimeType || 'application/octet-stream',
        uri: asset.uri,
      });
    } catch (err: any) {
      setErrorMessage('Gagal memilih file dokumen: ' + (err?.message || 'Error'));
    } finally {
      setPickingFile(false);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
  };

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
        classId: selectedSession?.classId,
        classCode: selectedSession?.classCode,
        courseName: selectedSession?.courseName || 'Praktikum',
        reason: trimmed,
        attachment: attachment ?? undefined,
      });
      setReason('');
      setAttachment(null);
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
            Sertakan alasan yang jelas & bukti lampiran untuk ditinjau asisten
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
                  onPress={() => setUserSelectedSessionId(session.id)}
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
            {selectedSession.date} • {selectedSession.timeSlot} • {selectedSession.deliveryMode === 'ONLINE' ? '🌐 Daring' : '🏢 ' + selectedSession.room}
          </AppText>
        </View>
      )}

      {/* Input Alasan */}
      <View style={styles.field}>
        <View style={styles.reasonHeader}>
          <AppText variant="label" weight="semibold" style={styles.label}>
            Alasan Ketidakhadiran *
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

      {/* Kolom Lampiran Dokumen Bukti (Maks. 3 MB) */}
      <View style={styles.field}>
        <View style={styles.attachmentHeader}>
          <AppText variant="label" weight="semibold" style={styles.label}>
            LAMPIRAN BUKTI (OPSIONAL)
          </AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            PDF, JPG, PNG (Maks. 3 MB)
          </AppText>
        </View>

        {attachment ? (
          <View style={styles.attachedCard}>
            <View style={styles.attachedLeft}>
              <View style={styles.attachedIconWrap}>
                <Icon
                  name={attachment.mimeType.includes('pdf') ? 'document-text' : 'image'}
                  size={20}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.attachedTexts}>
                <AppText variant="bodySm" weight="semibold" numberOfLines={1}>
                  {attachment.name}
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {(attachment.size / 1024).toFixed(1)} KB • Berkas Terlampir
                </AppText>
              </View>
            </View>
            <Pressable
              onPress={handleRemoveAttachment}
              style={styles.removeAttachButton}
              accessibilityRole="button"
              accessibilityLabel="Hapus lampiran"
            >
              <Icon name="trash-outline" size={18} color={Colors.danger} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.pickFileBox}
            onPress={handlePickDocument}
            disabled={pickingFile}
          >
            <View style={styles.pickIconCircle}>
              <Icon name="attach" size={18} color={Colors.primary} />
            </View>
            <View style={styles.pickFileTexts}>
              <AppText variant="bodySm" weight="semibold" color={Colors.primaryDark}>
                {pickingFile ? 'Membuka File Picker...' : 'Unggah Surat Dokter / Bukti Izin'}
              </AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                Format: PDF, JPG, JPEG, PNG (Maks. 3 MB)
              </AppText>
            </View>
          </Pressable>
        )}
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
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  pickFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  pickIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickFileTexts: {
    flex: 1,
  },
  attachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  attachedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.xs,
  },
  attachedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedTexts: {
    flex: 1,
  },
  removeAttachButton: {
    padding: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.dangerBg,
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
