import { Stack } from 'expo-router';

// Root stack. Zaidan wraps this with <AppProvider> (src/store/AppProvider.tsx).
// Detail screens (assistant/session/[id], student/attendance/[id]) are pushed
// from this stack, outside the tabs, so the back button returns correctly.
export default function RootLayout() {
  return <Stack />;
}
