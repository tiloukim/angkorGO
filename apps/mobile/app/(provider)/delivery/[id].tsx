// Courier active delivery — pickup → delivering → delivered (+ GPS broadcast, nav).
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast';

type OrderStatus = 'courier_assigned' | 'picked_up' | 'delivering' | 'delivered';
const ACTIVE = ['courier_assigned', 'picked_up', 'delivering'];

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  courier_assigned: { to: 'picked_up',  label: 'Picked up food' },
  picked_up:        { to: 'delivering', label: 'Start delivery' },
  delivering:       { to: 'delivered',  label: 'Delivered' },
};

export default function Delivery() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>('courier_assigned');
  const [order, setOrder] = useState<any>(null);

  useLocationBroadcast(ACTIVE.includes(status));

  async function load() {
    const { data } = await supabase.from('orders')
      .select('status, delivery_address, delivery_fee, total, restaurants(name, address, lat, lng)')
      .eq('id', id).single();
    if (data) { setStatus(data.status as OrderStatus); setOrder(data); }
  }

  useEffect(() => {
    if (!id) return;
    load();
    const channel = supabase.channel(`delivery:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (p) => setStatus((p.new as { status: OrderStatus }).status))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function advance() {
    const step = NEXT[status];
    if (!step) return;
    const { error } = await supabase.rpc('advance_order', { p_order: id, p_to: step.to });
    if (error) return Alert.alert('Update failed', error.message);
    if (step.to === 'delivered') { Alert.alert('Delivered', `Delivery fee $${Number(order?.delivery_fee ?? 0).toFixed(2)} added to your wallet.`); router.replace('/(provider)'); }
  }

  function navigate() {
    const toPickup = status === 'courier_assigned';
    const dest = toPickup && order?.restaurants
      ? `${order.restaurants.lat},${order.restaurants.lng}`
      : encodeURIComponent(order?.delivery_address ?? '');
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
  }

  const step = NEXT[status];
  const toPickup = status === 'courier_assigned';

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status.replace('_', ' ').toUpperCase()}</Text>
      <Text style={styles.label}>{toPickup ? 'Pick up from' : 'Deliver to'}</Text>
      <Text style={styles.addr}>{toPickup ? order?.restaurants?.name : order?.delivery_address}</Text>
      {order?.delivery_fee != null && <Text style={styles.fee}>Delivery fee ${Number(order.delivery_fee).toFixed(2)}</Text>}

      <View style={styles.actions}>
        <Pressable style={styles.nav} onPress={navigate}><Text style={styles.navText}>Navigate ↗</Text></Pressable>
        {step && <Pressable style={styles.primary} onPress={advance}><Text style={styles.primaryText}>{step.label}</Text></Pressable>}
        <Pressable style={styles.back} onPress={() => router.replace('/(provider)')}><Text style={styles.backText}>Back to dashboard</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, paddingTop: 80 },
  status: { color: '#F04438', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  label: { color: '#8FA3BF', fontSize: 13, marginTop: 16 },
  addr: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 4 },
  fee: { color: '#10B981', fontSize: 16, fontWeight: '800', marginTop: 12 },
  actions: { marginTop: 'auto', gap: 10 },
  nav: { backgroundColor: '#151E30', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1F2A40' },
  navText: { color: '#fff', fontWeight: '700' },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#8FA3BF', fontWeight: '600' },
});
