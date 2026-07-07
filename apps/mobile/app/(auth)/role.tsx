// Role selection for new signups — choose Customer or Service Provider.
// Writes profiles.role + auth metadata, then RootNavigator routes onward.
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import type { UserRole, Language } from '@angkorgo/shared';

const L: Record<Language, Record<string, string>> = {
  en: { couldNotSave: 'Could not save' },
  km: { couldNotSave: 'មិន​អាច​រក្សា​ទុក' },
  zh: { couldNotSave: '无法保存' },
};

export default function RoleScreen() {
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const { setRole } = useAuth();
  const [busy, setBusy] = useState<UserRole | null>(null);

  async function pick(role: UserRole) {
    setBusy(role);
    try {
      await setRole(role);
    } catch (e: any) {
      Alert.alert(t.couldNotSave, e.message);
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
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, justifyContent: 'center' },
  title: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', marginBottom: 28, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: '#ECECEC',
  },
  emoji: { fontSize: 34, marginBottom: 8 },
  cardTitle: { color: '#1C1C1C', fontSize: 20, fontWeight: '700' },
  cardSub: { color: '#7A7A7A', fontSize: 14, marginTop: 4 },
  note: { color: '#9AA0A6', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
