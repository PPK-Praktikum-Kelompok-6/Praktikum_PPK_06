import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { LocationValidationResult } from '@/types/lab';

export interface LocationStatusBannerProps {
  result: LocationValidationResult;
  labName?: string;
  onRefresh?: () => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function LocationStatusBanner({
  result,
  labName,
  onRefresh,
  loading = false,
  style,
}: LocationStatusBannerProps) {
  const { status, distanceMeters, maxRadiusMeters, message } = result;

  const isInside = status === 'INSIDE_RADIUS';
  const isOutside = status === 'OUTSIDE_RADIUS';
  const isChecking = status === 'CHECKING' || loading;

  const getContainerStyle = () => {
    if (isChecking) {
      return {
        backgroundColor: Colors.primaryBg,
        borderColor: Colors.primaryBorder,
      };
    }
    if (isInside) {
      return {
        backgroundColor: Colors.successBg,
        borderColor: Colors.successBorder,
      };
    }
    if (isOutside) {
      return {
        backgroundColor: Colors.dangerBg,
        borderColor: Colors.dangerBorder,
      };
    }
    return {
      backgroundColor: Colors.warningBg,
      borderColor: Colors.warningBorder,
    };
  };

  const getIcon = () => {
    if (isChecking) {
      return <ActivityIndicator size="small" color={Colors.primary} />;
    }
    if (isInside) {
      return <Icon name="checkmark-circle" size={24} color={Colors.success} />;
    }
    if (isOutside) {
      return <Icon name="close-circle" size={24} color={Colors.danger} />;
    }
    return <Icon name="alert-circle" size={24} color={Colors.warning} />;
  };

  const getBadge = () => {
    if (isChecking) {
      return <Badge label="Memeriksa Lokasi..." variant="primary" size="sm" showDot />;
    }
    if (isInside) {
      return <Badge label="Di Dalam Radius" variant="open" size="sm" showDot />;
    }
    if (isOutside) {
      return <Badge label="Di Luar Radius" variant="danger" size="sm" showDot />;
    }
    return <Badge label="GPS Belum Siap" variant="waiting" size="sm" />;
  };

  return (
    <View style={[styles.container, getContainerStyle(), style]}>
      <View style={styles.topRow}>
        <View style={styles.iconAndBadge}>
          {getIcon()}
          {getBadge()}
        </View>

        {onRefresh && (
          <Pressable
            hitSlop={8}
            onPress={onRefresh}
            disabled={isChecking}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.refreshButtonPressed,
              isChecking && styles.refreshButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Periksa Ulang Lokasi"
          >
            <Icon
              name="refresh-outline"
              size={16}
              color={isChecking ? Colors.textMuted : Colors.primaryDark}
            />
            <AppText
              variant="caption"
              weight="semibold"
              color={isChecking ? Colors.textMuted : Colors.primaryDark}
            >
              Periksa Ulang
            </AppText>
          </Pressable>
        )}
      </View>

      <View style={styles.contentCol}>
        {distanceMeters !== null &&
        distanceMeters !== undefined &&
        maxRadiusMeters > 0 ? (
          <View style={styles.distanceRow}>
            <Icon
              name="navigate-outline"
              size={15}
              color={isInside ? Colors.success : Colors.danger}
            />
            <AppText
              variant="bodySm"
              weight="bold"
              color={isInside ? Colors.success : Colors.danger}
              style={styles.distanceText}
            >
              Jarak: {distanceMeters} meter {labName ? `dari ${labName}` : ''}{' '}
              <AppText variant="caption" color={Colors.textMuted}>
                (Maks. {maxRadiusMeters} m)
              </AppText>
            </AppText>
          </View>
        ) : null}

        <AppText
          variant="caption"
          color={isInside ? Colors.textSecondary : isOutside ? Colors.danger : Colors.textSecondary}
          style={styles.messageText}
        >
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  iconAndBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    backgroundColor: Colors.surface,
    minHeight: 36,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refreshButtonPressed: {
    opacity: 0.7,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  contentCol: {
    gap: Spacing.xxs,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  distanceText: {
    flexShrink: 1,
  },
  messageText: {
    lineHeight: 18,
  },
});
