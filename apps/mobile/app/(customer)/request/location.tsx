// Step 3 — Capture location. Auto-detects GPS, shows a map with a draggable
// pin, reverse-geocodes an address, then carries category+coords forward.
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { categoryLabel, type ServiceCategory } from '@angkorgo/shared';
import { getCurrentCoords, coordsToAddress, type Coords } from '@/lib/location';

export default function LocationScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: ServiceCategory }>();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const c = await getCurrentCoords();
      setCoords(c);
      setAddress(await coordsToAddress(c));
      setLoading(false);
    })();
  }, []);

  async function onDragEnd(next: Coords) {
    setCoords(next);
    setAddress(await coordsToAddress(next));
  }

  if (loading || !coords) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#00B14F" />
        <Text style={styles.loadingText}>Detecting your location…</Text>
      </View>
    );
  }

  const region: Region = { latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };

  return (
    <View style={styles.container}>
      <MapView provider={PROVIDER_GOOGLE} style={styles.map} initialRegion={region}>
        <Marker
          draggable
          coordinate={{ latitude: coords.lat, longitude: coords.lng }}
          onDragEnd={(e) => onDragEnd({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
        />
      </MapView>

      <View style={styles.sheet}>
        <Text style={styles.category}>{categoryLabel('en', category)}</Text>
        <Text style={styles.label}>Confirm your location</Text>
        <Text style={styles.address}>{address || 'Drag the pin to your exact position'}</Text>

        <Pressable
          style={styles.primary}
          onPress={() =>
            router.push({
              pathname: '/(customer)/request/photos',
              params: { category, lat: String(coords.lat), lng: String(coords.lng), address },
            })
          }
        >
          <Text style={styles.primaryText}>Confirm & continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6F7' },
  loadingText: { color: '#7A7A7A', marginTop: 12 },
  map: { flex: 1 },
  sheet: { backgroundColor: '#FFFFFF', padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20 },
  category: { color: '#00B14F', fontWeight: '700', marginBottom: 4 },
  label: { color: '#1C1C1C', fontSize: 20, fontWeight: '800' },
  address: { color: '#7A7A7A', fontSize: 14, marginTop: 6, marginBottom: 20 },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
