import { Href, router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { RoleSelectorModal } from '@/features/role/components/RoleSelectorModal';
import { useCurrentUser } from '@/store/hooks';

export default function RoleSelectRoute() {
  const { currentUser } = useCurrentUser();
  const [selectorVisible, setSelectorVisible] = useState(false);

  const isAssistant = currentUser.role === 'ASSISTANT';

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Icon name="school" size={32} color={Colors.primary} />
        </View>
        <AppText variant="h1" align="center" style={styles.title}>
          Presensi Praktikum
        </AppText>
        <AppText variant="bodySm" align="center" color={Colors.textMuted}>
          Sistem Presensi Praktikum Terpadu & Realtime
        </AppText>
      </View>

      {/* Active User Card & Switcher */}
      <Card variant="default" padding="md" style={styles.userCard}>
        <View style={styles.userCardHeader}>
          <AppText variant="caption" color={Colors.textMuted} weight="semibold">
            PENGGUNA AKTIF
          </AppText>
          <Badge
            label={isAssistant ? 'Asisten' : 'Praktikan'}
            variant={isAssistant ? 'primary' : 'attended'}
            size="sm"
            showDot
          />
        </View>

        <View style={styles.userInfoRow}>
          <View style={styles.avatar}>
            <Icon
              name={isAssistant ? 'school' : 'person'}
              size={22}
              color={Colors.primary}
            />
          </View>
          <View style={styles.userTextContainer}>
            <AppText variant="body" weight="semibold">
              {currentUser.name}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {isAssistant ? 'Kode: ' : 'NIM: '}
              {currentUser.identifier}
            </AppText>
          </View>
        </View>

        <Pressable
          style={styles.switchButton}
          onPress={() => setSelectorVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Ganti peran atau profil"
        >
          <Icon name="swap-horizontal" size={16} color={Colors.primary} />
          <AppText variant="bodySm" color={Colors.primary} weight="semibold">
            Ganti Profil / Peran
          </AppText>
        </Pressable>
      </Card>

      {/* Primary Navigation Actions */}
      <View style={styles.actionGroup}>
        <AppText variant="label" style={styles.sectionLabel}>
          MASUK KE SISTEM
        </AppText>

        <CustomButton
          title={
            isAssistant
              ? 'Buka Jadwal & Rekap Asisten'
              : 'Buka Jadwal Praktikan'
          }
          onPress={() => {
            if (isAssistant) {
              router.push('/assistant' as Href);
            } else {
              router.push('/student' as Href);
            }
          }}
          variant="primary"
          size="md"
          icon={
            <Icon
              name={isAssistant ? 'school-outline' : 'person-outline'}
              size={18}
              color={Colors.textWhite}
            />
          }
        />

        <CustomButton
          title={
            isAssistant
              ? 'Beralih Lihat Tampilan Praktikan'
              : 'Beralih Lihat Tampilan Asisten'
          }
          onPress={() => {
            if (isAssistant) {
              router.push('/student' as Href);
            } else {
              router.push('/assistant' as Href);
            }
          }}
          variant="secondary"
          size="md"
        />
      </View>

      {/* Design System & UI Gallery Card */}
      <Card variant="hero" padding="md" style={styles.heroPreview}>
        <AppText variant="caption" color={Colors.textWhiteMuted} weight="semibold">
          DESIGN SYSTEM
        </AppText>
        <AppText variant="title" color={Colors.textWhite} style={styles.heroTitle}>
          UI Component Gallery
        </AppText>
        <AppText variant="bodySm" color={Colors.textWhiteMuted} style={styles.heroSubtitle}>
          Eksplorasi tema Royal Violet, Cotap Midnight, badge, dan modal feedback.
        </AppText>
        <CustomButton
          title="Buka UI Gallery"
          onPress={() => router.push('/ui-gallery')}
          variant="secondary"
          size="sm"
        />
      </Card>

      {/* Role Selector Modal */}
      <RoleSelectorModal
        visible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.lg,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    marginBottom: Spacing.xxs,
  },
  userCard: {
    marginBottom: Spacing.lg,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTextContainer: {
    flex: 1,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: Spacing.xs,
  },
  actionGroup: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    marginBottom: Spacing.xxs,
  },
  heroPreview: {
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    marginTop: Spacing.xxs,
    marginBottom: Spacing.xxs,
  },
  heroSubtitle: {
    marginBottom: Spacing.sm,
  },
});
