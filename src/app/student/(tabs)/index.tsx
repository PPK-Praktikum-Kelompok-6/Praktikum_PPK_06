import { Href, router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  SessionCard,
  SessionCardData,
} from '@/features/sessions/components/SessionCard';

// Preview sessions until Zaidan's store hooks (useSessions) are merged into dev.
const PREVIEW_SESSIONS: SessionCardData[] = [
  {
    id: 'session-1',
    courseName: 'Pemrograman Web & Mobile',
    classCode: 'C1',
    room: 'Lab Komputer 2',
    timeSlot: '08.00 - 10.00 WIB',
    date: '2026-10-23T08:00:00.000Z',
    status: 'OPEN',
    assistantName: 'Muhammad Zaidan Alfarizi',
  },
  {
    id: 'session-2',
    courseName: 'Struktur Data & Algoritma',
    classCode: 'B2',
    room: 'Lab Komputer 1',
    timeSlot: '13.00 - 15.00 WIB',
    date: '2026-10-26T13:00:00.000Z',
    status: 'NOT_STARTED',
    assistantName: 'Crystiano Bayu',
  },
  {
    id: 'session-3',
    courseName: 'Basis Data Lanjut',
    classCode: 'A1',
    room: 'Lab Basis Data',
    timeSlot: '10.00 - 12.00 WIB',
    date: '2026-10-21T10:00:00.000Z',
    status: 'CLOSED',
    assistantName: 'Bahir Ananda',
  },
];

export default function StudentScheduleRoute() {
  const activeSession = PREVIEW_SESSIONS.find((s) => s.status === 'OPEN');
  const otherSessions = PREVIEW_SESSIONS.filter((s) => s.id !== activeSession?.id);

  const handleOpenSession = (sessionId: string) => {
    router.push(`/student/attendance/${sessionId}` as Href);
  };

  return (
    <Screen withBottomNavPadding>
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

      {PREVIEW_SESSIONS.length === 0 ? (
        <EmptyState
          title="Belum Ada Sesi"
          message="Saat ini belum ada jadwal sesi praktikum yang terdaftar."
          iconName="calendar-outline"
        />
      ) : (
        <>
          {activeSession ? (
            <SessionCard
              session={activeSession}
              variant="hero"
              onPress={() => handleOpenSession(activeSession.id)}
            />
          ) : null}

          <View style={styles.sectionHeader}>
            <AppText variant="title">Semua Jadwal Sesi</AppText>
            <AppText variant="caption" color={Colors.primary}>
              {PREVIEW_SESSIONS.length} Sesi
            </AppText>
          </View>

          {otherSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onPress={() => handleOpenSession(session.id)}
            />
          ))}
        </>
      )}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
});
