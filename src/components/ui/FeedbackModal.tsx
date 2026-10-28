import { BlurView } from 'expo-blur';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { CustomButton } from './CustomButton';
import { Icon, IconName } from './Icon';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

export interface FeedbackModalProps {
  visible: boolean;
  type?: FeedbackType;
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose?: () => void;
}

export function FeedbackModal({
  visible,
  type = 'info',
  title,
  message,
  primaryLabel = 'Tutup',
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
}: FeedbackModalProps) {
  const config = TYPE_CONFIG[type];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose || onPrimary}
    >
      <View style={styles.backdrop}>
        <BlurView
          intensity={35}
          tint="dark"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose || onPrimary}
        />
        <View style={styles.sheet}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: config.iconBg },
            ]}
          >
            <Icon name={config.iconName} size={32} color={config.iconColor} />
          </View>

          <AppText variant="h2" align="center" style={styles.title}>
            {title}
          </AppText>
          <AppText
            variant="bodySm"
            align="center"
            color={Colors.textSecondary}
            style={styles.message}
          >
            {message}
          </AppText>

          <View style={styles.buttonContainer}>
            <CustomButton
              title={primaryLabel}
              onPress={onPrimary}
              variant={type === 'error' ? 'danger' : 'primary'}
            />
            {secondaryLabel && onSecondary ? (
              <CustomButton
                title={secondaryLabel}
                onPress={onSecondary}
                variant="outline"
                style={styles.secondaryButton}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const TYPE_CONFIG: Record<
  FeedbackType,
  { iconName: IconName; iconColor: string; iconBg: string }
> = {
  success: {
    iconName: 'checkmark-circle',
    iconColor: Colors.success,
    iconBg: Colors.successBg,
  },
  error: {
    iconName: 'alert-circle',
    iconColor: Colors.danger,
    iconBg: Colors.dangerBg,
  },
  warning: {
    iconName: 'warning',
    iconColor: Colors.warning,
    iconBg: Colors.warningBg,
  },
  info: {
    iconName: 'information-circle',
    iconColor: Colors.info,
    iconBg: Colors.infoBg,
  },
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.glassSurfaceStrong,
    borderRadius: Radius.xl,
    borderWidth: 1.2,
    borderColor: Colors.glassBorder,
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
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  buttonContainer: {
    width: '100%',
    gap: Spacing.sm,
  },
  secondaryButton: {
    marginTop: Spacing.xs,
  },
});
