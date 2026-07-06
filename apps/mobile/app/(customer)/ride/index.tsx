// Ride — Step 1: set pickup (GPS) and search a destination.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getCurrentCoords, coordsToAddress, type Coords } from '@/lib/location';
import { placeAutocomplete, placeCoords, type Prediction } from '@/lib/places';

export default function RideHome() {
  const router = useRouter();
  const [pickup, setPickup] = useState<Coords | null>(null);
  const [pickupAddr, setPickupAddr] = useState('Locating…');
  const [query, setQuery] = useState('');
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await getCurrentCoords();
      setPickup(c);
      setPickupAddr((await coordsToAddress(c)) || 'Current location');
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
      <Text style={styles.h1}>Where to?</Text>

      <View style={styles.pickup}>
        <View style={styles.dot} />
        <Text style={styles.pickupText} numberOfLines={1}>{pickupAddr}</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Search destination"
        placeholderTextColor="#5B6B84"
        value={query}
        onChangeText={setQuery}
        autoFocus
      />

      {busy && <ActivityIndicator color="#F04438" style={{ marginTop: 12 }} />}

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
          query.length >= 2 && !busy ? <Text style={styles.empty}>No matches</Text> : null
        }
      />

      <Pressable style={styles.back} onPress={() => router.replace('/(customer)')}>
        <Text style={styles.backText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, paddingTop: 72 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  pickup: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  pickupText: { color: '#8FA3BF', flex: 1 },
  input: { backgroundColor: '#151E30', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#1F2A40' },
  pred: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#151E30' },
  predPrimary: { color: '#fff', fontSize: 16, fontWeight: '600' },
  predSecondary: { color: '#5B6B84', fontSize: 13, marginTop: 2 },
  empty: { color: '#5B6B84', marginTop: 16 },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#8FA3BF', fontWeight: '600' },
});
