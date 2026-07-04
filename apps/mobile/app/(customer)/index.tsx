// Customer emergency screen (Phase 3, Step 2) — the app's home.
// Large, tourist-friendly category buttons in EN/KH. Tapping a category
// starts the request flow: capture GPS → add photos → dispatch.
import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  SERVICE_CATEGORIES,
  categoryLabel,
  t,
  type Language,
  type ServiceCategory,
} from '@angkorgo/shared';

export default function EmergencyScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');

  const onSelect = (category: ServiceCategory) => {
    // Next step: location capture screen carries the chosen category forward.
    router.push({ pathname: '/(customer)/request/location', params: { category } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>AngkorGo Rescue</Text>
        <Text style={styles.tagline}>{t(lang, 'tagline')}</Text>
        <Pressable onPress={() => setLang(lang === 'en' ? 'km' : 'en')} hitSlop={12}>
          <Text style={styles.langToggle}>{lang === 'en' ? 'ភាសាខ្មែរ' : 'English'}</Text>
        </Pressable>
      </View>

      <Text style={styles.prompt}>{t(lang, 'whats_wrong')}</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {SERVICE_CATEGORIES.map((c) => (
          <Pressable key={c} style={styles.card} onPress={() => onSelect(c)}>
            <Text style={styles.cardLabel}>{categoryLabel(lang, c)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', paddingTop: 64, paddingHorizontal: 16 },
  header: { marginBottom: 24 },
  brand: { color: '#fff', fontSize: 26, fontWeight: '800' },
  tagline: { color: '#8FA3BF', fontSize: 15, marginTop: 4 },
  langToggle: { color: '#F04438', fontSize: 14, marginTop: 8, fontWeight: '600' },
  prompt: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: {
    width: '48%',
    backgroundColor: '#151E30',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2A40',
  },
  cardLabel: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
