// Food — order status + payment.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useOrderPayment } from '@/hooks/usePayment';
import { PaymentSheet } from '@/components/PaymentSheet';

type OrderStatus = 'placed' | 'accepted' | 'ready' | 'courier_assigned' | 'picked_up' | 'delivering' | 'delivered' | 'cancelled';

const COPY: Record<OrderStatus, { title: string; sub: string }> = {
  placed:           { title: 'Order placed', sub: 'Waiting for the restaurant to accept' },
  accepted:         { title: 'Preparing your food', sub: 'The restaurant is cooking' },
  ready:            { title: 'Finding a courier', sub: 'Your food is ready for pickup' },
  courier_assigned: { title: 'Courier assigned', sub: 'Heading to the restaurant' },
  picked_up:        { title: 'Picked up', sub: 'Your food is on the way' },
  delivering:       { title: 'Out for delivery', sub: 'Almost there' },
  delivered:        { title: 'Delivered', sub: 'Enjoy your meal! 🍜' },
  cancelled:        { title: 'Cancelled', sub: 'This order was cancelled' },
};

export default function OrderStatus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>('placed');
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const payment = useOrderPayment(id);

  async function load() {
    const { data } = await supabase.from('orders').select('status, total').eq('id', id).single();
    if (data) { setStatus(data.status as OrderStatus); setTotal(Number(data.total)); }
    setLoading(false);
  }

  useEffect(() => {
    if (!id) return;
    load();
    const channel = supabase.channel(`order:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (loading) return <View style={styles.container}><ActivityIndicator color="#F04438" style={{ marginTop: 80 }} /></View>;

  const copy = COPY[status];
  const active = !['delivered', 'cancelled'].includes(status);
  const needsPay = payment && payment.status !== 'released' && status !== 'cancelled';

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        {active && status !== 'delivered' && <ActivityIndicator size="large" color="#F04438" style={{ marginBottom: 24 }} />}
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
        {total != null && <Text style={styles.total}>${total.toFixed(2)}</Text>}
      </View>

      {needsPay && <PaymentSheet payment={payment!} />}
      {!needsPay && !active && (
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
  total: { color: '#10B981', fontSize: 30, fontWeight: '800', marginTop: 16 },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
});
