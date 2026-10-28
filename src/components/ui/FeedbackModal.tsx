import { BlurView } from 'expo-blur';
import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {
  Colors,
  GradientMeshes,
  HandGestureName,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { AppText } from './AppText';
import { CustomButton } from './CustomButton';
import { GestureIcon } from './Icon';

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
          <Image
            source={GradientMeshes.pastel}
            pointerEvents="none"
            resizeMode="cover"
            style={styles.sheetMeshGlow}
          />
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: config.iconBg },
            ]}
          >
            <GestureIcon
              name={config.gestureName}
              size={32}
              color={config.iconColor}
            />
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
  { gestureName: HandGestureName; iconColor: string; iconBg: string }
> = {
  success: {
    gestureName: 'thumbsUp',
    iconColor: Colors.success,
    iconBg: Colors.successBg,
  },
  error: {
    gestureName: 'handBlocked',
    iconColor: Colors.danger,
    iconBg: Colors.dangerBg,
  },
  warning: {
    gestureName: 'handTimer',
    iconColor: Colors.warning,
    iconBg: Colors.warningBg,
  },
  info: {
    gestureName: 'raiseHand',
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
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.lg,
  },
  sheetMeshGlow: {
    position: 'absolute',
    top: -70,
    right: -60,
    width: 220,
    height: 220,
    opacity: 0.42,
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
