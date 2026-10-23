import React from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';

// Placeholder for student attendance history (owner: Bahir, see docs/ARCHITECTURE.md).
export default function StudentHistoryRoute() {
  return (
    <Screen withBottomNavPadding>
      <View style={styles.center}>
        <EmptyState
          title="Riwayat Presensi"
          message="Halaman riwayat presensi sedang disiapkan oleh Bahir."
          iconName="time-outline"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
});

