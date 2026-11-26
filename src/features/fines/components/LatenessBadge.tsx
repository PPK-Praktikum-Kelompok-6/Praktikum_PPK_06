import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Badge, BadgeSize, BadgeVariant } from '@/components/ui/Badge';
import { Spacing } from '@/constants/theme';
import { AttendancePunctuality } from '@/types/attendance';
import { FineStatus } from '@/types/fine';
import { formatRupiah } from '@/utils/lateness';

export interface LatenessBadgeProps {
  status?: AttendancePunctuality;
  lateMinutes?: number;
  fineStatus?: FineStatus;
  fineAmount?: number;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
}

function resolvePunctualityBadge(
  status: AttendancePunctuality,
  lateMinutes?: number
): { label: string; variant: BadgeVariant } {
  switch (status) {
    case 'LATE': {
      const mins =
        typeof lateMinutes === 'number' && lateMinutes > 0
          ? ` (+${lateMinutes} mnt)`
          : '';
      return {
        label: `Terlambat${mins}`,
        variant: 'waiting',
      };
    }
    case 'EXCUSED_ABSENCE':
      return {
        label: 'Izin (Bebas Denda)',
        variant: 'attended',
      };
    case 'ON_TIME':
    default:
      return {
        label: 'Tepat Waktu',
        variant: 'open',
      };
  }
}

function resolveFineBadge(
  fineStatus: FineStatus,
  fineAmount?: number
): { label: string; variant: BadgeVariant } {
  const amountSuffix =
    typeof fineAmount === 'number' && fineAmount > 0
      ? ` · ${formatRupiah(fineAmount)}`
      : '';

  switch (fineStatus) {
    case 'PAID':
      return {
        label: 'Denda Lunas',
        variant: 'open',
      };
    case 'PENDING':
      return {
        label: `Bayar Pending${amountSuffix}`,
        variant: 'waiting',
      };
    case 'WAIVED':
      return {
        label: 'Denda Dibebaskan',
        variant: 'closed',
      };
    case 'UNPAID':
    default:
      return {
        label: `Denda Belum Bayar${amountSuffix}`,
        variant: 'danger',
      };
  }
}

/**
 * Menampilkan status ketepatan waktu presensi (Tepat Waktu | Terlambat | Izin Bebas Denda)
 * serta opsional status denda secara terpisah.
 * Sesuai aturan bisnis SRS-S4-04: pembayaran denda (`PAID`) tidak mengubah status kehadiran (`LATE`).
 */
export function LatenessBadge({
  status = 'ON_TIME',
  lateMinutes,
  fineStatus,
  fineAmount,
  size = 'sm',
  style,
}: LatenessBadgeProps) {
  const punctuality = resolvePunctualityBadge(status, lateMinutes);
  const fineBadge = fineStatus
    ? resolveFineBadge(fineStatus, fineAmount)
    : null;

  return (
    <View style={[styles.row, style]}>
      <Badge
        label={punctuality.label}
        variant={punctuality.variant}
        size={size}
        showDot
      />
      {fineBadge ? (
        <Badge
          label={fineBadge.label}
          variant={fineBadge.variant}
          size={size}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
