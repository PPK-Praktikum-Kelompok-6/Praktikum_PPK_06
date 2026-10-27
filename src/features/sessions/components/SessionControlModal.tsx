import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export type SessionControlAction = 'OPEN' | 'CLOSE';

export interface SessionControlModalProps {
  visible: boolean;
  action: SessionControlAction;
  courseName: string;
  classCode: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SessionControlModal({
  visible,
  action,
  courseName,
  classCode,
  onConfirm,
  onCancel,
}: SessionControlModalProps) {
  const isOpenAction = action === 'OPEN';

  const title = isOpenAction ? 'Buka Sesi Praktikum?' : 'Tutup Sesi Praktikum?';
  const description = isOpenAction
    ? `Anda akan membuka sesi ${courseName} (${classCode}). Praktikan dapat segera melakukan presensi kehadiran.`
    : `Anda akan menutup sesi ${courseName} (${classCode}). Presensi akan dikunci dan praktikan tidak dapat melakukan presensi lagi.`;

  const iconName = isOpenAction ? 'play-circle' : 'alert-circle';
  const iconColor = isOpenAction ? Colors.success : Colors.danger;
  const iconBg = isOpenAction ? Colors.successBg : Colors.dangerBg;
  const confirmButtonVariant = isOpenAction ? 'primary' : 'danger';
  const confirmButtonTitle = isOpenAction ? 'Ya, Buka Sesi' : 'Ya, Tutup Sesi';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <View style={styles.sheet}>
          <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
            <Icon name={iconName} size={36} color={iconColor} />
          </View>

          <AppText variant="title" align="center" style={styles.title}>
            {title}
          </AppText>

          <AppText
            variant="bodySm"
            align="center"
            color={Colors.textSecondary}
            style={styles.message}
          >
            {description}
          </AppText>

          <View style={styles.buttonGroup}>
            <CustomButton
              title={confirmButtonTitle}
              onPress={onConfirm}
              variant={confirmButtonVariant}
              size="md"
            />
            <CustomButton
              title="Batal"
              onPress={onCancel}
              variant="secondary"
              size="md"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.lg,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  message: {
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  buttonGroup: {
    width: '100%',
    gap: Spacing.sm,
  },
});
