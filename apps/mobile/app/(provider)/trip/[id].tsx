// Driver active ride — advance the trip and broadcast GPS (rider tracks this).
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TripStatus } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast';

const ACTIVE: TripStatus[] = ['matched', 'driver_arriving', 'driver_arrived', 'in_progress'];

// Forward transitions the driver drives. Completion → payment/fare settle is R6.
const NEXT: Partial<Record<TripStatus, { to: TripStatus; label: string }>> = {
  matched:         { to: 'driver_arriving', label: 'Start driving to pickup' },
  driver_arriving: { to: 'driver_arrived',  label: "I've arrived at pickup" },
  driver_arrived:  { to: 'in_progress',     label: 'Start trip' },
  in_progress:     { to: 'completed',       label: 'End trip' },
};

export default function DriverTrip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
    const patch: Record<string, unknown> = { status: step.to };
    if (step.to === 'in_progress') patch.started_at = new Date().toISOString();
    if (step.to === 'completed') { patch.completed_at = new Date().toISOString(); patch.final_fare = fare; }
    const { error } = await supabase.from('trips').update(patch).eq('id', id);
    if (error) return Alert.alert('Update failed', error.message);
    if (step.to === 'completed') router.replace('/(provider)');
  }

  function navigateTo() {
    const target = status === 'in_progress' ? dropoff : pickup?.address;
    if (pickup) {
      const q = status === 'in_progress' ? encodeURIComponent(dropoff) : `${pickup.lat},${pickup.lng}`;
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${q}`);
    }
  }

  const step = NEXT[status];

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status.replace('_', ' ').toUpperCase()}</Text>
      <Text style={styles.label}>{status === 'in_progress' ? 'Drop off' : 'Pick up'}</Text>
      <Text style={styles.addr}>{status === 'in_progress' ? dropoff : pickup?.address}</Text>
      {fare != null && <Text style={styles.fare}>Fare ${Number(fare).toFixed(2)}</Text>}

      <View style={styles.actions}>
        <Pressable style={styles.nav} onPress={navigateTo}>
          <Text style={styles.navText}>Navigate ↗</Text>
        </Pressable>
        {step && (
          <Pressable style={styles.primary} onPress={advance}>
            <Text style={styles.primaryText}>{step.label}</Text>
          </Pressable>
        )}
        <Pressable style={styles.back} onPress={() => router.replace('/(provider)')}>
          <Text style={styles.backText}>Back to dashboard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, paddingTop: 80 },
  status: { color: '#F04438', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  label: { color: '#8FA3BF', fontSize: 13, marginTop: 16 },
  addr: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 4 },
  fare: { color: '#10B981', fontSize: 18, fontWeight: '800', marginTop: 12 },
  actions: { marginTop: 'auto', gap: 10 },
  nav: { backgroundColor: '#151E30', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1F2A40' },
  navText: { color: '#fff', fontWeight: '700' },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#8FA3BF', fontWeight: '600' },
});
