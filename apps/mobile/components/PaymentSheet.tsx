// Customer payment sheet — shows the invoice, method picker, and pays.
// Pending → pick method → create-payment (QR/intent) → gateway → webhook flips
// the row to held/released via Realtime, so this sheet reacts automatically.
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { PAYMENT_METHODS, type PaymentMethod, type Payment } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';

export function PaymentSheet({ payment }: { payment: Payment }) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  async function pay(m: PaymentMethod) {
    setMethod(m);
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { payment_id: payment.id, method: m },
      });
      if (error) throw error;
      if (m === 'cash') {
        Alert.alert('Cash selected', 'Pay the provider directly. They will confirm completion.');
      } else if (data?.qr) {
        setQr(data.qr); // render as a QR for the customer to scan/confirm
      }
    } catch (e: any) {
      Alert.alert('Payment error', e.message ?? 'Try again');
    } finally {
      setBusy(false);
    }
  }

  if (payment.status === 'held') {
    return (
      <View style={styles.sheet}>
        <Text style={styles.title}>Payment received</Text>
        <Text style={styles.sub}>Confirm the work is complete to release payment.</Text>
        <Pressable style={styles.primary} onPress={() => supabase.rpc('release_payment', { p_payment_id: payment.id })}>
          <Text style={styles.primaryText}>Confirm & release</Text>
        </Pressable>
      </View>
    );
  }

  if (payment.status === 'released') {
    return (
      <View style={styles.sheet}>
        <Text style={styles.title}>Paid ✓</Text>
        <Text style={styles.sub}>${Number(payment.amount).toFixed(2)} {payment.currency}</Text>
      </View>
    );
  }

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>Invoice</Text>
      <Text style={styles.amount}>${Number(payment.amount).toFixed(2)} {payment.currency}</Text>

      {qr ? (
        <View style={styles.qrBox}>
          <Text style={styles.qrText}>{qr}</Text>
          <Text style={styles.qrHint}>Scan with {PAYMENT_METHODS.find((p) => p.method === method)?.label} to pay</Text>
        </View>
      ) : (
        <View style={styles.methods}>
          {PAYMENT_METHODS.map((p) => (
            <Pressable key={p.method} style={styles.method} onPress={() => pay(p.method)} disabled={busy}>
              <Text style={styles.methodText}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {busy && <ActivityIndicator color="#F04438" style={{ marginTop: 12 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#0B1220', padding: 24, paddingBottom: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sub: { color: '#8FA3BF', fontSize: 14, marginTop: 6 },
  amount: { color: '#10B981', fontSize: 32, fontWeight: '800', marginVertical: 12 },
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  method: { backgroundColor: '#151E30', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, borderWidth: 1, borderColor: '#1F2A40' },
  methodText: { color: '#fff', fontWeight: '700' },
  primary: { backgroundColor: '#10B981', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  primaryText: { color: '#fff', fontWeight: '700' },
  qrBox: { backgroundColor: '#151E30', borderRadius: 12, padding: 24, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#1F2A40' },
  qrText: { color: '#fff', fontSize: 11, textAlign: 'center' },
  qrHint: { color: '#8FA3BF', fontSize: 13, marginTop: 12 },
});
