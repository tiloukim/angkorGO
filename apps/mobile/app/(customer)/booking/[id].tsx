// Generic booking status + payment — shared by Vehicle Rental and Stay.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { BookingStatus } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useBookingPayment } from '@/hooks/usePayment';
import { PaymentSheet } from '@/components/PaymentSheet';

const COPY: Partial<Record<BookingStatus, { title: string; sub: string }>> = {
  requested:   { title: 'Request sent', sub: 'Waiting for the host to confirm' },
  confirmed:   { title: 'Confirmed!', sub: 'Complete payment to lock in your booking' },
  declined:    { title: 'Declined', sub: 'The host declined this request' },
  cancelled:   { title: 'Cancelled', sub: 'This booking was cancelled' },
  in_progress: { title: 'Booking active', sub: 'Enjoy your stay' },
  completed:   { title: 'Completed', sub: 'Thanks for booking with AngkorGo' },
};

export default function BookingStatus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<BookingStatus>('requested');
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const payment = useBookingPayment(id);

  async function load() {
    const { data } = await supabase.from('bookings').select('status, total_amount').eq('id', id).single();
    if (data) { setStatus(data.status as BookingStatus); setTotal(Number(data.total_amount)); }
    setLoading(false);
  }

  useEffect(() => {
    if (!id) return;
    load();
    const channel = supabase.channel(`booking:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (loading) return <View style={styles.container}><ActivityIndicator color="#00B14F" style={{ marginTop: 80 }} /></View>;

  const copy = COPY[status] ?? COPY.requested!;
  const needsPay = (status === 'confirmed' || status === 'in_progress') && payment && payment.status !== 'released';

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
        {total != null && <Text style={styles.total}>${total.toFixed(2)}</Text>}
      </View>

      {needsPay && <PaymentSheet payment={payment!} />}
      {!needsPay && (
        <Pressable style={styles.primary} onPress={() => router.replace('/(customer)')}>
          <Text style={styles.primaryText}>Back to home</Text>
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
  total: { color: '#00B14F', fontSize: 32, fontWeight: '800', marginTop: 16 },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
});
