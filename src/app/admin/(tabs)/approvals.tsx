import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  approveAssistantAccount,
  rejectAssistantAccount,
  subscribePendingAssistants,
} from '@/services/admin';
import { AuthUser } from '@/services/auth';
import { useCurrentUser } from '@/store/hooks';

export default function AdminApprovalsScreen() {
  const { currentUser } = useCurrentUser();
  const [pendingAssistants, setPendingAssistants] = useState<AuthUser[]>([]);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  useEffect(() => {
    const unsub = subscribePendingAssistants((list) => {
      setPendingAssistants(list);
    });
    return () => unsub();
  }, []);

  const handleApprove = async (user: AuthUser) => {
    setSubmittingId(user.uid);
    try {
      await approveAssistantAccount(user.uid, currentUser.name || 'Admin Lab');
      setFeedback({
        visible: true,
        type: 'success',
        title: 'Akun Asisten Disetujui',
        message: `Akun asisten ${user.name} (${user.identifier}) telah aktif dan sekarang dapat masuk ke sistem.`,
      });
    } catch (err: any) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Gagal Menyetujui',
        message: err?.message || 'Terjadi kesalahan sistem.',
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (user: AuthUser) => {
    setSubmittingId(user.uid);
    try {
      await rejectAssistantAccount(user.uid);
      setFeedback({
        visible: true,
        type: 'info',
        title: 'Akun Asisten Ditolak',
        message: `Permohonan pendaftaran asisten ${user.name} telah ditolak.`,
      });
    } catch (err: any) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Gagal Menolak',
        message: err?.message || 'Terjadi kesalahan sistem.',
      });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <Screen scroll withBottomNavPadding>
      <View style={styles.header}>
        <AppText variant="caption" color={Colors.primary} weight="bold">
          VERIFIKASI & PERIZINAN AKUN
        </AppText>
        <AppText variant="h1" style={styles.title}>
          Persetujuan Akun Asisten
        </AppText>
        <AppText variant="bodySm" color={Colors.textSecondary}>
          Setiap pendaftaran akun asisten baru wajib diverifikasi dan disetujui oleh Administrator sebelum dapat mengakses sistem
        </AppText>
      </View>

      <View style={styles.countRow}>
        <AppText variant="title" style={styles.countTitle}>
          Permohonan Menunggu
        </AppText>
        <Badge
          label={`${pendingAssistants.length} Akun`}
          variant={pendingAssistants.length > 0 ? 'waiting' : 'closed'}
          size="sm"
          showDot={pendingAssistants.length > 0}
        />
      </View>

      {pendingAssistants.length === 0 ? (
        <EmptyState
          title="Tidak Ada Akun Menunggu"
          message="Seluruh pendaftaran akun asisten baru telah diverifikasi atau belum ada pendaftaran baru."
          iconName="checkmark-done-circle-outline"
        />
      ) : (
        pendingAssistants.map((user) => {
          const isLoading = submittingId === user.uid;

          return (
            <Card key={user.uid} variant="default" padding="md" style={styles.userCard}>
              <View style={styles.userCardTop}>
                <View style={styles.avatarBox}>
                  <Icon name="person" size={24} color={Colors.primary} />
                </View>
                <View style={styles.userInfoCol}>
                  <AppText variant="body" weight="bold" numberOfLines={1}>
                    {user.name}
                  </AppText>
                  <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
                    {user.email}
                  </AppText>
                  <View style={styles.codeBadge}>
                    <Icon name="school" size={12} color={Colors.primaryDark} />
                    <AppText
                      variant="caption"
                      weight="semibold"
                      color={Colors.primaryDark}
                      style={styles.codeBadgeText}
                    >
                      Alokasi Kode: {user.identifier}
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={styles.userActionRow}>
                <CustomButton
                  title="Tolak"
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  disabled={isLoading}
                  style={styles.actionBtn}
                  onPress={() => handleReject(user)}
                />
                <CustomButton
                  title="Setujui"
                  variant="primary"
                  size="sm"
                  fullWidth={false}
                  loading={isLoading}
                  style={styles.actionBtn}
                  onPress={() => handleApprove(user)}
                />
              </View>
            </Card>
          );
        })
      )}

      <FeedbackModal
        visible={feedback.visible}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onPrimary={() => setFeedback((prev) => ({ ...prev, visible: false }))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  title: {
    marginTop: Spacing.xxs,
    marginBottom: Spacing.xs,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  countTitle: {
    flexShrink: 1,
  },
  userCard: {
    marginBottom: Spacing.md,
  },
  userCardTop: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  userInfoCol: {
    flex: 1,
    gap: Spacing.xxs,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.xs,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  codeBadgeText: {
    flexShrink: 1,
  },
  userActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
