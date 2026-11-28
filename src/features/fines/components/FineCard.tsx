import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { FineRecord } from '@/types/fine';
import { formatDateIndonesian, formatTime } from '@/utils/formatTime';
import { formatRupiah } from '@/utils/lateness';

export interface FineCardProps {
  fine: FineRecord;
  onPressPay: (fine: FineRecord) => void;
}

/**
 * Kartu daftar tagihan & rincian nominal denda praktikan beserta tombol Bayar (SRS-S4-05).
 */
export function FineCard({ fine, onPressPay }: FineCardProps) {
  const isPaid = fine.status === 'PAID';
  const isWaived = fine.status === 'WAIVED';
  const isPending = fine.status === 'PENDING';
  const canPay = fine.status === 'UNPAID' || fine.status === 'PENDING';

  return (
    <Card
      variant="default"
      padding="md"
      style={[
        styles.card,
        isPaid && styles.cardPaid,
        isWaived && styles.cardWaived,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.classPill}>
          <AppText variant="caption" weight="bold" color={Colors.primary}>
            KELAS {fine.classCode}
          </AppText>
        </View>

        {isPaid ? (
          <Badge label="LUNAS" variant="open" showDot />
        ) : isWaived ? (
          <Badge label="DIBEBASKAN (IZIN)" variant="attended" />
        ) : isPending ? (
          <Badge label="MENUNGGU PEMBAYARAN" variant="waiting" showDot />
        ) : (
          <Badge label="BELUM DIBAYAR" variant="closed" showDot />
        )}
      </View>

      <AppText variant="title" weight="bold">
        {fine.sessionName}
      </AppText>

      <View style={styles.metaList}>
        <View style={styles.metaRow}>
          <Icon name="time-outline" size={15} color={Colors.warning} />
          <AppText variant="caption" color={Colors.textSecondary}>
            Terlambat{' '}
            <AppText variant="caption" weight="bold" color={Colors.text}>
              {fine.lateMinutes} menit
            </AppText>
          </AppText>
        </View>
        <View style={styles.metaRow}>
          <Icon name="calendar-outline" size={15} color={Colors.textMuted} />
          <AppText variant="caption" color={Colors.textSecondary}>
            Tanggal Tagihan: {formatDateIndonesian(fine.createdAt)} •{' '}
            {formatTime(fine.createdAt)}
          </AppText>
        </View>
      </View>

      <View style={styles.amountBox}>
        <View>
          <AppText variant="caption" color={Colors.textMuted}>
            Nominal Denda
          </AppText>
          <AppText
            variant="h2"
            weight="bold"
            color={isPaid || isWaived ? Colors.success : Colors.danger}
          >
            {formatRupiah(fine.amount)}
          </AppText>
        </View>

        {canPay && (
          <CustomButton
            title={isPending ? 'Lanjutkan Bayar' : 'Bayar Sekarang'}
            variant="primary"
            size="sm"
            onPress={() => onPressPay(fine)}
            icon={<Icon name="card-outline" size={16} color={Colors.textWhite} />}
          />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardPaid: {
    borderColor: Colors.successBorder,
    backgroundColor: Colors.surface,
  },
  cardWaived: {
    borderColor: Colors.infoBorder,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  classPill: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primaryBorder,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  metaList: {
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xxs,
  },
});
