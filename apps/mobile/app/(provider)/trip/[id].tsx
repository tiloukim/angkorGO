// Driver active ride — advance the trip and broadcast GPS (rider tracks this).
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TripStatus, Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast';
import { useLocale } from '@/lib/locale';

const ACTIVE: TripStatus[] = ['matched', 'driver_arriving', 'driver_arrived', 'in_progress'];

// Forward transitions the driver drives. Completion → payment/fare settle is R6.
const NEXT: Partial<Record<TripStatus, { to: TripStatus }>> = {
  matched:         { to: 'driver_arriving' },
  driver_arriving: { to: 'driver_arrived' },
  driver_arrived:  { to: 'in_progress' },
  in_progress:     { to: 'completed' },
};

// Trilingual copy for the driver's next-action button, keyed by current status.
const STEP_LABEL: Record<Language, Partial<Record<TripStatus, string>>> = {
  en: {
    matched:         'Start driving to pickup',
    driver_arriving: "I've arrived at pickup",
    driver_arrived:  'Start trip',
    in_progress:     'End trip',
  },
  km: {
    matched:         'ចាប់ផ្តើមបើកទៅកន្លែងទទួល',
    driver_arriving: 'ខ្ញុំបានមកដល់កន្លែងទទួល',
    driver_arrived:  'ចាប់ផ្តើមដំណើរ',
    in_progress:     'បញ្ចប់ដំណើរ',
  },
  zh: {
    matched:         '开始前往接客点',
    driver_arriving: '我已到达接客点',
    driver_arrived:  '开始行程',
    in_progress:     '结束行程',
  },
};

const L: Record<Language, Record<string, string>> = {
  en: { pickup: 'Pick up', dropoff: 'Drop off', fare: 'Fare', navigate: 'Navigate ↗', back: 'Back to dashboard', couldNotEndTrip: 'Could not end trip', tripCompleted: 'Trip completed', fareSettled: 'Fare settled. Cashless rides are paid by the rider in-app.', updateFailed: 'Update failed' },
  km: { pickup: 'ទទួល', dropoff: 'ចុះ', fare: 'តម្លៃ', navigate: 'នាំផ្លូវ ↗', back: 'ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង', couldNotEndTrip: 'មិន​អាច​បញ្ចប់​ដំណើរ', tripCompleted: 'ដំណើរ​បាន​បញ្ចប់', fareSettled: 'ថ្លៃ​ដំណើរ​បាន​សង។ ដំណើរ​គ្មាន​សាច់ប្រាក់​ត្រូវ​បង់​ដោយ​អ្នក​ជិះ​ក្នុង​កម្មវិធី។', updateFailed: 'ធ្វើ​បច្ចុប្បន្នភាព​បរាជ័យ' },
  zh: { pickup: '接客', dropoff: '下车', fare: '车费', navigate: '导航 ↗', back: '返回仪表板', couldNotEndTrip: '无法结束行程', tripCompleted: '行程已完成', fareSettled: '车费已结算。无现金行程由乘客在应用内支付。', updateFailed: '更新失败' },
};

export default function DriverTrip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLocale();
  const [status, setStatus] = useState<TripStatus>('matched');
  const [pickup, setPickup] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [dropoff, setDropoff] = useState('');
  const [fare, setFare] = useState<number | null>(null);

  useLocationBroadcast(ACTIVE.includes(status));

  useEffect(() => {
    if (!id) return;
    supabase.rpc('get_trip', { p_trip_id: id }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setStatus(row.status);
        setPickup({ lat: row.pickup_lat, lng: row.pickup_lng, address: row.pickup_address });
        setDropoff(row.dropoff_address ?? '');
        setFare(row.est_fare);
      }
    });
    const channel = supabase
      .channel(`dtrip:${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${id}` },
        (p) => setStatus((p.new as { status: TripStatus }).status))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function advance() {
    const step = NEXT[status];
    if (!step) return;
    if (step.to === 'completed') {
      // Settle the fare (cash → ledger, cashless → pending payment) + complete.
      const { error } = await supabase.rpc('settle_trip', { p_trip_id: id });
      if (error) return Alert.alert(L[lang].couldNotEndTrip, error.message);
      Alert.alert(L[lang].tripCompleted, L[lang].fareSettled);
      return router.replace('/(provider)');
    }
    const patch: Record<string, unknown> = { status: step.to };
    if (step.to === 'in_progress') patch.started_at = new Date().toISOString();
    const { error } = await supabase.from('trips').update(patch).eq('id', id);
    if (error) return Alert.alert(L[lang].updateFailed, error.message);
  }

  function navigateTo() {
    if (pickup) {
      const q = status === 'in_progress' ? encodeURIComponent(dropoff) : `${pickup.lat},${pickup.lng}`;
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${q}`);
    }
  }

  const step = NEXT[status];

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status.replace('_', ' ').toUpperCase()}</Text>
      <Text style={styles.label}>{status === 'in_progress' ? L[lang].dropoff : L[lang].pickup}</Text>
      <Text style={styles.addr}>{status === 'in_progress' ? dropoff : pickup?.address}</Text>
      {fare != null && <Text style={styles.fare}>{L[lang].fare} ${Number(fare).toFixed(2)}</Text>}

      <View style={styles.actions}>
        <Pressable style={styles.nav} onPress={navigateTo}>
          <Text style={styles.navText}>{L[lang].navigate}</Text>
        </Pressable>
        {step && (
          <Pressable style={styles.primary} onPress={advance}>
            <Text style={styles.primaryText}>{(STEP_LABEL[lang] ?? STEP_LABEL.en)[status] ?? STEP_LABEL.en[status]}</Text>
          </Pressable>
        )}
        <Pressable style={styles.back} onPress={() => router.replace('/(provider)')}>
          <Text style={styles.backText}>{L[lang].back}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, paddingTop: 80 },
  status: { color: '#00B14F', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  label: { color: '#7A7A7A', fontSize: 13, marginTop: 16 },
  addr: { color: '#1C1C1C', fontSize: 22, fontWeight: '700', marginTop: 4 },
  fare: { color: '#00B14F', fontSize: 18, fontWeight: '800', marginTop: 12 },
  actions: { marginTop: 'auto', gap: 10 },
  nav: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ECECEC' },
  navText: { color: '#1C1C1C', fontWeight: '700' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
