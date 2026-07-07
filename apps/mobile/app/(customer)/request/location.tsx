// Step 3 — Capture location. Auto-detects GPS, shows a map with a draggable
// pin, reverse-geocodes an address, then carries category+coords forward.
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { categoryLabel, type ServiceCategory, type Language } from '@angkorgo/shared';
import { getCurrentCoords, coordsToAddress, type Coords } from '@/lib/location';
import { useLocale } from '@/lib/locale';

const L: Record<Language, Record<string, string>> = {
  en: {
    detecting: 'Detecting your location…',
    confirmLocation: 'Confirm your location',
    dragPin: 'Drag the pin to your exact position',
    confirmContinue: 'Confirm & continue',
  },
  km: {
    detecting: 'កំពុងរកទីតាំងរបស់អ្នក…',
    confirmLocation: 'បញ្ជាក់ទីតាំងរបស់អ្នក',
    dragPin: 'អូសម្ជុលទៅទីតាំងពិតប្រាកដរបស់អ្នក',
    confirmContinue: 'បញ្ជាក់ & បន្ត',
  },
  zh: {
    detecting: '正在检测您的位置…',
    confirmLocation: '确认您的位置',
    dragPin: '拖动图钉到您的准确位置',
    confirmContinue: '确认并继续',
  },
};

export default function LocationScreen() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
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
        <Text style={styles.loadingText}>{t.detecting}</Text>
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
        <Text style={styles.category}>{categoryLabel(lang, category)}</Text>
        <Text style={styles.label}>{t.confirmLocation}</Text>
        <Text style={styles.address}>{address || t.dragPin}</Text>

        <Pressable
          style={styles.primary}
          onPress={() =>
            router.push({
              pathname: '/(customer)/request/photos',
              params: { category, lat: String(coords.lat), lng: String(coords.lng), address },
            })
          }
        >
          <Text style={styles.primaryText}>{t.confirmContinue}</Text>
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
