import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

// Placeholder: role & identity selection (owner: Zaidan, see docs/ARCHITECTURE.md).
export default function RoleSelectRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pilih Peran</Text>
      <Text style={styles.subtitle}>Asisten atau Praktikan</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 16, color: Colors.textMuted },
});
