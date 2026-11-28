import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { PaymentStatusBadge } from '@/features/fines/components/PaymentStatusBadge';
import { getCurrentUser } from '@/services/auth';
import {
  createPaymentTransaction,
  subscribeFineDoc,
  subscribePaymentDoc,
  syncPaymentStatus,
} from '@/services/payments';
import { useCurrentUser } from '@/store/hooks';
import { FineRecord, PaymentTransaction } from '@/types/fine';
import { formatDateIndonesian, formatTime } from '@/utils/formatTime';
import { formatRupiah } from '@/utils/lateness';

/**
 * Halaman Checkout Pembayaran Denda via Midtrans Sandbox (SRS-S4-05).
 * Client hanya meminta Snap URL dari backend (`POST /api/payments/create`) dan
 * mendengarkan hasil verifikasi webhook secara real-time dari Firestore.
 */
export default function StudentPaymentCheckoutScreen() {
  const { fineId } = useLocalSearchParams<{ fineId: string }>();
  const { currentUser } = useCurrentUser();
  const authUser = getCurrentUser();
  const activeStudentId = authUser?.uid || currentUser.id;

  const [fine, setFine] = useState<FineRecord | null>(null);
  const [activePayment, setActivePayment] = useState<PaymentTransaction | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!fineId) return;
    const unsubFine = subscribeFineDoc(fineId, (docData) => {
      setFine(docData);
    });
    return () => unsubFine();
  }, [fineId]);

  const paymentIdToWatch = activePayment?.id || fine?.latestPaymentId || '';

  useEffect(() => {
    if (!paymentIdToWatch) return;
    const unsubPay = subscribePaymentDoc(paymentIdToWatch, (payData) => {
      if (payData) {
        setActivePayment(payData);
      }
    });
    return () => unsubPay();
  }, [paymentIdToWatch]);

  const openSnapCheckout = async (redirectUrl: string) => {
    if (Platform.OS === 'web') {
      await Linking.openURL(redirectUrl);
      return;
    }
    await WebBrowser.openBrowserAsync(redirectUrl);
  };

  const handleStartPayment = async () => {
    if (!fine || !activeStudentId) return;
    setErrorMessage(null);
    setIsCreating(true);

    try {
      const result = await createPaymentTransaction(fine.id, activeStudentId);
      if (!result.success || !result.payment) {
        setErrorMessage(result.message);
        return;
      }

      setActivePayment(result.payment);
      if (result.payment.snapRedirectUrl) {
        await openSnapCheckout(result.payment.snapRedirectUrl);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSyncStatus = async () => {
    if (!activePayment?.id) return;
    setErrorMessage(null);
    setIsSyncing(true);
    try {
      const res = await syncPaymentStatus(activePayment.id);
      if (!res.success) {
        setErrorMessage(res.message);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  if (!fine) {
    return (
      <Screen>
        <View style={styles.topNav}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <Icon name="arrow-back" size={20} color={Colors.text} />
          </Pressable>
        </View>
        <EmptyState
          title="Tagihan Tidak Ditemukan"
          message="Data tagihan denda tidak ditemukan atau sedang dimuat dari Cloud Firestore."
          iconName="alert-circle-outline"
        />
      </Screen>
    );
  }

  const isPaid = fine.status === 'PAID' || activePayment?.status === 'success';
  const isWaived = fine.status === 'WAIVED';

  return (
    <Screen>
      <View style={styles.content}>
        {/* Top Nav */}
        <View style={styles.topNav}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <Icon name="arrow-back" size={20} color={Colors.text} />
          </Pressable>
          <AppText variant="title" weight="bold">
            Pembayaran Denda
          </AppText>
        </View>

        {/* Detail Tagihan */}
        <Card variant="default" padding="lg" style={styles.summaryCard}>
          <View style={styles.rowBetween}>
            <AppText variant="caption" weight="bold" color={Colors.primary}>
              KELAS {fine.classCode}
            </AppText>
            <Badge
              label={
                isPaid
                  ? 'LUNAS'
                  : isWaived
                  ? 'DIBEBASKAN'
                  : fine.status === 'PENDING'
                  ? 'MENUNGGU PEMBAYARAN'
                  : 'BELUM DIBAYAR'
              }
              variant={isPaid || isWaived ? 'open' : 'waiting'}
              showDot
            />
          </View>

          <AppText variant="h2" weight="bold">
            {fine.sessionName}
          </AppText>

          <View style={styles.metaCol}>
            <AppText variant="caption" color={Colors.textSecondary}>
              Keterlambatan: {fine.lateMinutes} menit
            </AppText>
            <AppText variant="caption" color={Colors.textSecondary}>
              Tanggal Tagihan: {formatDateIndonesian(fine.createdAt)} •{' '}
              {formatTime(fine.createdAt)}
            </AppText>
          </View>

          <View style={styles.totalBox}>
            <AppText variant="caption" color={Colors.textMuted}>
              Total Tagihan
            </AppText>
            <AppText
              variant="hero"
              weight="bold"
              color={isPaid || isWaived ? Colors.success : Colors.primary}
            >
              {formatRupiah(fine.amount)}
            </AppText>
          </View>
        </Card>

        {/* Status Transaksi Midtrans Real-Time (Dari Webhook) */}
        {activePayment && (
          <Card variant="default" padding="md" style={styles.txCard}>
            <View style={styles.rowBetween}>
              <AppText variant="caption" weight="bold" color={Colors.textMuted}>
                STATUS TRANSAKSI MIDTRANS
              </AppText>
              <PaymentStatusBadge status={activePayment.status} />
            </View>
            <AppText variant="caption" color={Colors.textSecondary}>
              Order ID: {activePayment.id}
            </AppText>
            {activePayment.status === 'pending' && (
              <AppText variant="caption" color={Colors.warning}>
                Menunggu konfirmasi pembayaran dari webhook Midtrans Sandbox. Setelah Anda menyelesaikan simulasi pembayaran, status akan otomatis berubah.
              </AppText>
            )}
            {activePayment.status === 'success' && (
              <AppText variant="caption" color={Colors.success} weight="semibold">
                Pembayaran telah diverifikasi oleh server! Tagihan denda Anda berstatus LUNAS.
              </AppText>
            )}
            {activePayment.status === 'failed' && (
              <AppText variant="caption" color={Colors.danger}>
                Pembayaran sebelumnya gagal atau kedaluwarsa. Anda dapat mencoba membuat transaksi baru.
              </AppText>
            )}
          </Card>
        )}

        {errorMessage && (
          <Card variant="flat" padding="md" style={styles.errorCard}>
            <Icon name="alert-circle" size={18} color={Colors.danger} />
            <AppText variant="caption" color={Colors.danger} style={styles.flexText}>
              {errorMessage}
            </AppText>
          </Card>
        )}

        {/* Tombol Aksi */}
        {!isPaid && !isWaived ? (
          <View style={styles.actionGroup}>
            <CustomButton
              title={
                activePayment?.status === 'pending' &&
                activePayment.snapRedirectUrl
                  ? 'Buat Transaksi Baru / Bayar Ulang'
                  : 'Bayar via Midtrans Sandbox'
              }
              variant="primary"
              size="lg"
              loading={isCreating}
              onPress={handleStartPayment}
              icon={
                <Icon name="card-outline" size={18} color={Colors.textWhite} />
              }
            />

            {activePayment?.status === 'pending' &&
              activePayment.snapRedirectUrl && (
                <>
                  <CustomButton
                    title="Periksa Status Pembayaran"
                    variant="secondary"
                    size="md"
                    loading={isSyncing}
                    onPress={handleSyncStatus}
                    icon={
                      <Icon
                        name="refresh-outline"
                        size={16}
                        color={Colors.primary}
                      />
                    }
                  />
                  <CustomButton
                    title="Buka Ulang Halaman Snap Sebelumnya"
                    variant="outline"
                    size="md"
                    onPress={() =>
                      openSnapCheckout(activePayment.snapRedirectUrl!)
                    }
                  />
                </>
              )}
          </View>
        ) : (
          <CustomButton
            title="Kembali ke Daftar Denda"
            variant="secondary"
            size="md"
            onPress={() => router.replace('/student/fines' as any)}
          />
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
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  metaCol: {
    gap: 2,
  },
  totalBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
    marginTop: Spacing.xs,
  },
  txCard: {
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.dangerBg,
    borderColor: Colors.dangerBorder,
    borderWidth: 1,
  },
  flexText: {
    flex: 1,
  },
  actionGroup: {
    gap: Spacing.sm,
  },
});
