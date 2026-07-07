// Ride — Step 1: set pickup (GPS) and search a destination.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getCurrentCoords, coordsToAddress, type Coords } from '@/lib/location';
import { placeAutocomplete, placeCoords, type Prediction } from '@/lib/places';
import { theme } from '@/lib/theme';
import { LocationLangBar } from '@/components/LocationLangBar';
import { useLocale } from '@/lib/locale';
import type { Language } from '@angkorgo/shared';

const L: Record<Language, Record<string, string>> = {
  en: { whereTo: 'Where to?', locating: 'Locating…', currentLocation: 'Current location', searchDestination: 'Search destination', noMatches: 'No matches', cancel: 'Cancel' },
  km: { whereTo: 'ទៅណា?', locating: 'កំពុងកំណត់ទីតាំង…', currentLocation: 'ទីតាំងបច្ចុប្បន្ន', searchDestination: 'ស្វែងរកគោលដៅ', noMatches: 'គ្មានលទ្ធផល', cancel: 'បោះបង់' },
  zh: { whereTo: '去哪里？', locating: '正在定位…', currentLocation: '当前位置', searchDestination: '搜索目的地', noMatches: '无匹配结果', cancel: '取消' },
};

export default function RideHome() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const [pickup, setPickup] = useState<Coords | null>(null);
  const [pickupAddr, setPickupAddr] = useState(t.locating);
  const [query, setQuery] = useState('');
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await getCurrentCoords();
      setPickup(c);
      setPickupAddr((await coordsToAddress(c)) || t.currentLocation);
    })();
  }, []);

  useEffect(() => {
    const id = setTimeout(async () => setPreds(await placeAutocomplete(query, pickup ?? undefined)), 250);
    return () => clearTimeout(id);
  }, [query, pickup]);

  async function choose(p: Prediction) {
    if (!pickup) return;
    setBusy(true);
    const dest = await placeCoords(p.place_id);
    setBusy(false);
    if (!dest) return;
    router.push({
      pathname: '/(customer)/ride/select',
      params: {
        plat: String(pickup.lat), plng: String(pickup.lng), paddr: pickupAddr,
        dlat: String(dest.lat), dlng: String(dest.lng), daddr: `${p.primary}, ${p.secondary}`,
      },
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LocationLangBar />
      </View>
      <View style={styles.content}>
      <Text style={styles.h1}>{t.whereTo}</Text>

      <View style={styles.pickup}>
        <View style={styles.dot} />
        <Text style={styles.pickupText} numberOfLines={1}>{pickupAddr}</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder={t.searchDestination}
        placeholderTextColor="#9AA0A6"
        value={query}
        onChangeText={setQuery}
        autoFocus
      />

      {busy && <ActivityIndicator color="#00B14F" style={{ marginTop: 12 }} />}

      <FlatList
        data={preds}
        keyExtractor={(p) => p.place_id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={styles.pred} onPress={() => choose(item)}>
            <Text style={styles.predPrimary}>{item.primary}</Text>
            {item.secondary ? <Text style={styles.predSecondary}>{item.secondary}</Text> : null}
          </Pressable>
        )}
        ListEmptyComponent={
          query.length >= 2 && !busy ? <Text style={styles.empty}>{t.noMatches}</Text> : null
        }
      />

      <Pressable style={styles.back} onPress={() => router.replace('/(customer)')}>
        <Text style={styles.backText}>{t.cancel}</Text>
      </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  header: { backgroundColor: theme.greenDark, paddingTop: 60, paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  content: { flex: 1, padding: 24, paddingTop: 20 },
  h1: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  pickup: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00B14F' },
  pickupText: { color: '#7A7A7A', flex: 1 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, color: '#1C1C1C', fontSize: 16, borderWidth: 1, borderColor: '#ECECEC' },
  pred: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#ECECEC' },
  predPrimary: { color: '#1C1C1C', fontSize: 16, fontWeight: '600' },
  predSecondary: { color: '#9AA0A6', fontSize: 13, marginTop: 2 },
  empty: { color: '#9AA0A6', marginTop: 16 },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
