import { Stack } from 'expo-router';
import React from 'react';

import { AppProvider } from '@/store/AppProvider';

// Root stack. Wrapped with <AppProvider> by Zaidan.
// Detail screens (assistant/session/[id], student/attendance/[id]) are pushed
// from this stack, outside the tabs, so the back button returns correctly.
export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProvider>
  );
}
