// Active job screen — provider advances the request through its lifecycle.
// (Phase 5 adds navigation + live location broadcast; Phase 6 adds the invoice.)
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { RequestStatus } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast';
import { usePayment } from '@/hooks/usePayment';

const ACTIVE: RequestStatus[] = ['accepted', 'en_route', 'arrived', 'in_progress'];

// Forward transitions the provider drives up to in_progress. Completion happens
// via the invoice → customer payment → release flow, not a manual button.
const NEXT: Partial<Record<RequestStatus, { to: RequestStatus; label: string }>> = {
  accepted:    { to: 'en_route',    label: 'Start driving' },
  en_route:    { to: 'arrived',     label: "I've arrived" },
  arrived:     { to: 'in_progress', label: 'Start work' },
};

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<RequestStatus>('accepted');
  const [address, setAddress] = useState<string>('');
  const [amount, setAmount] = useState('');
  const payment = usePayment(id);

  // Broadcast GPS every ~5s while the job is active (customer tracks this).
  useLocationBroadcast(ACTIVE.includes(status));

  useEffect(() => {
    if (!id) return;
    supabase.rpc('get_request', { p_request_id: id }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) { setStatus(row.status); setAddress(row.address ?? ''); }
    });

    const channel = supabase
      .channel(`job:${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `id=eq.${id}` },
        (p) => setStatus((p.new as { status: RequestStatus }).status))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function advance() {
    const step = NEXT[status];
    if (!step) return;
    const { error } = await supabase.from('service_requests').update({ status: step.to }).eq('id', id);
    if (error) return Alert.alert('Update failed', error.message);
  }

  async function sendInvoice() {
    const value = Number(amount);
    if (!value || value <= 0) return Alert.alert('Enter an amount');
    const { error } = await supabase.rpc('create_invoice', {
      p_request_id: id, p_amount: value, p_currency: 'USD',
    });
    if (error) return Alert.alert('Invoice failed', error.message);
    Alert.alert('Invoice sent', 'Waiting for the customer to pay.');
  }

  const step = NEXT[status];
  const invoicing = status === 'in_progress';

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status.replace('_', ' ').toUpperCase()}</Text>
      <Text style={styles.address}>{address || 'Customer location'}</Text>

      <View style={styles.actions}>
        {step && (
          <Pressable style={styles.primary} onPress={advance}>
            <Text style={styles.primaryText}>{step.label}</Text>
          </Pressable>
        )}

        {invoicing && (
          payment ? (
            <View style={styles.invoiceCard}>
              <Text style={styles.invoiceLabel}>Invoice ${Number(payment.amount).toFixed(2)}</Text>
              <Text style={styles.invoiceStatus}>
                {payment.status === 'pending' && 'Awaiting customer payment…'}
                {payment.status === 'held' && 'Paid — awaiting release'}
                {payment.status === 'released' && `Released · you earn $${Number(payment.provider_amount).toFixed(2)}`}
              </Text>
            </View>
          ) : (
            <View style={styles.invoiceForm}>
              <TextInput
                style={styles.input} placeholder="Amount (USD)" placeholderTextColor="#5B6B84"
                keyboardType="decimal-pad" value={amount} onChangeText={setAmount}
              />
              <Pressable style={styles.primary} onPress={sendInvoice}>
                <Text style={styles.primaryText}>Send invoice</Text>
              </Pressable>
            </View>
          )
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
  address: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 8 },
  actions: { marginTop: 'auto' },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { padding: 16, alignItems: 'center' },
  backText: { color: '#8FA3BF', fontWeight: '600' },
  invoiceForm: { gap: 10, marginTop: 12 },
  input: { backgroundColor: '#151E30', borderRadius: 12, padding: 16, color: '#fff', fontSize: 18, borderWidth: 1, borderColor: '#1F2A40' },
  invoiceCard: { backgroundColor: '#151E30', borderRadius: 12, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#1F2A40' },
  invoiceLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },
  invoiceStatus: { color: '#8FA3BF', fontSize: 14, marginTop: 4 },
});
