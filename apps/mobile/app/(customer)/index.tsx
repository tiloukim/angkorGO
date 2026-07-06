// Customer emergency screen (Phase 3, Step 2) — the app's home.
// Large, tourist-friendly category buttons in EN/KH. Tapping a category
// starts the request flow: capture GPS → add photos → dispatch.
import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  SERVICE_CATEGORIES,
  LANGUAGES,
  categoryLabel,
  t,
  type Language,
  type ServiceCategory,
} from '@angkorgo/shared';

export default function EmergencyScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');

  // Cycle English → Khmer → Chinese; the toggle shows the language you'll switch to.
  const nextIndex = (LANGUAGES.findIndex((l) => l.code === lang) + 1) % LANGUAGES.length;
  const nextLang = () => setLang(LANGUAGES[nextIndex].code);

  const onSelect = (category: ServiceCategory) => {
    // Next step: location capture screen carries the chosen category forward.
    router.push({ pathname: '/(customer)/request/location', params: { category } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>AngkorGo</Text>
          <Pressable onPress={() => router.push('/(customer)/account')} hitSlop={12}>
            <Text style={styles.account}>Account</Text>
          </Pressable>
        </View>
        <Text style={styles.tagline}>{t(lang, 'tagline')}</Text>
        <Pressable onPress={nextLang} hitSlop={12}>
          <Text style={styles.langToggle}>{LANGUAGES[nextIndex].label}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.rideCard} onPress={() => router.push('/(customer)/ride')}>
        <Text style={styles.rideIcon}>🛺</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rideTitle}>Get a ride</Text>
          <Text style={styles.rideSub}>Moto · Tuk-tuk · Car</Text>
        </View>
        <Text style={styles.rideArrow}>→</Text>
      </Pressable>

      <Pressable style={styles.rentCard} onPress={() => router.push('/(customer)/rentals')}>
        <Text style={styles.rideIcon}>🚗</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rideTitle}>Rent a vehicle</Text>
          <Text style={styles.rentSub}>Cars & vans by the day</Text>
        </View>
        <Text style={styles.rideArrow}>→</Text>
      </Pressable>

      <Text style={styles.prompt}>Roadside help</Text>

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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  account: { color: '#8FA3BF', fontSize: 14, fontWeight: '600' },
  brand: { color: '#fff', fontSize: 26, fontWeight: '800' },
  tagline: { color: '#8FA3BF', fontSize: 15, marginTop: 4 },
  langToggle: { color: '#F04438', fontSize: 14, marginTop: 8, fontWeight: '600' },
  rideCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F04438', borderRadius: 16, padding: 18, marginBottom: 12 },
  rentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#151E30', borderRadius: 16, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: '#1F2A40' },
  rideIcon: { fontSize: 30 },
  rideTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  rideSub: { color: '#FFE3E0', fontSize: 13, marginTop: 2 },
  rentSub: { color: '#8FA3BF', fontSize: 13, marginTop: 2 },
  rideArrow: { color: '#fff', fontSize: 22, fontWeight: '800' },
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
