import { Href, router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { StatusBadge } from '@/features/sessions/components/StatusBadge';
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';

export default function AssistantRecapRoute() {
  const { currentUser } = useCurrentUser();
  const { sessions } = useSessions();
  const { attendanceRecords } = useAttendance();

  const mySessions = sessions.filter(
    (s) => s.assistantId === currentUser.id || currentUser.role !== 'ASSISTANT'
  );

  const totalSessions = mySessions.length;
  const totalAttended = mySessions.reduce((acc, session) => {
    const count = attendanceRecords.filter((r) => r.sessionId === session.id).length;
    return acc + count;
  }, 0);

  const totalCapacity = mySessions.reduce((acc, session) => acc + session.totalStudents, 0);
  const overallPercentage =
    totalCapacity > 0 ? Math.round((totalAttended / totalCapacity) * 100) : 0;

  return (
    <Screen withBottomNavPadding>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <AppText variant="caption" color={Colors.textMuted}>
            REKAPITULASI KELAS
          </AppText>
          <AppText variant="h1" style={styles.title}>
            Rekap Kehadiran 📊
          </AppText>
        </View>
        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Ganti peran"
          style={styles.avatar}
        >
          <Icon name="person" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      {/* High-level Summary Card */}
      <Card variant="default" padding="md" style={styles.summaryCard}>
        <AppText variant="caption" color={Colors.textMuted} weight="semibold">
          RINGKASAN TOTAL
        </AppText>
        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <AppText variant="caption" color={Colors.textMuted}>
              Total Sesi
            </AppText>
            <AppText variant="h2" color={Colors.primary} weight="bold">
              {totalSessions}
            </AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricItem}>
            <AppText variant="caption" color={Colors.textMuted}>
              Total Hadir
            </AppText>
            <AppText variant="h2" color={Colors.success} weight="bold">
              {totalAttended}
            </AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricItem}>
            <AppText variant="caption" color={Colors.textMuted}>
              Rata-rata
            </AppText>
            <AppText variant="h2" color={Colors.text} weight="bold">
              {overallPercentage}%
            </AppText>
          </View>
        </View>
      </Card>

      {/* Session Breakdown List */}
      <View style={styles.sectionHeader}>
        <AppText variant="title">Rekap Per Sesi Praktikum</AppText>
      </View>

      {mySessions.length === 0 ? (
        <EmptyState
          title="Belum Ada Rekap"
          message="Belum ada sesi praktikum yang terdaftar untuk ditampilkan rekapnya."
          iconName="stats-chart-outline"
        />
      ) : (
        <View style={styles.sessionList}>
          {mySessions.map((session) => {
            const attendedCount = attendanceRecords.filter(
              (r) => r.sessionId === session.id
            ).length;
            const progress =
              session.totalStudents > 0
                ? attendedCount / session.totalStudents
                : 0;
            const pct = Math.round(progress * 100);

            return (
              <Pressable
                key={session.id}
                onPress={() => router.push(`/assistant/session/${session.id}` as Href)}
              >
                <Card variant="default" padding="md" style={styles.sessionRecapCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.courseInfo}>
                      <AppText variant="body" weight="bold">
                        {session.courseName}
                      </AppText>
                      <AppText variant="caption" color={Colors.textMuted}>
                        Kelas {session.classCode} • {session.room}
                      </AppText>
                    </View>
                    <StatusBadge status={session.status} size="sm" />
                  </View>

                  <View style={styles.progressSection}>
                    <View style={styles.progressLabels}>
                      <AppText variant="caption" color={Colors.textSecondary}>
                        Kehadiran: {attendedCount} dari {session.totalStudents} Mahasiswa
                      </AppText>
                      <AppText variant="caption" color={Colors.primary} weight="semibold">
                        {pct}%
                      </AppText>
                    </View>
                    <ProgressBar progress={pct} size="sm" />
                  </View>

                  <View style={styles.cardFooter}>
                    <AppText variant="caption" color={Colors.primary} weight="semibold">
                      Lihat Detail & Presensi →
                    </AppText>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
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
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: Spacing.sm,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sessionList: {
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  sessionRecapCard: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  courseInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  progressSection: {
    marginBottom: Spacing.sm,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardFooter: {
    alignItems: 'flex-end',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
