// Ride — live trip. Searching → "finding a driver"; matched → tracking map with
// the driver approaching (then the in-trip leg to the dropoff) + a driver card.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TripStatus, VehicleClass, Language } from '@angkorgo/shared';
import { VEHICLE_LABELS } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { useProviderLocation } from '@/hooks/useProviderLocation';
import { useTripPayment } from '@/hooks/usePayment';
import { TrackingMap } from '@/components/TrackingMap';
import { PaymentSheet } from '@/components/PaymentSheet';
import type { Coords } from '@/lib/location';

const COPY: Record<Language, Partial<Record<TripStatus, { title: string; sub: string }>>> = {
  en: {
    requested:       { title: 'Requesting…', sub: 'Creating your trip' },
    searching:       { title: 'Finding a driver…', sub: 'Matching you with the nearest driver' },
    matched:         { title: 'Driver found!', sub: 'Your driver is getting ready' },
    driver_arriving: { title: 'Driver on the way', sub: 'Meet at your pickup point' },
    driver_arrived:  { title: 'Driver has arrived', sub: 'Your ride is waiting' },
    in_progress:     { title: 'On the trip', sub: 'Heading to your destination' },
    completed:       { title: 'Arrived', sub: 'Thanks for riding with AngkorGo' },
    cancelled:       { title: 'Cancelled', sub: 'This trip was cancelled' },
    expired:         { title: 'No driver available', sub: 'Please try again' },
    no_drivers:      { title: 'No drivers nearby', sub: 'Please try again in a moment' },
  },
  km: {
    requested:       { title: 'កំពុងស្នើសុំ…', sub: 'កំពុងបង្កើតដំណើររបស់អ្នក' },
    searching:       { title: 'កំពុងស្វែងរកអ្នកបើកបរ…', sub: 'កំពុងផ្គូផ្គងអ្នកជាមួយអ្នកបើកបរនៅជិតបំផុត' },
    matched:         { title: 'រកឃើញអ្នកបើកបរ!', sub: 'អ្នកបើកបររបស់អ្នកកំពុងរៀបចំ' },
    driver_arriving: { title: 'អ្នកបើកបរកំពុងមក', sub: 'ជួបគ្នានៅចំណុចទទួល' },
    driver_arrived:  { title: 'អ្នកបើកបរបានមកដល់', sub: 'ជិះរបស់អ្នកកំពុងរង់ចាំ' },
    in_progress:     { title: 'កំពុងធ្វើដំណើរ', sub: 'កំពុងទៅកាន់គោលដៅរបស់អ្នក' },
    completed:       { title: 'បានមកដល់', sub: 'អរគុណដែលបានជិះជាមួយ AngkorGo' },
    cancelled:       { title: 'បានលុបចោល', sub: 'ដំណើរនេះត្រូវបានលុបចោល' },
    expired:         { title: 'គ្មានអ្នកបើកបរ', sub: 'សូមព្យាយាមម្តងទៀត' },
    no_drivers:      { title: 'គ្មានអ្នកបើកបរនៅជិត', sub: 'សូមព្យាយាមម្តងទៀតបន្តិចទៀត' },
  },
  zh: {
    requested:       { title: '正在请求…', sub: '正在创建您的行程' },
    searching:       { title: '正在寻找司机…', sub: '正在为您匹配最近的司机' },
    matched:         { title: '已找到司机！', sub: '您的司机正在准备中' },
    driver_arriving: { title: '司机正在前往', sub: '请在上车点会合' },
    driver_arrived:  { title: '司机已到达', sub: '您的车已在等候' },
    in_progress:     { title: '行程进行中', sub: '正在前往您的目的地' },
    completed:       { title: '已到达', sub: '感谢您乘坐 AngkorGo' },
    cancelled:       { title: '已取消', sub: '此行程已被取消' },
    expired:         { title: '暂无可用司机', sub: '请重试' },
    no_drivers:      { title: '附近没有司机', sub: '请稍后重试' },
  },
};

const TO_PICKUP: TripStatus[] = ['matched', 'driver_arriving', 'driver_arrived'];

interface Driver { driver_name: string | null; rating: number; vehicle_class: VehicleClass; plate_number: string; color: string | null }

const L: Record<Language, Record<string, string>> = {
  en: { cancel: 'Cancel', backHome: 'Back to home', yourDriver: 'Your driver', cancelRide: 'Cancel ride?', keepWaiting: 'Keep waiting' },
  km: { cancel: 'បោះបង់', backHome: 'ត្រឡប់ទៅទំព័រដើម', yourDriver: 'អ្នកបើកបររបស់អ្នក', cancelRide: 'បោះបង់​ដំណើរ?', keepWaiting: 'រង់ចាំ​បន្ត' },
  zh: { cancel: '取消', backHome: '返回首页', yourDriver: '您的司机', cancelRide: '取消行程？', keepWaiting: '继续等待' },
};

