import { Href, router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';

// Role & identity selection screen (owner: Zaidan, see docs/ARCHITECTURE.md).
// Features quick preview links for UI Design System and Student Shell.
export default function RoleSelectRoute() {
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

      <Card variant="hero" padding="lg" style={styles.heroPreview}>
        <AppText variant="caption" color={Colors.textWhiteMuted} weight="semibold">
          PREVIEW SISTEM DESAIN
        </AppText>
        <AppText variant="title" color={Colors.textWhite} style={styles.heroTitle}>
          Design System & UI Gallery
        </AppText>
        <AppText variant="bodySm" color={Colors.textWhiteMuted} style={styles.heroSubtitle}>
          Eksplorasi warna Royal Violet, floating navbar, ripple check-in, dan komponen interaktif.
        </AppText>
        <CustomButton
          title="Buka UI Gallery"
          onPress={() => router.push('/ui-gallery')}
          variant="secondary"
          size="md"
        />
      </Card>

      <View style={styles.actionGroup}>
        <AppText variant="label" style={styles.sectionLabel}>
          NAVIGASI ROLE (DEV PREVIEW)
        </AppText>
        <CustomButton
          title="Masuk sebagai Praktikan"
          onPress={() => router.push('/student' as Href)}
          variant="primary"
          size="md"
          icon={<Icon name="person-outline" size={18} color={Colors.textWhite} />}
        />
      </View>
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
    marginBottom: Spacing.xl,
    marginTop: Spacing.xl,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  heroPreview: {
    marginBottom: Spacing.xl,
  },
  heroTitle: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    marginBottom: Spacing.md,
  },
  actionGroup: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    marginBottom: Spacing.xs,
  },
});
