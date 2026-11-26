import { Href, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { BoxIcon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { LatenessBadge } from '@/features/fines/components/LatenessBadge';
import { StatusBadge } from '@/features/sessions/components/StatusBadge';
import { subscribeAllClasses } from '@/services/admin';
import { subscribeToSessionAttendance } from '@/services/attendance';
import { subscribeFinesBySession } from '@/services/fines';
import { PracticalClass, subscribeAssistantSessions } from '@/services/sessions';
import { useAttendance, useCurrentUser, useSessions } from '@/store/hooks';
import { AttendanceRecord, PracticalSession } from '@/types/attendance';
import { FineRecord } from '@/types/fine';
import { formatRupiah, isPresentAttendanceRecord } from '@/utils/lateness';

export default function AssistantRecapRoute() {
  const { currentUser } = useCurrentUser();
  const { sessions } = useSessions();
  const { attendanceRecords } = useAttendance();

  const [firestoreSessions, setFirestoreSessions] = useState<PracticalSession[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<PracticalClass[]>([]);
  const [realtimeMap, setRealtimeMap] = useState<Record<string, AttendanceRecord[]>>({});
  const [finesMap, setFinesMap] = useState<Record<string, FineRecord[]>>({});
  const [refreshing, setRefreshing] = useState(false);

  // Subscribe ke jadwal sesi asisten & kelas yang diampu (termasuk Co-Assistant) dari Firestore
  useEffect(() => {
    if (!currentUser.id || currentUser.role !== 'ASSISTANT') return;

    const unsubSessions = subscribeAssistantSessions(
      currentUser.id,
      (loaded) => {
        setFirestoreSessions(loaded);
      },
      currentUser.name
    );

    const unsubClasses = subscribeAllClasses((classList) => {
      const firstName = (currentUser.name || '').toLowerCase().split(' ')[0];
      const myCls = classList.filter((c) => {
        const ids = c.assistantIds || (c.assistantId ? [c.assistantId] : []);
        const names = c.assistantNames || (c.assistantName ? [c.assistantName] : []);
        return (
          ids.includes(currentUser.id) ||
          (Boolean(firstName) && names.some((n) => n.toLowerCase().includes(firstName)))
        );
      });
      setAssignedClasses(myCls);
    });

    return () => {
      unsubSessions();
      unsubClasses();
    };
  }, [currentUser.id, currentUser.name, currentUser.role]);

  const mySessions = useMemo(() => {
    const myClassCodes = assignedClasses.map((c) => c.classCode.toUpperCase());
    const myClassIds = assignedClasses.map((c) => c.id);
    const firstName = (currentUser.name || '').toLowerCase().split(' ')[0];
    const source = firestoreSessions.length > 0 ? firestoreSessions : sessions;

    return source.filter((s) => {
      const isDirectOwner =
        s.assistantId === currentUser.id ||
        (Boolean(firstName) && (s.assistantName || '').toLowerCase().includes(firstName));
      const isCoAssistantClass =
        (s.classId && myClassIds.includes(s.classId)) ||
        myClassCodes.includes((s.classCode || '').toUpperCase());
      return isDirectOwner || isCoAssistantClass;
    });
  }, [assignedClasses, currentUser.id, currentUser.name, firestoreSessions, sessions]);

  // Subscribe real-time attendance & fines untuk setiap sesi yang diampu (SRS-S4-03 & SRS-S4-04)
  useEffect(() => {
    if (currentUser.role !== 'ASSISTANT' || mySessions.length === 0) return;
    const unsubAttList = mySessions.map((session) =>
      subscribeToSessionAttendance(session.id, (records) => {
        setRealtimeMap((prev) => ({
          ...prev,
          [session.id]: records,
        }));
      })
    );
    const unsubFinesList = mySessions.map((session) =>
      subscribeFinesBySession(session.id, (fines) => {
        setFinesMap((prev) => ({
          ...prev,
          [session.id]: fines,
        }));
      })
    );
    return () => {
      unsubAttList.forEach((unsub) => unsub());
      unsubFinesList.forEach((unsub) => unsub());
    };
  }, [currentUser.role, mySessions]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 300);
  };

  // Batasan peran: Praktikan tidak boleh mengakses rekapitulasi asisten
  if (currentUser.role !== 'ASSISTANT') {
    return (
      <Screen withBottomNavPadding>
        <EmptyState
          title="Akses Ditolak"
          message="Halaman rekapitulasi ini khusus untuk Asisten Praktikum. Praktikan tidak memiliki izin untuk melihat rekap kelas."
          iconName="lock-closed-outline"
          actionLabel="Buka Jadwal Praktikan"
          onAction={() => router.replace('/student' as Href)}
        />
      </Screen>
    );
  }

  const getSessionRecords = (sessionId: string): AttendanceRecord[] => {
    const rt = realtimeMap[sessionId];
    return rt ?? attendanceRecords.filter((r) => r.sessionId === sessionId);
  };

  const totalSessions = mySessions.length;
  // Hanya hitung praktikan yang benar-benar hadir (ON_TIME + LATE), tidak termasuk EXCUSED_ABSENCE
  const totalAttended = mySessions.reduce((acc, session) => {
    const present = getSessionRecords(session.id).filter(isPresentAttendanceRecord);
    return acc + present.length;
  }, 0);

  const totalLate = mySessions.reduce((acc, session) => {
    const late = getSessionRecords(session.id).filter(
      (r) => r.attendanceStatus === 'LATE'
    );
    return acc + late.length;
  }, 0);

  const totalExcused = mySessions.reduce((acc, session) => {
    const excused = getSessionRecords(session.id).filter(
      (r) => r.attendanceStatus === 'EXCUSED_ABSENCE'
    );
    return acc + excused.length;
  }, 0);

  const totalCapacity = mySessions.reduce(
    (acc, session) => acc + session.totalStudents,
    0
  );
  const overallPercentage =
    totalCapacity > 0 ? Math.round((totalAttended / totalCapacity) * 100) : 0;

  return (
    <Screen
      withBottomNavPadding
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <AppText variant="caption" color={Colors.textMuted}>
            REKAPITULASI KELAS ASPRAK
          </AppText>
          <View style={styles.titleRow}>
            <AppText variant="h1" style={styles.title}>
              Rekap Kehadiran
            </AppText>
            <BoxIcon name="bar-chart-big" size={24} color={Colors.primary} />
          </View>
        </View>
      </View>

      {/* High-level Summary Card */}
      <Card variant="default" padding="md" style={styles.summaryCard}>
        <AppText variant="caption" color={Colors.textMuted} weight="semibold">
          RINGKASAN TOTAL ({assignedClasses.length} KELAS DIAMPU)
        </AppText>
        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
              Sesi
            </AppText>
            <AppText variant="h2" color={Colors.primary} weight="bold">
              {totalSessions}
            </AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricItem}>
            <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
              Hadir
            </AppText>
            <AppText variant="h2" color={Colors.success} weight="bold">
              {totalAttended}
            </AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricItem}>
            <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
              Telat
            </AppText>
            <AppText variant="h2" color={Colors.warning} weight="bold">
              {totalLate}
            </AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricItem}>
            <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
              Izin
            </AppText>
            <AppText variant="h2" color={Colors.info} weight="bold">
              {totalExcused}
            </AppText>
          </View>
        </View>
        <View style={styles.overallBarRow}>
          <AppText
            variant="caption"
            color={Colors.textSecondary}
            style={styles.flexLabel}
          >
            Rata-rata Kehadiran (Tidak termasuk Izin)
          </AppText>
          <AppText variant="caption" color={Colors.primary} weight="bold">
            {overallPercentage}%
          </AppText>
        </View>
        <ProgressBar progress={overallPercentage} size="sm" />
      </Card>

      {/* Session Breakdown List */}
      <View style={styles.sectionHeader}>
        <AppText variant="title">Rekap Per Sesi Praktikum</AppText>
      </View>

      {mySessions.length === 0 ? (
        <EmptyState
          title="Belum Ada Rekap"
          message="Belum ada sesi praktikum yang terdaftar pada kelas yang Anda ampu untuk ditampilkan rekapnya."
          iconName="stats-chart-outline"
        />
      ) : (
        <View style={styles.sessionList}>
          {mySessions.map((session) => {
            const allRecords = getSessionRecords(session.id);
            const presentRecords = allRecords.filter(isPresentAttendanceRecord);
            const onTimeRecords = presentRecords.filter(
              (r) => r.attendanceStatus !== 'LATE'
            );
            const lateRecords = presentRecords.filter(
              (r) => r.attendanceStatus === 'LATE'
            );
            const excusedRecords = allRecords.filter(
              (r) => r.attendanceStatus === 'EXCUSED_ABSENCE'
            );
            const sessionFines = finesMap[session.id] || [];
            const unpaidFines = sessionFines.filter(
              (f) => f.status === 'UNPAID' || f.status === 'PENDING'
            );
            const paidFines = sessionFines.filter((f) => f.status === 'PAID');

            const attendedCount = presentRecords.length;
            const progress =
              session.totalStudents > 0
                ? attendedCount / session.totalStudents
                : 0;
            const pct = Math.round(progress * 100);
            const hasBreakdown =
              onTimeRecords.length > 0 ||
              lateRecords.length > 0 ||
              excusedRecords.length > 0 ||
              unpaidFines.length > 0 ||
              paidFines.length > 0;
            const flaggedRecords = [...lateRecords, ...excusedRecords];
            const displayedFlagged = flaggedRecords.slice(0, 4);
            const extraFlaggedCount =
              flaggedRecords.length - displayedFlagged.length;

            return (
              <Pressable
                key={session.id}
                onPress={() =>
                  router.push(`/assistant/session/${session.id}` as Href)
                }
              >
                <Card
                  variant="default"
                  padding="md"
                  style={styles.sessionRecapCard}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.courseInfo}>
                      <AppText variant="body" weight="bold">
                        {session.courseName}
                      </AppText>
                      <AppText variant="caption" color={Colors.textMuted}>
                        Kelas {session.classCode} • {session.room}
                      </AppText>
                      <AppText variant="caption" color={Colors.primaryDark}>
                        Asprak: {session.assistantName}
                      </AppText>
                    </View>
                    <StatusBadge status={session.status} size="sm" />
                  </View>

                  <View style={styles.progressSection}>
                    <View style={styles.progressLabels}>
                      <AppText
                        variant="caption"
                        color={Colors.textSecondary}
                        style={styles.flexLabel}
                      >
                        Hadir: {attendedCount} dari {session.totalStudents} Mahasiswa
                      </AppText>
                      <AppText
                        variant="caption"
                        color={Colors.primary}
                        weight="semibold"
                      >
                        {pct}%
                      </AppText>
                    </View>
                    <ProgressBar progress={pct} size="sm" />
                  </View>

                  {/* Breakdown Ketepatan Waktu, Izin Bebas Denda & Status Denda (SRS-S4-04) */}
                  {hasBreakdown ? (
                    <View style={styles.breakdownBadges}>
                      {onTimeRecords.length > 0 ? (
                        <Badge
                          label={`Tepat Waktu: ${onTimeRecords.length}`}
                          variant="open"
                          size="sm"
                        />
                      ) : null}
                      {lateRecords.length > 0 ? (
                        <Badge
                          label={`Terlambat: ${lateRecords.length}`}
                          variant="waiting"
                          size="sm"
                        />
                      ) : null}
                      {excusedRecords.length > 0 ? (
                        <Badge
                          label={`Izin: ${excusedRecords.length}`}
                          variant="attended"
                          size="sm"
                        />
                      ) : null}
                      {unpaidFines.length > 0 ? (
                        <Badge
                          label={`Denda Aktif: ${unpaidFines.length}`}
                          variant="danger"
                          size="sm"
                        />
                      ) : null}
                      {paidFines.length > 0 ? (
                        <Badge
                          label={`Denda Lunas: ${paidFines.length}`}
                          variant="open"
                          size="sm"
                        />
                      ) : null}
                    </View>
                  ) : (
                    <AppText
                      variant="caption"
                      color={Colors.textMuted}
                      style={styles.emptyBreakdownText}
                    >
                      Belum ada catatan kehadiran atau izin pada sesi ini.
                    </AppText>
                  )}

                  {/* Rincian Praktikan Terlambat / Izin per Sesi */}
                  {flaggedRecords.length > 0 ? (
                    <View style={styles.studentDetailList}>
                      {displayedFlagged.map((rec, index) => {
                        const matchedFine = sessionFines.find(
                          (f) => f.studentId === rec.studentId
                        );
                        return (
                          <View
                            key={rec.id}
                            style={[
                              styles.studentDetailRow,
                              index > 0 && styles.studentDetailRowDivider,
                            ]}
                          >
                            <View style={styles.studentDetailInfo}>
                              <AppText variant="caption" weight="semibold" numberOfLines={1}>
                                {rec.studentName} ({rec.studentNim})
                              </AppText>
                              {matchedFine && matchedFine.status === 'PAID' ? (
                                <AppText variant="caption" color={Colors.textMuted}>
                                  Denda {formatRupiah(matchedFine.amount)} lunas • Status hadir tetap Terlambat
                                </AppText>
                              ) : null}
                            </View>
                            <LatenessBadge
                              status={rec.attendanceStatus}
                              lateMinutes={rec.lateMinutes}
                              fineStatus={matchedFine?.status}
                              size="sm"
                            />
                          </View>
                        );
                      })}
                      {extraFlaggedCount > 0 ? (
                        <AppText
                          variant="caption"
                          color={Colors.textMuted}
                          style={styles.moreStudentsCaption}
                        >
                          +{extraFlaggedCount} lainnya
                        </AppText>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <AppText
                      variant="caption"
                      color={Colors.primary}
                      weight="semibold"
                    >
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
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    marginTop: Spacing.xxs,
    flexShrink: 1,
  },
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: Spacing.xxs,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: Spacing.xxs,
    backgroundColor: Colors.border,
  },
  overallBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  flexLabel: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sessionList: {
    gap: Spacing.md,
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
    gap: Spacing.xxs,
  },
  progressSection: {
    marginBottom: Spacing.sm,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  breakdownBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  emptyBreakdownText: {
    marginBottom: Spacing.sm,
  },
  studentDetailList: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  studentDetailRow: {
    gap: Spacing.xs,
  },
  studentDetailRowDivider: {
    paddingTop: Spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  studentDetailInfo: {
    gap: Spacing.xxs,
  },
  moreStudentsCaption: {
    paddingTop: Spacing.xxs,
  },
  cardFooter: {
    alignItems: 'flex-end',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
