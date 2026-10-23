import { Href, router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal, FeedbackType } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

export default function UIGalleryRoute() {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<FeedbackType>('success');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [checkInState, setCheckInState] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  const openFeedback = (type: FeedbackType, title: string, message: string) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };

  return (
    <Screen style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <AppText variant="h1">UI Design System</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            Royal Violet & Cotap Midnight Theme Gallery
          </AppText>
        </View>
      </View>

      {/* Section 1: Color Palette */}
      <View style={styles.section}>
        <AppText variant="h2" style={styles.sectionTitle}>
          1. Color Palette Tokens
        </AppText>
        <View style={styles.swatchGrid}>
          <View style={[styles.swatch, { backgroundColor: Colors.midnight }]}>
            <AppText variant="caption" color={Colors.textWhite} weight="bold">
              Midnight
            </AppText>
            <AppText variant="caption" color={Colors.textWhiteMuted}>
              #1E1035
            </AppText>
          </View>
          <View style={[styles.swatch, { backgroundColor: Colors.primary }]}>
            <AppText variant="caption" color={Colors.textWhite} weight="bold">
              Primary
            </AppText>
            <AppText variant="caption" color={Colors.textWhiteMuted}>
              #6D28D9
            </AppText>
          </View>
          <View style={[styles.swatch, { backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: '#DDD6FE' }]}>
            <AppText variant="caption" color={Colors.primary} weight="bold">
              PrimaryBg
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              #EDE9FE
            </AppText>
          </View>
          <View style={[styles.swatch, { backgroundColor: Colors.successBg, borderWidth: 1, borderColor: Colors.successBorder }]}>
            <AppText variant="caption" color={Colors.success} weight="bold">
              Success
            </AppText>
            <AppText variant="caption" color={Colors.success}>
              #166534
            </AppText>
          </View>
          <View style={[styles.swatch, { backgroundColor: Colors.warningBg, borderWidth: 1, borderColor: Colors.warningBorder }]}>
            <AppText variant="caption" color={Colors.warning} weight="bold">
              Warning
            </AppText>
            <AppText variant="caption" color={Colors.warning}>
              #92400E
            </AppText>
          </View>
          <View style={[styles.swatch, { backgroundColor: Colors.dangerBg, borderWidth: 1, borderColor: Colors.dangerBorder }]}>
            <AppText variant="caption" color={Colors.danger} weight="bold">
              Danger
            </AppText>
            <AppText variant="caption" color={Colors.danger}>
              #991B1B
            </AppText>
          </View>
        </View>
      </View>

      {/* Section 2: Interactive Ripple Check-in Component */}
      <View style={styles.section}>
        <AppText variant="h2" style={styles.sectionTitle}>
          2. Interactive Concentric Ripple Check-In
        </AppText>
        <AppText variant="caption" color={Colors.textMuted} style={styles.sectionDesc}>
          Diadopsi dari referensi Mobbins/Cotap untuk pengalaman presensi yang taktil.
        </AppText>
        <Card variant="flat" padding="lg" style={styles.rippleCard}>
          <View style={styles.rippleOuter}>
            <View style={styles.rippleMid}>
              <Pressable
                onPress={() => setCheckInState(!checkInState)}
                style={({ pressed }) => [
                  styles.rippleInner,
                  checkInState && styles.rippleInnerSuccess,
                  pressed && styles.rippleInnerPressed,
                ]}
              >
                <Icon
                  name={checkInState ? 'checkmark' : 'finger-print-outline'}
                  size={36}
                  color={Colors.textWhite}
                />
                <AppText
                  variant="caption"
                  weight="bold"
                  color={Colors.textWhite}
                  style={styles.rippleText}
                >
                  {checkInState ? 'TERPRESENSI' : 'TAP PRESENSI'}
                </AppText>
              </Pressable>
            </View>
          </View>
          <AppText
            variant="caption"
            color={checkInState ? Colors.success : Colors.textMuted}
            style={styles.rippleStatusText}
          >
            {checkInState
              ? '✓ Presensi Selesai pada 08:31 WIB'
              : 'Sentuh lingkaran untuk mencatat kehadiran'}
          </AppText>
        </Card>
      </View>

      {/* Section 3: Cards Showcase */}
      <View style={styles.section}>
        <AppText variant="h2" style={styles.sectionTitle}>
          3. Card Containers
        </AppText>

        {/* Hero Card */}
        <Card variant="hero" padding="md" style={styles.cardItem}>
          <View style={styles.cardHeaderRow}>
            <Badge label="HERO VARIANT" variant="open" size="sm" showDot />
            <AppText variant="caption" color={Colors.textWhiteMuted}>
              Lab Komputer 1
            </AppText>
          </View>
          <AppText variant="title" color={Colors.textWhite} style={styles.cardTitle}>
            Praktikum Jaringan Komputer
          </AppText>
          <AppText variant="bodySm" color={Colors.textWhiteMuted}>
            Midnight surface dengan white frosted glass border highlight.
          </AppText>
        </Card>

        {/* Default Card */}
        <Card variant="default" padding="md" style={styles.cardItem}>
          <AppText variant="title">Default Surface Card</AppText>
          <AppText variant="bodySm" color={Colors.textMuted}>
            Card standar dengan border halus dan soft shadow untuk keterbacaan tinggi.
          </AppText>
        </Card>

        {/* Accent Card */}
        <Card variant="accent" padding="md" style={styles.cardItem}>
          <AppText variant="title" color={Colors.primary}>
            Accent Violet Card
          </AppText>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Digunakan untuk pengumuman atau info penting praktikan.
          </AppText>
        </Card>
      </View>

      {/* Section 4: Buttons Showcase */}
      <View style={styles.section}>
        <AppText variant="h2" style={styles.sectionTitle}>
          4. Buttons & States
        </AppText>
        <View style={styles.btnRow}>
          <CustomButton
            title="Primary Button"
            onPress={() => {}}
            variant="primary"
            style={styles.btnItem}
          />
          <CustomButton
            title="Secondary Button"
            onPress={() => {}}
            variant="secondary"
            style={styles.btnItem}
          />
        </View>
        <View style={styles.btnRow}>
          <CustomButton
            title="Outline Button"
            onPress={() => {}}
            variant="outline"
            style={styles.btnItem}
          />
          <CustomButton
            title="Hero Midnight Button"
            onPress={() => {}}
            variant="hero"
            style={styles.btnItem}
          />
        </View>
        <View style={styles.btnRow}>
          <CustomButton
            title="Danger Button"
            onPress={() => {}}
            variant="danger"
            style={styles.btnItem}
          />
          <CustomButton
            title="Loading..."
            onPress={() => setButtonLoading(!buttonLoading)}
            loading={buttonLoading}
            variant="primary"
            style={styles.btnItem}
          />
        </View>
      </View>

      {/* Section 5: Badges Showcase */}
      <View style={styles.section}>
        <AppText variant="h2" style={styles.sectionTitle}>
          5. Status Badges (WCAG AA Compliant)
        </AppText>
        <View style={styles.badgeRow}>
          <Badge label="OPEN" variant="open" showDot />
          <Badge label="CLOSED" variant="closed" />
          <Badge label="ATTENDED" variant="attended" />
          <Badge label="WAITING" variant="waiting" />
          <Badge label="DANGER" variant="danger" />
          <Badge label="PRIMARY" variant="primary" />
        </View>
      </View>

      {/* Section 6: Progress Bars */}
      <View style={styles.section}>
        <AppText variant="h2" style={styles.sectionTitle}>
          6. Progress Bars
        </AppText>
        <View style={styles.progressItem}>
          <AppText variant="caption" color={Colors.textMuted} style={styles.progressLabel}>
            Kehadiran Sesi (75%)
          </AppText>
          <ProgressBar progress={75} variant="primary" size="md" />
        </View>
        <View style={styles.progressItem}>
          <AppText variant="caption" color={Colors.textMuted} style={styles.progressLabel}>
            Kuota Selesai (100%)
          </AppText>
          <ProgressBar progress={100} variant="success" size="md" />
        </View>
      </View>

      {/* Section 7: Feedback Modals Trigger */}
      <View style={styles.section}>
        <AppText variant="h2" style={styles.sectionTitle}>
          7. Feedback Modal Triggers
        </AppText>
        <View style={styles.btnRow}>
          <CustomButton
            title="Modal Sukses"
            onPress={() =>
              openFeedback(
                'success',
                'Presensi Berhasil!',
                'Kehadiran Anda pada modul Pemrograman Web & Mobile telah tercatat di sistem.'
              )
            }
            variant="secondary"
            size="sm"
            style={styles.btnItem}
          />
          <CustomButton
            title="Modal Error"
            onPress={() =>
              openFeedback(
                'error',
                'Gagal Melakukan Presensi',
                'Sesi praktikum ini sudah ditutup oleh asisten laboratorium.'
              )
            }
            variant="outline"
            size="sm"
            style={styles.btnItem}
          />
        </View>
      </View>

      {/* Section 8: Empty State Preview */}
      <View style={styles.section}>
        <AppText variant="h2" style={styles.sectionTitle}>
          8. Empty State Component
        </AppText>
        <Card variant="default" padding="none">
          <EmptyState
            title="Belum Ada Riwayat"
            message="Anda belum memiliki riwayat presensi praktikum pada semester aktif ini."
            iconName="clipboard-outline"
            actionLabel="Lihat Jadwal"
            onAction={() => router.push('/student' as Href)}
          />
        </Card>
      </View>

      {/* Feedback Modal Instance */}
      <FeedbackModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        primaryLabel="OK, Mengerti"
        onPrimary={() => setModalVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerTitleContainer: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  sectionDesc: {
    marginBottom: Spacing.md,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  swatch: {
    width: '31%',
    height: 60,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    justifyContent: 'space-between',
  },
  rippleCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  rippleOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleMid: {
    width: 135,
    height: 135,
    borderRadius: 67.5,
    backgroundColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  rippleInnerSuccess: {
    backgroundColor: Colors.success,
  },
  rippleInnerPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  rippleText: {
    marginTop: 4,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  rippleStatusText: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  cardItem: {
    marginBottom: Spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  btnItem: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  progressItem: {
    marginBottom: Spacing.md,
  },
  progressLabel: {
    marginBottom: Spacing.xs,
  },
});

