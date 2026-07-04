// Role selection for new signups — choose Customer or Service Provider.
// Writes profiles.role + auth metadata, then RootNavigator routes onward.
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@angkorgo/shared';

export default function RoleScreen() {
  const { setRole } = useAuth();
  const [busy, setBusy] = useState<UserRole | null>(null);

  async function pick(role: UserRole) {
    setBusy(role);
    try {
      await setRole(role);
    } catch (e: any) {
      Alert.alert('Could not save', e.message);
      setBusy(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How will you use AngkorGo?</Text>

      <Pressable style={styles.card} onPress={() => pick('customer')} disabled={!!busy}>
        <Text style={styles.emoji}>🚗</Text>
        <Text style={styles.cardTitle}>I need help</Text>
        <Text style={styles.cardSub}>Request roadside assistance when I break down</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => pick('provider')} disabled={!!busy}>
        <Text style={styles.emoji}>🔧</Text>
        <Text style={styles.cardTitle}>I provide help</Text>
        <Text style={styles.cardSub}>Mechanic, tow, tire, battery or fuel service provider</Text>
      </Pressable>

      <Text style={styles.note}>Providers must upload documents and be approved before going online.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 28, textAlign: 'center' },
  card: {
    backgroundColor: '#151E30', borderRadius: 16, padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: '#1F2A40',
  },
  emoji: { fontSize: 34, marginBottom: 8 },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  cardSub: { color: '#8FA3BF', fontSize: 14, marginTop: 4 },
  note: { color: '#5B6B84', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
