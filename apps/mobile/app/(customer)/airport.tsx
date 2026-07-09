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
    checkFlight: 'Check flight', flightNotFound: 'Flight not found — check the number', flightErr: "Couldn't check flight",
    arrives: 'Arrives', departs: 'Departs', term: 'Terminal',
    schedulePickup: 'Schedule pickup for arrival', dispatchAround: 'Driver dispatched around {time}', schedule: 'Schedule pickup',
  },
  km: {
    title: 'ការធ្វើដំណើរទៅព្រលានយន្តហោះ', selectAirport: 'ជ្រើសរើសព្រលានយន្តហោះ', toAirport: 'ទៅព្រលានយន្តហោះ', fromAirport: 'ពីព្រលានយន្តហោះ',
    yourLocation: 'ទីតាំងរបស់អ្នក', locating: 'កំពុងកំណត់ទីតាំង…', changeLocation: 'ស្វែងរកអាសយដ្ឋានផ្សេង',
    flight: 'លេខជើងហោះហើរ (ស្រេចចិត្ត)', gettingPrices: 'កំពុងទាញយកតម្លៃ…', request: 'ស្នើ',
    cash: 'សាច់ប្រាក់', khqr: 'KHQR', couldNotRequestRide: 'មិន​អាច​ស្នើ​ដំណើរ',
    checkFlight: 'ពិនិត្យជើងហោះហើរ', flightNotFound: 'រកមិនឃើញ — ពិនិត្យលេខ', flightErr: 'មិនអាចពិនិត្យបាន',
    arrives: 'មកដល់', departs: 'ចេញដំណើរ', term: 'អាគារ',
    schedulePickup: 'កំណត់ពេលទទួលពេលមកដល់', dispatchAround: 'អ្នកបើកបរនឹងចេញដំណើរប្រហែល {time}', schedule: 'កំណត់ពេលទទួល',
  },
  zh: {
    title: '机场接送', selectAirport: '选择机场', toAirport: '前往机场', fromAirport: '从机场出发',
    yourLocation: '您的位置', locating: '正在定位…', changeLocation: '搜索其他地址',
    flight: '航班号（可选）', gettingPrices: '正在获取价格…', request: '叫车',
    cash: '现金', khqr: 'KHQR', couldNotRequestRide: '无法叫车',
    checkFlight: '查询航班', flightNotFound: '未找到航班 — 请检查航班号', flightErr: '无法查询航班',
    arrives: '到达', departs: '出发', term: '航站楼',
    schedulePickup: '按到达时间安排接机', dispatchAround: '司机将在约 {time} 出发', schedule: '安排接机',
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
  const [flightInfo, setFlightInfo] = useState<any>(null);
  const [flightChecking, setFlightChecking] = useState(false);
  const [schedule, setSchedule] = useState(false);

  const [route, setRoute] = useState<Route | null>(null);
  const [fares, setFares] = useState<Fare[]>([]);
  const [cls, setCls] = useState<VehicleClass>('car');
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
      // Airport transfers are car-only — filter out moto/tuktuk.
      setRoute(r); setSurge(s); setFares(((data ?? []) as Fare[]).filter((f) => f.class === 'car')); setLoading(false);
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

  async function checkFlight() {
    if (!flight.trim() || flightChecking) return;
    setFlightChecking(true);
    setFlightInfo(null);
    const { data, error } = await supabase.functions.invoke('flight-status', { body: { flight_number: flight.trim() } });
    setFlightChecking(false);
    if (error || (data as any)?.error) { setFlightInfo({ error: (data as any)?.error ?? t.flightErr }); return; }
    setFlightInfo(data);
  }

  // AeroDataBox local time comes as "YYYY-MM-DD HH:mm±ZZ" → show HH:mm.
  const hhmm = (s?: string | null) => (s && s.length >= 16 ? s.slice(11, 16) : '');
  const addMin = (hm: string, add: number) => {
    const [h, m] = hm.split(':').map(Number);
    let total = ((h * 60 + m + add) % 1440 + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  // Scheduled pickup — for "from airport" with a found flight, dispatch the
  // driver ~25 min after the (estimated) arrival for deplane/immigration/baggage.
  const BUFFER_MIN = 25;
  const arrivalStr: string | null = flightInfo?.arrival?.estimated || flightInfo?.arrival?.scheduled || null;
  const scheduledFor = arrivalStr
    ? new Date(new Date(String(arrivalStr).replace(' ', 'T')).getTime() + BUFFER_MIN * 60000)
    : null;
  const canSchedule =
    dir === 'from' && !!flightInfo?.found && !!flightInfo?.arrival &&
    scheduledFor != null && !isNaN(scheduledFor.getTime()) && scheduledFor.getTime() > Date.now();
  const willSchedule = schedule && canSchedule;
  const dispatchLabel = arrivalStr ? addMin(hhmm(arrivalStr), BUFFER_MIN) : '';

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
      ...(willSchedule ? { p_scheduled_for: scheduledFor!.toISOString(), p_flight_number: flight.trim() } : {}),
    });
    if (error || !tripId) { setBusy(false); return Alert.alert(t.couldNotRequestRide, error?.message ?? ''); }
    // Scheduled trips wait for the cron to dispatch near arrival; don't dispatch now.
    if (!willSchedule) await supabase.rpc('dispatch_trip', { p_trip_id: tripId });
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

        <View style={styles.flightRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginTop: 0 }]} placeholder={t.flight} placeholderTextColor="#9AA0A6"
            value={flight} onChangeText={(v) => { setFlight(v); setFlightInfo(null); }} autoCapitalize="characters"
          />
          <Pressable style={[styles.checkBtn, (!flight.trim() || flightChecking) && { opacity: 0.5 }]}
            onPress={checkFlight} disabled={!flight.trim() || flightChecking}>
            {flightChecking ? <ActivityIndicator color="#00B14F" /> : <Text style={styles.checkBtnText}>{t.checkFlight}</Text>}
          </Pressable>
        </View>

        {flightInfo && (
          <View style={styles.flightCard}>
            {flightInfo.error ? (
              <Text style={styles.flightErr}>{flightInfo.error}</Text>
            ) : flightInfo.found === false ? (
              <Text style={styles.flightErr}>{t.flightNotFound}</Text>
            ) : (
              <>
                <Text style={styles.flightHead}>✈️ {flightInfo.number}{flightInfo.status ? ` · ${flightInfo.status}` : ''}</Text>
                {flightInfo.arrival && (
                  <Text style={styles.flightLine}>
                    {t.arrives} {hhmm(flightInfo.arrival.estimated || flightInfo.arrival.scheduled)} · {flightInfo.arrival.airport}
                    {flightInfo.arrival.terminal ? ` · ${t.term} ${flightInfo.arrival.terminal}` : ''}
                  </Text>
                )}
                {flightInfo.departure && (
                  <Text style={styles.flightLineDim}>
                    {t.departs} {hhmm(flightInfo.departure.estimated || flightInfo.departure.scheduled)} · {flightInfo.departure.airport}
                  </Text>
                )}
              </>
            )}
          </View>
        )}

        {canSchedule && (
          <Pressable style={styles.schedRow} onPress={() => setSchedule((s) => !s)}>
            <View style={[styles.checkbox, schedule && styles.checkboxOn]}>
              {schedule ? <Text style={styles.checkboxTick}>✓</Text> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.schedTitle}>{t.schedulePickup}</Text>
              {schedule ? <Text style={styles.schedSub}>{t.dispatchAround.replace('{time}', dispatchLabel)}</Text> : null}
            </View>
          </Pressable>
        )}

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
                <Text style={styles.primaryText}>{willSchedule ? t.schedule : t.request}{selected ? ` · $${selected.fare.toFixed(2)}` : ''}</Text>
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
  flightRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  checkBtn: { backgroundColor: '#E4F7EC', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minWidth: 92 },
  checkBtnText: { color: '#00B14F', fontWeight: '800', fontSize: 13 },
  flightCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#ECECEC' },
  flightHead: { color: '#1C1C1C', fontSize: 15, fontWeight: '800' },
  flightLine: { color: '#1C1C1C', fontSize: 13, marginTop: 6 },
  flightLineDim: { color: '#7A7A7A', fontSize: 13, marginTop: 3 },
  flightErr: { color: '#E5484D', fontSize: 13, fontWeight: '600' },
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#ECECEC' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CBD2D9', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#00B14F', borderColor: '#00B14F' },
  checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '900', lineHeight: 15 },
  schedTitle: { color: '#1C1C1C', fontSize: 14, fontWeight: '700' },
  schedSub: { color: '#00B14F', fontSize: 12.5, marginTop: 2, fontWeight: '600' },
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
