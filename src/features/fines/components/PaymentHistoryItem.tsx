import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { PaymentTransaction } from '@/types/fine';
import { formatDateIndonesian, formatTime } from '@/utils/formatTime';
import { formatRupiah } from '@/utils/lateness';
import { PaymentStatusBadge } from './PaymentStatusBadge';

export interface PaymentHistoryItemProps {
  payment: PaymentTransaction;
}

/**
 * Item riwayat pembayaran persisten praktikan (SRS-S4-06):
 * Menampilkan informasi sesi, tanggal tagihan, nominal, waktu transaksi, dan status pembayaran.
 */
export function PaymentHistoryItem({ payment }: PaymentHistoryItemProps) {
  return (
    <Card variant="default" padding="md" style={styles.card}>
      <View style={styles.topRow}>
        <AppText variant="caption" weight="bold" color={Colors.textMuted}>
          {payment.id}
        </AppText>
        <PaymentStatusBadge status={payment.status} />
      </View>

      <AppText variant="title" weight="bold">
        {payment.sessionName}
      </AppText>

      <View style={styles.detailsGrid}>
        <View style={styles.detailRow}>
          <Icon name="calendar-outline" size={14} color={Colors.textMuted} />
          <AppText variant="caption" color={Colors.textSecondary}>
            Tanggal Tagihan: {formatDateIndonesian(payment.fineDate)}
          </AppText>
        </View>
        <View style={styles.detailRow}>
          <Icon name="time-outline" size={14} color={Colors.textMuted} />
          <AppText variant="caption" color={Colors.textSecondary}>
            Waktu Transaksi: {formatDateIndonesian(payment.updatedAt)} •{' '}
            {formatTime(payment.updatedAt)}
          </AppText>
        </View>
        {payment.paymentType && (
          <View style={styles.detailRow}>
            <Icon name="wallet-outline" size={14} color={Colors.textMuted} />
            <AppText variant="caption" color={Colors.textSecondary}>
              Metode: {payment.paymentType.toUpperCase()}
            </AppText>
          </View>
        )}
      </View>

      <View style={styles.footerRow}>
        <AppText variant="caption" color={Colors.textMuted}>
          Nominal Pembayaran
        </AppText>
        <AppText
          variant="title"
          weight="bold"
          color={
            payment.status === 'success'
              ? Colors.success
              : payment.status === 'failed'
              ? Colors.danger
              : Colors.warning
          }
        >
          {formatRupiah(payment.amount)}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  detailsGrid: {
    gap: 4,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xxs,
  },
});
