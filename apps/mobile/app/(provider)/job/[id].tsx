// Active job screen — provider advances the request through its lifecycle.
// (Phase 5 adds navigation + live location broadcast; Phase 6 adds the invoice.)
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { RequestStatus, Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast';
import { usePayment } from '@/hooks/usePayment';
import { useLocale } from '@/lib/locale';

const ACTIVE: RequestStatus[] = ['accepted', 'en_route', 'arrived', 'in_progress'];

// Forward transitions the provider drives up to in_progress. Completion happens
// via the invoice → customer payment → release flow, not a manual button.
const NEXT: Partial<Record<RequestStatus, { to: RequestStatus }>> = {
  accepted:    { to: 'en_route' },
  en_route:    { to: 'arrived' },
  arrived:     { to: 'in_progress' },
};

// Trilingual copy for the provider's next-action button, keyed by current status.
const STEP_LABEL: Record<Language, Partial<Record<RequestStatus, string>>> = {
  en: { accepted: 'Start driving', en_route: "I've arrived", arrived: 'Start work' },
  km: { accepted: 'ចាប់ផ្តើមបើកបរ', en_route: 'ខ្ញុំបានមកដល់', arrived: 'ចាប់ផ្តើមការងារ' },
  zh: { accepted: '开始前往', en_route: '我已到达', arrived: '开始工作' },
};

// Trilingual copy for the invoice/payment status line, keyed by payment status.
const PAY_STATUS: Record<Language, Record<string, string>> = {
  en: {
    pending:  'Awaiting customer payment…',
    held:     'Paid — awaiting release',
    released: 'Released · you earn',
  },
  km: {
    pending:  'កំពុងរង់ចាំការទូទាត់ពីអតិថិជន…',
    held:     'បានទូទាត់ — កំពុងរង់ចាំដោះលែង',
    released: 'បានដោះលែង · អ្នកទទួលបាន',
  },
  zh: {
    pending:  '等待客户付款…',
    held:     '已付款 — 等待放款',
    released: '已放款 · 您获得',
  },
};

const L: Record<Language, Record<string, string>> = {
  en: { customerLocation: 'Customer location', invoice: 'Invoice', amount: 'Amount (USD)', sendInvoice: 'Send invoice', back: 'Back to dashboard' },
  km: { customerLocation: 'ទីតាំងអតិថិជន', invoice: 'វិក្កយបត្រ', amount: 'ចំនួនទឹកប្រាក់ (USD)', sendInvoice: 'ផ្ញើវិក្កយបត្រ', back: 'ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង' },
  zh: { customerLocation: '客户位置', invoice: '发票', amount: '金额 (USD)', sendInvoice: '发送发票', back: '返回仪表板' },
};

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLocale();
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
      <Text style={styles.address}>{address || L[lang].customerLocation}</Text>

      <View style={styles.actions}>
        {step && (
          <Pressable style={styles.primary} onPress={advance}>
            <Text style={styles.primaryText}>{(STEP_LABEL[lang] ?? STEP_LABEL.en)[status] ?? STEP_LABEL.en[status]}</Text>
          </Pressable>
        )}

        {invoicing && (
          payment ? (
            <View style={styles.invoiceCard}>
              <Text style={styles.invoiceLabel}>{L[lang].invoice} ${Number(payment.amount).toFixed(2)}</Text>
              <Text style={styles.invoiceStatus}>
                {payment.status === 'pending' && (PAY_STATUS[lang] ?? PAY_STATUS.en).pending}
                {payment.status === 'held' && (PAY_STATUS[lang] ?? PAY_STATUS.en).held}
                {payment.status === 'released' && `${(PAY_STATUS[lang] ?? PAY_STATUS.en).released} $${Number(payment.provider_amount).toFixed(2)}`}
              </Text>
            </View>
          ) : (
            <View style={styles.invoiceForm}>
              <TextInput
                style={styles.input} placeholder={L[lang].amount} placeholderTextColor="#9AA0A6"
                keyboardType="decimal-pad" value={amount} onChangeText={setAmount}
              />
              <Pressable style={styles.primary} onPress={sendInvoice}>
                <Text style={styles.primaryText}>{L[lang].sendInvoice}</Text>
              </Pressable>
            </View>
          )
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
  address: { color: '#1C1C1C', fontSize: 22, fontWeight: '700', marginTop: 8 },
  actions: { marginTop: 'auto' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { padding: 16, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
  invoiceForm: { gap: 10, marginTop: 12 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, color: '#1C1C1C', fontSize: 18, borderWidth: 1, borderColor: '#ECECEC' },
  invoiceCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#ECECEC' },
  invoiceLabel: { color: '#1C1C1C', fontSize: 18, fontWeight: '700' },
  invoiceStatus: { color: '#7A7A7A', fontSize: 14, marginTop: 4 },
});
