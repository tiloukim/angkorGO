// Airport transfer — a focused ride variant with one end fixed to the airport.
// To/From toggle + optional flight number, then reuses the ride fare + create_trip
// + dispatch flow (lands on the shared ride tracking screen).
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getCurrentCoords, coordsToAddress, type Coords } from '@/lib/location';
import { placeAutocomplete, placeCoords, type Prediction } from '@/lib/places';
import { fetchRoute, type Route } from '@/lib/directions';
import { VEHICLE_LABELS, usdToKhr, type VehicleClass, type Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { useLocale } from '@/lib/locale';

// Cambodia's operating commercial airports (2025). The old Phnom Penh (PNH) and
// Siem Reap (REP) airports have closed — replaced by Techo (KTI) and
// Siem Reap–Angkor (SAI). Battambang (BBM) serves limited domestic flights.
type Airport = { code: string; city: string; name: string; lat: number; lng: number };
const AIRPORTS: Airport[] = [
  { code: 'KTI', city: 'Phnom Penh',    name: "Techo Int'l (KTI)",            lat: 11.236,  lng: 104.536 },
  { code: 'SAI', city: 'Siem Reap',     name: "Siem Reap–Angkor Int'l (SAI)", lat: 13.375,  lng: 104.221 },
  { code: 'KOS', city: 'Sihanoukville', name: "Sihanouk Int'l (KOS)",         lat: 10.579,  lng: 103.637 },
  { code: 'BBM', city: 'Battambang',    name: 'Battambang (BBM)',             lat: 13.0956, lng: 103.224 },
];

type Fare = { class: VehicleClass; fare: number; currency: string };
const METHODS = [{ key: 'cash', labelKey: 'cash' }, { key: 'khqr', labelKey: 'khqr' }] as const;

const L: Record<Language, Record<string, string>> = {
  en: {
    title: 'Airport transfer', selectAirport: 'Select airport', toAirport: 'To airport', fromAirport: 'From airport',
    yourLocation: 'Your location', locating: 'Locating…', changeLocation: 'Search a different address',
    flight: 'Flight number (optional)', gettingPrices: 'Getting prices…', request: 'Request',
    cash: 'Cash', khqr: 'KHQR', couldNotRequestRide: 'Could not request ride',
  },
  km: {
    title: 'ការធ្វើដំណើរទៅព្រលានយន្តហោះ', selectAirport: 'ជ្រើសរើសព្រលានយន្តហោះ', toAirport: 'ទៅព្រលានយន្តហោះ', fromAirport: 'ពីព្រលានយន្តហោះ',
    yourLocation: 'ទីតាំងរបស់អ្នក', locating: 'កំពុងកំណត់ទីតាំង…', changeLocation: 'ស្វែងរកអាសយដ្ឋានផ្សេង',
    flight: 'លេខជើងហោះហើរ (ស្រេចចិត្ត)', gettingPrices: 'កំពុងទាញយកតម្លៃ…', request: 'ស្នើ',
    cash: 'សាច់ប្រាក់', khqr: 'KHQR', couldNotRequestRide: 'មិន​អាច​ស្នើ​ដំណើរ',
  },
  zh: {
    title: '机场接送', selectAirport: '选择机场', toAirport: '前往机场', fromAirport: '从机场出发',
    yourLocation: '您的位置', locating: '正在定位…', changeLocation: '搜索其他地址',
    flight: '航班号（可选）', gettingPrices: '正在获取价格…', request: '叫车',
    cash: '现金', khqr: 'KHQR', couldNotRequestRide: '无法叫车',
  },
};

function haversine(a: Coords, b: Coords): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
}

