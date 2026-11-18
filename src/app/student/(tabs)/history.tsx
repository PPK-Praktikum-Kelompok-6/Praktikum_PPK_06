import { Href, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { HistoryItemCard } from '@/features/attendance/components/HistoryItemCard';
import { getStudentAttendanceHistory } from '@/services/attendance';
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';
import { AttendanceRecord, PracticalSession } from '@/types/attendance';

export default function StudentHistoryRoute() {
  const { currentUser } = useCurrentUser();
  const { getAttendanceByStudent } = useAttendance();
  const { getSessionById } = useSessions();
  const [refreshing, setRefreshing] = useState(false);
  const [firestoreRecords, setFirestoreRecords] = useState<AttendanceRecord[]>([]);

  // Ambil riwayat presensi khusus untuk praktikan yang sedang login dari store lokal
  const localHistory = getAttendanceByStudent(currentUser.id);

  useEffect(() => {
    let isMounted = true;
    getStudentAttendanceHistory(currentUser.id)
      .then((records) => {
        if (isMounted) {
          setFirestoreRecords(records);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [currentUser.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const records = await getStudentAttendanceHistory(currentUser.id);
      setFirestoreRecords(records);
    } catch {
      // Fallback ke store lokal
    } finally {
      setRefreshing(false);
    }
  };

  // Gabungkan record firestore dan lokal, hilangkan duplikasi berdasarkan id/sessionId
  const combinedMap = new Map<string, AttendanceRecord & { session?: PracticalSession }>();

  localHistory.forEach((item) => {
    combinedMap.set(`${item.sessionId}_${item.studentId}`, item);
  });

  firestoreRecords.forEach((item) => {
    const key = `${item.sessionId}_${item.studentId}`;
    const existing = combinedMap.get(key);
    combinedMap.set(key, {
      ...item,
      session: existing?.session || getSessionById(item.sessionId),
    });
  });

  const historyRecords = Array.from(combinedMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleOpenDetail = (sessionId: string) => {
    router.push(`/student/attendance/${sessionId}` as Href);
  };

  return (
    <Screen
      withBottomNavPadding
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Header Halaman */}
      <View style={styles.header}>
        <View style={styles.headerTextWrapper}>
          <AppText variant="caption" color={Colors.textMuted} weight="bold">
            HISTORI KEHADIRAN
          </AppText>
          <AppText variant="h1" style={styles.title}>
            Riwayat Presensi
          </AppText>
        </View>

        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Ganti peran atau akun"
          style={styles.avatarButton}
        >
          <Icon name="person" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Profil Mahasiswa Aktif */}
      <View style={styles.profileBadgeCard}>
        <View style={styles.profileIconCircle}>
          <Icon name="school-outline" size={18} color={Colors.primary} />
        </View>
        <View style={styles.profileInfo}>
          <AppText variant="bodySm" weight="semibold">
            {currentUser.name}
          </AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            NIM: {currentUser.identifier}
          </AppText>
        </View>
        <Badge
          label={`${historyRecords.length} Hadir`}
          variant="attended"
          size="sm"
          showDot
        />
      </View>

      {/* Konten Riwayat atau Status Kosong */}
      {historyRecords.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <EmptyState
            title="Belum Ada Riwayat"
            message="Anda belum pernah melakukan presensi pada sesi praktikum yang dibuka."
            iconName="time-outline"
            actionLabel="Lihat Jadwal Praktikum"
            onAction={() => router.push('/student' as Href)}
          />
        </View>
      ) : (
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <AppText variant="title" style={styles.sectionTitle}>
              Daftar Presensi ({historyRecords.length})
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              Ketuk untuk detail
            </AppText>
          </View>

          {historyRecords.map((item) => (
            <HistoryItemCard
              key={item.id}
              record={item}
              onPress={() => handleOpenDetail(item.sessionId)}
            />
          ))}
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
  headerTextWrapper: {
    flex: 1,
  },
  title: {
    fontSize: Typography.xxl,
    marginTop: Spacing.xxs,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  profileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  listSection: {
    gap: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xxs,
  },
  sectionTitle: {
    fontSize: Typography.lg,
  },
  emptyWrapper: {
    paddingTop: Spacing.xl,
  },
});
