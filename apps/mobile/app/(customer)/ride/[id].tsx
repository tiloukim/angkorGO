// Ride — trip status. R3: shows "finding a driver" (searching). Driver matching
// is R4; live tracking to pickup + in-trip is R5 — this screen extends then.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TripStatus } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';

const COPY: Partial<Record<TripStatus, { title: string; sub: string }>> = {
  requested:       { title: 'Requesting…', sub: 'Creating your trip' },
  searching:       { title: 'Finding a driver…', sub: 'Matching you with the nearest driver' },
  matched:         { title: 'Driver found!', sub: 'Your driver is getting ready' },
  driver_arriving: { title: 'Driver on the way', sub: 'Meet at your pickup point' },
  driver_arrived:  { title: 'Driver has arrived', sub: 'Your ride is waiting' },
  in_progress:     { title: 'On the trip', sub: 'Enjoy your ride' },
  completed:       { title: 'Arrived', sub: 'Thanks for riding with AngkorGo' },
  cancelled:       { title: 'Cancelled', sub: 'This trip was cancelled' },
  expired:         { title: 'No driver available', sub: 'Nobody accepted in time — please try again' },
  no_drivers:      { title: 'No drivers nearby', sub: 'Try again in a moment' },
};

export default function RideStatus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<TripStatus>('searching');
  const [fare, setFare] = useState<number | null>(null);
  const [dest, setDest] = useState('');

  async function load() {
    const { data } = await supabase.rpc('get_trip', { p_trip_id: id });
    const row = Array.isArray(data) ? data[0] : data;
    if (row) { setStatus(row.status); setFare(row.est_fare); setDest(row.dropoff_address ?? ''); }
  }

  useEffect(() => {
    if (!id) return;
    load();
    const channel = supabase
      .channel(`trip:${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${id}` },
        (p) => setStatus((p.new as { status: TripStatus }).status))
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

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        {searching && <ActivityIndicator size="large" color="#F04438" style={{ marginBottom: 24 }} />}
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
        {dest ? <Text style={styles.meta}>To {dest}{fare != null ? ` · $${Number(fare).toFixed(2)}` : ''}</Text> : null}
      </View>

      {searching && (
        <Pressable style={styles.cancel} onPress={() => Alert.alert('Cancel ride?', '', [
          { text: 'Keep waiting', style: 'cancel' },
          { text: 'Cancel', style: 'destructive', onPress: cancel },
        ])}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      )}
      {terminal && (
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
  meta: { color: '#5B6B84', fontSize: 13, marginTop: 12, textAlign: 'center' },
  cancel: { padding: 16, alignItems: 'center' },
  cancelText: { color: '#F04438', fontWeight: '600' },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
});