export default function AirportTransfer() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;

  const [airport, setAirport] = useState<Airport>(AIRPORTS[0]);
  const [dir, setDir] = useState<'to' | 'from'>('to');
  const [other, setOther] = useState<Coords | null>(null);
  const [otherAddr, setOtherAddr] = useState(t.locating);
  const [query, setQuery] = useState('');
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [flight, setFlight] = useState('');

  const [route, setRoute] = useState<Route | null>(null);
  const [fares, setFares] = useState<Fare[]>([]);
  const [cls, setCls] = useState<VehicleClass>('moto');
  const [method, setMethod] = useState<'cash' | 'khqr'>('cash');
  const [surge, setSurge] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await getCurrentCoords();
      setOther(c);
      setOtherAddr((await coordsToAddress(c)) || t.yourLocation);
    })();
  }, []);

  useEffect(() => {
    const id = setTimeout(async () => {
      setPreds(query.trim().length >= 2 ? await placeAutocomplete(query, other ?? undefined) : []);
    }, 250);
    return () => clearTimeout(id);
  }, [query, other]);

  // Recompute fares whenever the endpoint or direction changes.
  useEffect(() => {
    if (!other) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const pickup = dir === 'to' ? other : airport;
      const dropoff = dir === 'to' ? airport : other;
      const r = await fetchRoute(pickup, dropoff);
      const distance = r?.distanceKm ?? haversine(pickup, dropoff);
      const duration = r?.etaMinutes ?? Math.max(3, Math.round((distance / 25) * 60));
      const { data: cfg } = await supabase.from('platform_config').select('value').eq('key', 'surge_multiplier').maybeSingle();
      const s = Math.max(1, Number(cfg?.value ?? 1));
      const { data } = await supabase.rpc('estimate_all_fares', { p_distance_km: distance, p_duration_min: duration, p_surge: s });
      if (!alive) return;
      setRoute(r); setSurge(s); setFares((data ?? []) as Fare[]); setLoading(false);
    })();
    return () => { alive = false; };
  }, [other, dir, airport]);

  async function chooseOther(p: Prediction) {
    setSearching(true);
    const c = await placeCoords(p.place_id);
    setSearching(false);
    if (!c) return;
    setOther(c);
    setOtherAddr(`${p.primary}${p.secondary ? `, ${p.secondary}` : ''}`);
    setQuery(''); setPreds([]);
  }

  const selected = fares.find((f) => f.class === cls);
  const pickup = other ? (dir === 'to' ? other : airport) : null;
  const dropoff = other ? (dir === 'to' ? airport : other) : null;
  const distance = route?.distanceKm ?? (pickup && dropoff ? haversine(pickup, dropoff) : 0);
  const duration = route?.etaMinutes ?? Math.max(3, Math.round((distance / 25) * 60));
  const airportLabel = airport.name + (flight.trim() ? ` · Flight ${flight.trim()}` : '');
  const destLabel = dir === 'to' ? airportLabel : otherAddr;

  async function request() {
    if (!selected || !pickup || !dropoff) return;
    setBusy(true);
    const paddr = dir === 'to' ? otherAddr : airportLabel;
    const daddr = dir === 'to' ? airportLabel : otherAddr;
    const { data: tripId, error } = await supabase.rpc('create_trip', {
      p_class: cls,
      p_pickup_lng: pickup.lng, p_pickup_lat: pickup.lat, p_pickup_address: paddr,
      p_dropoff_lng: dropoff.lng, p_dropoff_lat: dropoff.lat, p_dropoff_address: daddr,
      p_est_distance_km: distance, p_est_duration_min: duration, p_est_fare: selected.fare,
      p_surge: surge, p_payment_method: method, p_polyline: route?.polyline ?? null,
    });
    if (error || !tripId) { setBusy(false); return Alert.alert(t.couldNotRequestRide, error?.message ?? ''); }
    await supabase.rpc('dispatch_trip', { p_trip_id: tripId });
    router.replace({ pathname: '/(customer)/ride/[id]', params: { id: tripId as string } });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t.title}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.pickerLabel}>{t.selectAirport}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: 18 }}>
          {AIRPORTS.map((a) => {
            const on = airport.code === a.code;
            return (
              <Pressable key={a.code} style={[styles.airChip, on && styles.airChipOn]} onPress={() => setAirport(a)}>
                <Text style={[styles.airChipCity, on && { color: '#fff' }]}>{a.city}</Text>
                <Text style={[styles.airChipCode, on && { color: 'rgba(255,255,255,0.85)' }]}>{a.code}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.toggle}>
          {(['to', 'from'] as const).map((d) => (
            <Pressable key={d} style={[styles.dirBtn, dir === d && styles.dirOn]} onPress={() => setDir(d)}>
              <Text style={[styles.dirText, dir === d && { color: '#fff' }]}>{d === 'to' ? t.toAirport : t.fromAirport}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.pointRow}><Text style={styles.plane}>✈️</Text><Text style={styles.pointText} numberOfLines={1}>{airport.name}</Text></View>
        <View style={styles.pointRow}><View style={styles.dot} /><Text style={styles.pointText} numberOfLines={1}>{otherAddr}</Text></View>

        <TextInput
          style={styles.input} placeholder={t.changeLocation} placeholderTextColor="#9AA0A6"
          value={query} onChangeText={setQuery} autoCapitalize="none"
        />
        {searching && <ActivityIndicator color="#00B14F" style={{ marginTop: 8 }} />}
        {preds.map((p) => (
          <Pressable key={p.place_id} style={styles.pred} onPress={() => chooseOther(p)}>
            <Text style={styles.predPrimary}>{p.primary}</Text>
            {p.secondary ? <Text style={styles.predSecondary}>{p.secondary}</Text> : null}
          </Pressable>
        ))}

        <TextInput
          style={[styles.input, { marginTop: 12 }]} placeholder={t.flight} placeholderTextColor="#9AA0A6"
          value={flight} onChangeText={setFlight} autoCapitalize="characters"
        />

        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 28 }}>
            <ActivityIndicator color="#00B14F" />
            <Text style={styles.loading}>{t.gettingPrices}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.route}>{distance} km · ~{duration} min · {destLabel}</Text>
            {fares.map((f) => (
              <Pressable key={f.class} style={[styles.card, cls === f.class && styles.cardOn]} onPress={() => setCls(f.class)}>
                <Text style={styles.cardTitle}>{VEHICLE_LABELS[lang][f.class]}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.price}>${f.fare.toFixed(2)}</Text>
                  <Text style={styles.priceKhr}>≈ ៛{usdToKhr(f.fare).toLocaleString()}</Text>
                </View>
              </Pressable>
            ))}

            <View style={styles.methods}>
              {METHODS.map((m) => (
                <Pressable key={m.key} style={[styles.method, method === m.key && styles.methodOn]} onPress={() => setMethod(m.key)}>
                  <Text style={[styles.methodText, method === m.key && { color: '#fff' }]}>{t[m.labelKey]}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={[styles.primary, (busy || !selected) && { opacity: 0.6 }]} onPress={request} disabled={busy || !selected}>
              {busy ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.primaryText}>{t.request}{selected ? ` · $${selected.fare.toFixed(2)}` : ''}</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  header: { backgroundColor: theme.greenDark, paddingTop: 60, paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  backArrow: { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 28, marginTop: -2 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  content: { flex: 1 },
  pickerLabel: { color: '#1C1C1C', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  airChip: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: '#ECECEC', alignItems: 'center' },
  airChipOn: { backgroundColor: '#00B14F', borderColor: '#00B14F' },
  airChipCity: { color: '#1C1C1C', fontSize: 14, fontWeight: '700' },
  airChipCode: { color: '#9AA0A6', fontSize: 11, fontWeight: '700', marginTop: 1 },
  toggle: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  dirBtn: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ECECEC' },
  dirOn: { backgroundColor: '#00B14F', borderColor: '#00B14F' },
  dirText: { color: '#7A7A7A', fontWeight: '700' },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  plane: { fontSize: 16, width: 10, textAlign: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00B14F' },
  pointText: { color: '#1C1C1C', flex: 1, fontSize: 15 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, color: '#1C1C1C', fontSize: 15, borderWidth: 1, borderColor: '#ECECEC', marginTop: 8 },
  pred: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#ECECEC' },
  predPrimary: { color: '#1C1C1C', fontSize: 16, fontWeight: '600' },
  predSecondary: { color: '#9AA0A6', fontSize: 13, marginTop: 2 },
  loading: { color: '#7A7A7A', marginTop: 12 },
  route: { color: '#7A7A7A', fontSize: 13, marginTop: 24, marginBottom: 12 },
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
