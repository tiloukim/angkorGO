// Ride — Step 2: route preview + live fares per class, choose & request.
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VEHICLE_LABELS, usdToKhr, type VehicleClass, type Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { fetchRoute, type Route } from '@/lib/directions';

type Fare = { class: VehicleClass; fare: number; currency: string };
const METHODS = [{ key: 'cash', label: 'Cash' }, { key: 'khqr', label: 'KHQR' }] as const;

const L: Record<Language, Record<string, string>> = {
  en: { couldNotRequestRide: 'Could not request ride' },
  km: { couldNotRequestRide: 'មិន​អាច​ស្នើ​ដំណើរ' },
  zh: { couldNotRequestRide: '无法叫车' },
};

export default function RideSelect() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const p = useLocalSearchParams<Record<string, string>>();
  const pickup = { lat: Number(p.plat), lng: Number(p.plng) };
  const dropoff = { lat: Number(p.dlat), lng: Number(p.dlng) };

  const [route, setRoute] = useState<Route | null>(null);
  const [fares, setFares] = useState<Fare[]>([]);
  const [cls, setCls] = useState<VehicleClass>('moto');
  const [method, setMethod] = useState<'cash' | 'khqr'>('cash');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [surge, setSurge] = useState(1);

  useEffect(() => {
    (async () => {
      const r = await fetchRoute(pickup, dropoff);
      setRoute(r);
      // Fallback distance/ETA if Directions is unavailable (haversine ~ +30% for roads).
      const distance = r?.distanceKm ?? haversine(pickup, dropoff);
      const duration = r?.etaMinutes ?? Math.max(3, Math.round(distance / 25 * 60));
      // Global surge set by admin (platform_config).
      const { data: cfg } = await supabase.from('platform_config').select('value').eq('key', 'surge_multiplier').maybeSingle();
      const s = Math.max(1, Number(cfg?.value ?? 1));
      setSurge(s);
      const { data } = await supabase.rpc('estimate_all_fares', {
        p_distance_km: distance, p_duration_min: duration, p_surge: s,
      });
      setFares((data ?? []) as Fare[]);
      setLoading(false);
    })();
  }, []);

  const selected = fares.find((f) => f.class === cls);
  const distance = route?.distanceKm ?? haversine(pickup, dropoff);
  const duration = route?.etaMinutes ?? Math.max(3, Math.round(distance / 25 * 60));

  async function request() {
    if (!selected) return;
    setBusy(true);
    const { data: tripId, error } = await supabase.rpc('create_trip', {
      p_class: cls,
      p_pickup_lng: pickup.lng, p_pickup_lat: pickup.lat, p_pickup_address: p.paddr ?? null,
      p_dropoff_lng: dropoff.lng, p_dropoff_lat: dropoff.lat, p_dropoff_address: p.daddr ?? null,
      p_est_distance_km: distance, p_est_duration_min: duration, p_est_fare: selected.fare,
      p_surge: surge, p_payment_method: method, p_polyline: route?.polyline ?? null,
    });
    if (error || !tripId) { setBusy(false); return Alert.alert(t.couldNotRequestRide, error?.message ?? ''); }
    // Fan out offers to nearby drivers.
    await supabase.rpc('dispatch_trip', { p_trip_id: tripId });
    router.replace({ pathname: '/(customer)/ride/[id]', params: { id: tripId as string } });
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#00B14F" /><Text style={styles.loading}>Getting prices…</Text></View>;
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: (pickup.lat + dropoff.lat) / 2, longitude: (pickup.lng + dropoff.lng) / 2,
          latitudeDelta: Math.abs(pickup.lat - dropoff.lat) * 2.2 + 0.02,
          longitudeDelta: Math.abs(pickup.lng - dropoff.lng) * 2.2 + 0.02,
        }}
      >
        <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} pinColor="#00B14F" />
        <Marker coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }} pinColor="#1C1C1C" />
        {route && <Polyline coordinates={route.points.map((c) => ({ latitude: c.lat, longitude: c.lng }))} strokeColor="#00B14F" strokeWidth={4} />}
      </MapView>

      <View style={styles.sheet}>
        <Text style={styles.route}>{distance} km · ~{duration} min · {p.daddr}</Text>

        <ScrollView style={{ maxHeight: 220 }}>
          {fares.map((f) => (
            <Pressable key={f.class} style={[styles.card, cls === f.class && styles.cardOn]} onPress={() => setCls(f.class)}>
              <Text style={styles.cardTitle}>{VEHICLE_LABELS.en[f.class]}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.price}>${f.fare.toFixed(2)}</Text>
                <Text style={styles.priceKhr}>≈ ៛{usdToKhr(f.fare).toLocaleString()}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.methods}>
          {METHODS.map((m) => (
            <Pressable key={m.key} style={[styles.method, method === m.key && styles.methodOn]} onPress={() => setMethod(m.key)}>
              <Text style={[styles.methodText, method === m.key && { color: '#fff' }]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.primary, busy && { opacity: 0.6 }]} onPress={request} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.primaryText}>Request {VEHICLE_LABELS.en[cls]} · ${selected?.fare.toFixed(2)}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6F7' },
  loading: { color: '#7A7A7A', marginTop: 12 },
  map: { flex: 1 },
  sheet: { backgroundColor: '#F5F6F7', padding: 20, paddingBottom: 36, borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20 },
  route: { color: '#7A7A7A', fontSize: 13, marginBottom: 12 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#ECECEC' },
  cardOn: { borderColor: '#00B14F' },
  cardTitle: { color: '#1C1C1C', fontSize: 16, fontWeight: '700' },
  price: { color: '#1C1C1C', fontSize: 16, fontWeight: '800' },
  priceKhr: { color: '#7A7A7A', fontSize: 12 },
  methods: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 16 },
  method: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ECECEC' },
  methodOn: { backgroundColor: '#00B14F', borderColor: '#00B14F' },
  methodText: { color: '#7A7A7A', fontWeight: '700' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
