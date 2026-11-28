import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { FineCard } from '@/features/fines/components/FineCard';
import { PaymentHistoryItem } from '@/features/fines/components/PaymentHistoryItem';
import { getCurrentUser } from '@/services/auth';
import {
  subscribePaymentHistory,
  subscribeStudentFines,
} from '@/services/payments';
import { useCurrentUser } from '@/store/hooks';
import { FineRecord, PaymentTransaction } from '@/types/fine';
import { formatRupiah } from '@/utils/lateness';

type FinesTabMode = 'FINES' | 'HISTORY';

export default function StudentFinesScreen() {
  const { currentUser } = useCurrentUser();
  const authUser = getCurrentUser();
  const activeStudentId = authUser?.uid || currentUser.id;

  const [tabMode, setTabMode] = useState<FinesTabMode>('FINES');
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);

  useEffect(() => {
    if (!activeStudentId) return;

    const unsubFines = subscribeStudentFines(activeStudentId, (list) => {
      setFines(list);
    });
    const unsubPayments = subscribePaymentHistory(activeStudentId, (list) => {
      setPayments(list);
    });

    return () => {
      unsubFines();
      unsubPayments();
    };
  }, [activeStudentId]);

  const summary = useMemo(() => {
    const unpaidFines = fines.filter(
      (f) => f.status === 'UNPAID' || f.status === 'PENDING'
    );
    const totalUnpaidAmount = unpaidFines.reduce(
      (acc, item) => acc + item.amount,
      0
    );
    const paidCount = fines.filter((f) => f.status === 'PAID').length;
    return {
      unpaidCount: unpaidFines.length,
      totalUnpaidAmount,
      paidCount,
    };
  }, [fines]);

  return (
    <Screen withBottomNavPadding>
      <View style={styles.content}>
        {/* Hero Card Ringkasan Denda Praktikan */}
        <Card variant="hero" padding="lg" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTag}>
              <Icon name="card-outline" size={14} color={Colors.textWhite} />
              <AppText variant="caption" weight="bold" color={Colors.textWhite}>
                TAGIHAN & PEMBAYARAN DENDA
              </AppText>
            </View>
            <Badge
              label={
                summary.unpaidCount > 0
                  ? `${summary.unpaidCount} Belum Lunas`
                  : 'Bebas Tagihan'
              }
              variant={summary.unpaidCount > 0 ? 'waiting' : 'open'}
              showDot
            />
          </View>

          <AppText variant="caption" color={Colors.textWhiteMuted}>
            Total Tagihan Aktif
          </AppText>
          <AppText variant="hero" weight="bold" color={Colors.textWhite}>
            {formatRupiah(summary.totalUnpaidAmount)}
          </AppText>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatPill}>
              <AppText variant="title" weight="bold" color={Colors.textWhite}>
                {summary.unpaidCount}
              </AppText>
              <AppText variant="caption" color={Colors.textWhiteMuted}>
                Tagihan Aktif
              </AppText>
            </View>
            <View style={styles.heroStatPill}>
              <AppText variant="title" weight="bold" color={Colors.textWhite}>
                {summary.paidCount}
              </AppText>
              <AppText variant="caption" color={Colors.textWhiteMuted}>
                Sudah Lunas
              </AppText>
            </View>
            <View style={styles.heroStatPill}>
              <AppText variant="title" weight="bold" color={Colors.textWhite}>
                {payments.length}
              </AppText>
              <AppText variant="caption" color={Colors.textWhiteMuted}>
                Transaksi
              </AppText>
            </View>
          </View>
        </Card>

        {/* Segment Switcher: Tagihan Denda vs Riwayat Pembayaran Persisten */}
        <View style={styles.segmentRow}>
          <Pressable
            style={[
              styles.segmentBtn,
              tabMode === 'FINES' && styles.segmentBtnActive,
            ]}
            onPress={() => setTabMode('FINES')}
          >
            <AppText
              variant="caption"
              weight="bold"
              color={
                tabMode === 'FINES' ? Colors.textWhite : Colors.textSecondary
              }
            >
              Daftar Tagihan ({fines.length})
            </AppText>
          </Pressable>

          <Pressable
            style={[
              styles.segmentBtn,
              tabMode === 'HISTORY' && styles.segmentBtnActive,
            ]}
            onPress={() => setTabMode('HISTORY')}
          >
            <AppText
              variant="caption"
              weight="bold"
              color={
                tabMode === 'HISTORY' ? Colors.textWhite : Colors.textSecondary
              }
            >
              Riwayat Pembayaran ({payments.length})
            </AppText>
          </Pressable>
        </View>

        {tabMode === 'FINES' ? (
          fines.length === 0 ? (
            <EmptyState
              title="Tidak Ada Tagihan Denda"
              message="Anda belum memiliki tagihan denda keterlambatan praktikum. Pertahankan kedisiplinan waktu hadir Anda!"
              iconName="checkmark-circle-outline"
            />
          ) : (
            <View style={styles.listGap}>
              {fines.map((fine) => (
                <FineCard
                  key={fine.id}
                  fine={fine}
                  onPressPay={(targetFine) =>
                    router.push(`/student/payment/${targetFine.id}` as any)
                  }
                />
              ))}
            </View>
          )
        ) : payments.length === 0 ? (
          <EmptyState
            title="Belum Ada Riwayat Pembayaran"
            message="Seluruh transaksi pembayaran denda melalui Midtrans Sandbox akan tersimpan permanen dan tampil di sini."
            iconName="receipt-outline"
          />
        ) : (
          <View style={styles.listGap}>
            {payments.map((payment) => (
              <PaymentHistoryItem key={payment.id} payment={payment} />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  heroCard: {
    gap: Spacing.xs,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.glassOverlay,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.glassHighlight,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  heroStatPill: {
    flex: 1,
    backgroundColor: Colors.glassOverlay,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.midnightBorder,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
  },
  listGap: {
    gap: Spacing.sm,
  },
});
