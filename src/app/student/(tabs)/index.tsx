import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';

export default function StudentScheduleRoute() {
  return (
    <Screen withBottomNavPadding>
      {/* Header Greeting */}
      <View style={styles.header}>
        <View>
          <AppText variant="caption" color={Colors.textMuted}>
            JADWAL PRAKTIKUM
          </AppText>
          <AppText variant="h1" style={styles.title}>
            Halo, Praktikan 👋
          </AppText>
        </View>
        <View style={styles.avatar}>
          <Icon name="person" size={20} color={Colors.primary} />
        </View>
      </View>

      {/* Hero Card: Cotap Midnight Violet with Glass Highlight */}
      <Card variant="hero" padding="lg" style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Badge label="SEDANG AKTIF" variant="open" size="sm" showDot />
          <AppText variant="caption" color={Colors.textWhiteMuted}>
            Ruang Lab Komputer 2
          </AppText>
        </View>

        <AppText variant="hero" color={Colors.textWhite} style={styles.heroTitle}>
          Pemrograman Web & Mobile
        </AppText>
        <AppText variant="bodySm" color={Colors.textWhiteMuted}>
          Modul 3: React Native State & Navigation Shell
        </AppText>

        <View style={styles.heroDivider} />

        <View style={styles.heroFooter}>
          <View style={styles.timeInfo}>
            <Icon name="time-outline" size={16} color={Colors.textWhiteMuted} />
            <AppText variant="caption" color={Colors.textWhiteMuted} style={styles.timeText}>
              08:00 - 10:00 WIB
            </AppText>
          </View>
          <CustomButton
            title="Isi Presensi"
            onPress={() => router.push('/ui-gallery')}
            variant="secondary"
            size="sm"
            fullWidth={false}
          />
        </View>
      </Card>

      {/* Sesi Mendatang Section */}
      <View style={styles.sectionHeader}>
        <AppText variant="title">Sesi Mendatang</AppText>
        <AppText variant="caption" color={Colors.primary}>
          Lihat Semua
        </AppText>
      </View>

      {/* Session Item Card */}
      <Card variant="default" padding="md" style={styles.sessionCard}>
        <View style={styles.sessionCardHeader}>
          <View style={styles.dateBadge}>
            <AppText variant="caption" weight="bold" color={Colors.primary}>
              SEN
            </AppText>
            <AppText variant="title" weight="bold" color={Colors.primaryDark}>
              27
            </AppText>
          </View>
          <View style={styles.sessionDetails}>
            <AppText variant="title" numberOfLines={1}>
              Struktur Data & Algoritma
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              Modul 5: Binary Search Tree
            </AppText>
            <View style={styles.sessionMeta}>
              <Icon name="time-outline" size={14} color={Colors.textMuted} />
              <AppText variant="caption" color={Colors.textMuted} style={styles.metaText}>
                13:00 - 15:00 WIB
              </AppText>
            </View>
          </View>
          <Badge label="TERTUTUP" variant="closed" size="sm" />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  title: {
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    marginBottom: Spacing.xl,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    marginBottom: Spacing.xs,
    fontSize: 24,
  },
  heroDivider: {
    height: 1,
    backgroundColor: Colors.midnightBorder,
    marginVertical: Spacing.md,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sessionCard: {
    marginBottom: Spacing.md,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBadge: {
    width: 50,
    height: 54,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  sessionDetails: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  metaText: {
    marginLeft: Spacing.xs,
  },
});

