import { Href, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { HistoryItemCard } from '@/features/attendance/components/HistoryItemCard';
import { subscribeAllClasses } from '@/services/admin';
import {
  getStudentAttendanceHistory,
  subscribeStudentAttendance,
} from '@/services/attendance';
import { subscribeStudentSessions } from '@/services/sessions';
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';
import { AttendanceRecord, PracticalSession } from '@/types/attendance';

export default function StudentHistoryRoute() {
  const { currentUser } = useCurrentUser();
  const { getAttendanceByStudent } = useAttendance();
  const { getSessionById } = useSessions();
  const [refreshing, setRefreshing] = useState(false);
  const [firestoreRecords, setFirestoreRecords] = useState<AttendanceRecord[]>([]);
  const [firestoreSessions, setFirestoreSessions] = useState<PracticalSession[]>([]);

  // Ambil riwayat presensi khusus untuk praktikan yang sedang login dari store lokal
  const localHistory = getAttendanceByStudent(currentUser.id);

  useEffect(() => {
    if (!currentUser.id) return;

    const unsubAtt = subscribeStudentAttendance(currentUser.id, (records) => {
      setFirestoreRecords(records);
    });

    const unsubClasses = subscribeAllClasses((clsList) => {
      const joinedCodes = clsList
        .filter((c) => (c.studentIds || []).includes(currentUser.id))
        .map((c) => c.classCode);
      const allCodes = Array.from(
        new Set([...(currentUser.enrolledClasses || []), ...joinedCodes])
      );
      subscribeStudentSessions(currentUser.id, allCodes, (sessList) => {
        setFirestoreSessions(sessList);
      });
    });

    return () => {
      unsubAtt();
      unsubClasses();
    };
  }, [currentUser.id, currentUser.enrolledClasses]);

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
    const liveSess = firestoreSessions.find((s) => s.id === item.sessionId);
    combinedMap.set(key, {
      ...item,
      session: liveSess || existing?.session || getSessionById(item.sessionId),
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
      </View>

      {/* Profil Mahasiswa Aktif */}
      <View style={styles.profileBadgeCard}>
        <View style={styles.profileIconCircle}>
          <Icon name="school-outline" size={18} color={Colors.primary} />
        </View>
        <View style={styles.profileInfo}>
          <AppText variant="bodySm" weight="semibold" numberOfLines={1}>
            {currentUser.name}
          </AppText>
          <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
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
        <EmptyState
          title="Belum Ada Riwayat"
          message="Anda belum pernah melakukan presensi pada sesi praktikum yang dibuka."
          iconName="time-outline"
          actionLabel="Lihat Jadwal Praktikum"
          onAction={() => router.push('/student' as Href)}
        />
      ) : (
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <AppText variant="title" style={styles.sectionTitle}>
              Daftar Presensi
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
    marginTop: Spacing.xxs,
  },
  profileBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
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
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xxs,
  },
  sectionTitle: {
    flexShrink: 1,
  },
});
