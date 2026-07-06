// Ride — live trip. Searching → "finding a driver"; matched → tracking map with
// the driver approaching (then the in-trip leg to the dropoff) + a driver card.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TripStatus, VehicleClass } from '@angkorgo/shared';
import { VEHICLE_LABELS } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useProviderLocation } from '@/hooks/useProviderLocation';
import { useTripPayment } from '@/hooks/usePayment';
import { TrackingMap } from '@/components/TrackingMap';
import { PaymentSheet } from '@/components/PaymentSheet';
import type { Coords } from '@/lib/location';

const COPY: Partial<Record<TripStatus, { title: string; sub: string }>> = {
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
};

const TO_PICKUP: TripStatus[] = ['matched', 'driver_arriving', 'driver_arrived'];

interface Driver { driver_name: string | null; rating: number; vehicle_class: VehicleClass; plate_number: string; color: string | null }

export default function RideStatus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

  const copy = COPY[status] ?? COPY.searching!;
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
                <Text style={styles.driverName}>{driver.driver_name ?? 'Your driver'} · ⭐ {Number(driver.rating).toFixed(1)}</Text>
                <Text style={styles.driverVeh}>
                  {VEHICLE_LABELS.en[driver.vehicle_class]} · {driver.plate_number}{driver.color ? ` · ${driver.color}` : ''}
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
        {searching && <ActivityIndicator size="large" color="#F04438" style={{ marginBottom: 24 }} />}
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
      </View>
      {searching && (
        <Pressable style={styles.cancel} onPress={() => Alert.alert('Cancel ride?', '', [
          { text: 'Keep waiting', style: 'cancel' },
          { text: 'Cancel', style: 'destructive', onPress: cancel },
        ])}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      )}
      {status === 'completed' && payment && payment.status !== 'released' && (
        <PaymentSheet payment={payment} />
      )}

      {terminal && !(status === 'completed' && payment && payment.status !== 'released') && (
        <Pressable style={styles.primary} onPress={() => router.replace('/(customer)')}>
          <Text style={styles.primaryText}>Back to home</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  sub: { color: '#8FA3BF', fontSize: 15, textAlign: 'center', marginTop: 8 },
  cancel: { padding: 16, alignItems: 'center' },
  cancelText: { color: '#F04438', fontWeight: '600' },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  banner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0B1220', padding: 24, paddingBottom: 40,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bannerSub: { color: '#8FA3BF', fontSize: 14, marginTop: 4 },
  driverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#151E30', borderRadius: 12, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#1F2A40' },
  driverName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  driverVeh: { color: '#8FA3BF', fontSize: 13, marginTop: 2 },
  driverFare: { color: '#10B981', fontSize: 16, fontWeight: '800' },
});