export default function RideStatus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLocale();
  const [status, setStatus] = useState<TripStatus>('searching');
  const [driverId, setDriverId] = useState<string | null>(null);
  const [pickup, setPickup] = useState<Coords | null>(null);
  const [dropoff, setDropoff] = useState<Coords | null>(null);
  const [destAddr, setDestAddr] = useState('');
  const [fare, setFare] = useState<number | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);

  const tracking = TO_PICKUP.includes(status) || status === 'in_progress';
  const driverCoords = useProviderLocation(tracking ? driverId : null);
  const payment = useTripPayment(id);

  async function load() {
    const { data } = await supabase.rpc('get_trip', { p_trip_id: id });
    const r = Array.isArray(data) ? data[0] : data;
    if (!r) return;
    setStatus(r.status);
    setDriverId(r.driver_id);
    setFare(r.est_fare);
    setDestAddr(r.dropoff_address ?? '');
    if (r.pickup_lat != null) setPickup({ lat: r.pickup_lat, lng: r.pickup_lng });
    if (r.dropoff_lat != null) setDropoff({ lat: r.dropoff_lat, lng: r.dropoff_lng });
    if (r.driver_id && !driver) {
      const { data: d } = await supabase.rpc('get_trip_driver', { p_trip_id: id });
      const dr = Array.isArray(d) ? d[0] : d;
      if (dr) setDriver(dr);
    }
  }

  useEffect(() => {
    if (!id) return;
    load();
    const channel = supabase
      .channel(`trip:${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function cancel() {
    await supabase.from('trips').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', id);
    router.replace('/(customer)');
  }

  const copy = COPY[lang][status] ?? COPY.en[status] ?? COPY[lang].searching ?? COPY.en.searching!;
  const searching = status === 'searching' || status === 'requested';
  const terminal = status === 'completed' || status === 'cancelled' || status === 'expired' || status === 'no_drivers';
  const target = status === 'in_progress' ? dropoff : pickup;

  // Live tracking layout.
  if (tracking && target) {
    return (
      <View style={styles.container}>
        <TrackingMap customer={target} provider={driverCoords} />
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>{copy.title}</Text>
          <Text style={styles.bannerSub}>{copy.sub}{status === 'in_progress' && destAddr ? ` · ${destAddr}` : ''}</Text>
          {driver && (
            <View style={styles.driverCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{driver.driver_name ?? L[lang].yourDriver} · ⭐ {Number(driver.rating).toFixed(1)}</Text>
                <Text style={styles.driverVeh}>
                  {VEHICLE_LABELS[lang][driver.vehicle_class]} · {driver.plate_number}{driver.color ? ` · ${driver.color}` : ''}
                </Text>
              </View>
              <Text style={styles.driverFare}>${Number(fare ?? 0).toFixed(2)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Searching / terminal layout.
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        {searching && <ActivityIndicator size="large" color="#00B14F" style={{ marginBottom: 24 }} />}
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
      </View>
      {searching && (
        <Pressable style={styles.cancel} onPress={() => Alert.alert(L[lang].cancelRide, '', [
          { text: L[lang].keepWaiting, style: 'cancel' },
          { text: L[lang].cancel, style: 'destructive', onPress: cancel },
        ])}>
          <Text style={styles.cancelText}>{L[lang].cancel}</Text>
        </Pressable>
      )}
      {status === 'completed' && payment && payment.status !== 'released' && (
        <PaymentSheet payment={payment} />
      )}

      {terminal && !(status === 'completed' && payment && payment.status !== 'released') && (
        <Pressable style={styles.primary} onPress={() => router.replace('/(customer)')}>
          <Text style={styles.primaryText}>{L[lang].backHome}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  sub: { color: '#7A7A7A', fontSize: 15, textAlign: 'center', marginTop: 8 },
  cancel: { padding: 16, alignItems: 'center' },
  cancelText: { color: '#E5484D', fontWeight: '600' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  banner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#F5F6F7', padding: 24, paddingBottom: 40,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  bannerTitle: { color: '#1C1C1C', fontSize: 20, fontWeight: '800' },
  bannerSub: { color: '#7A7A7A', fontSize: 14, marginTop: 4 },
  driverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#ECECEC' },
  driverName: { color: '#1C1C1C', fontSize: 15, fontWeight: '700' },
  driverVeh: { color: '#7A7A7A', fontSize: 13, marginTop: 2 },
  driverFare: { color: '#00B14F', fontSize: 16, fontWeight: '800' },
});
