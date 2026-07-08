// Customer payment sheet — shows the invoice, method picker, and pays.
// Pending → pick method → create-payment (QR/intent) → gateway → webhook flips
// the row to held/released via Realtime, so this sheet reacts automatically.
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { PAYMENT_METHODS, type PaymentMethod, type Payment, type Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';

const L: Record<Language, Record<string, string>> = {
  en: {
    paymentReceived: 'Payment received',
    releaseHint: 'Confirm the work is complete to release payment.',
    confirmRelease: 'Confirm & release',
    paid: 'Paid',
    invoice: 'Invoice',
    scanPrefix: 'Scan with ',
    scanSuffix: ' to pay',
    cashSelected: 'Cash selected',
    cashBody: 'Pay the provider directly. They will confirm completion.',
    paymentError: 'Payment error',
    tryAgain: 'Try again',
    simulatePay: '✓ Simulate payment (sandbox)',
  },
  km: {
    paymentReceived: 'បានទទួលការបង់ប្រាក់',
    releaseHint: 'បញ្ជាក់ថាការងារបានបញ្ចប់ ដើម្បីដោះលែងការបង់ប្រាក់។',
    confirmRelease: 'បញ្ជាក់ និងដោះលែង',
    paid: 'បានបង់',
    invoice: 'វិក្កយបត្រ',
    scanPrefix: 'ស្កេនជាមួយ ',
    scanSuffix: ' ដើម្បីបង់ប្រាក់',
    cashSelected: 'បានជ្រើសសាច់ប្រាក់',
    cashBody: 'បង់ប្រាក់ដោយផ្ទាល់ទៅអ្នកផ្តល់សេវា។ ពួកគេនឹងបញ្ជាក់ការបញ្ចប់។',
    paymentError: 'កំហុសក្នុងការបង់ប្រាក់',
    tryAgain: 'ព្យាយាមម្តងទៀត',
    simulatePay: '✓ ក្លែងធ្វើការបង់ប្រាក់ (សាកល្បង)',
  },
  zh: {
    paymentReceived: '已收到付款',
    releaseHint: '确认工作已完成以释放付款。',
    confirmRelease: '确认并释放',
    paid: '已支付',
    invoice: '账单',
    scanPrefix: '使用 ',
    scanSuffix: ' 扫描支付',
    cashSelected: '已选择现金',
    cashBody: '直接向服务提供者付款。他们将确认完成。',
    paymentError: '付款错误',
    tryAgain: '请重试',
    simulatePay: '✓ 模拟付款（沙盒）',
  },
};

// Sandbox mode shows a "simulate payment" button (no real gateway wired yet).
// Set EXPO_PUBLIC_PAYMENTS_SANDBOX=false once ABA PayWay / Bakong is live.
const PAYMENTS_SANDBOX = (process.env.EXPO_PUBLIC_PAYMENTS_SANDBOX ?? 'true') !== 'false';

export function PaymentSheet({ payment }: { payment: Payment }) {
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
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
        Alert.alert(t.cashSelected, t.cashBody);
      } else if (data?.qr) {
        setQr(data.qr); // render as a QR for the customer to scan/confirm
      }
    } catch (e: any) {
      Alert.alert(t.paymentError, e.message ?? t.tryAgain);
    } finally {
      setBusy(false);
    }
  }

  // Sandbox: simulate the gateway callback (what ABA PayWay / Bakong will POST
  // to payment-webhook once live). Confirms + releases → wallet credited.
  async function simulatePaid() {
    setBusy(true);
    const { error } = await supabase.functions.invoke('payment-webhook', {
      body: { payment_id: payment.id, method: method ?? 'khqr', status: 'paid' },
    });
    setBusy(false);
    if (error) Alert.alert(t.paymentError, error.message);
    // Realtime flips the sheet to Paid ✓ automatically.
  }

  if (payment.status === 'held') {
    return (
      <View style={styles.sheet}>
        <Text style={styles.title}>{t.paymentReceived}</Text>
        <Text style={styles.sub}>{t.releaseHint}</Text>
        <Pressable style={styles.primary} disabled={busy} onPress={async () => {
          setBusy(true);
          const { error } = await supabase.rpc('release_payment', { p_payment_id: payment.id });
          setBusy(false);
          if (error) Alert.alert(t.paymentError, error.message);
          // Realtime flips the sheet to Paid ✓ on success.
        }}>
          <Text style={styles.primaryText}>{t.confirmRelease}</Text>
        </Pressable>
      </View>
    );
  }

  if (payment.status === 'released') {
    return (
      <View style={styles.sheet}>
        <Text style={styles.title}>{t.paid} ✓</Text>
        <Text style={styles.sub}>${Number(payment.amount).toFixed(2)} {payment.currency}</Text>
      </View>
    );
  }

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>{t.invoice}</Text>
      <Text style={styles.amount}>${Number(payment.amount).toFixed(2)} {payment.currency}</Text>

      {qr ? (
        <View style={styles.qrBox}>
          <Text style={styles.qrText}>{qr}</Text>
          <Text style={styles.qrHint}>{t.scanPrefix}{PAYMENT_METHODS.find((p) => p.method === method)?.label}{t.scanSuffix}</Text>
          {PAYMENTS_SANDBOX && (
            <Pressable style={styles.sandbox} onPress={simulatePaid} disabled={busy}>
              <Text style={styles.sandboxText}>{t.simulatePay}</Text>
            </Pressable>
          )}
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
      {busy && <ActivityIndicator color="#00B14F" style={{ marginTop: 12 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#FFFFFF', padding: 24, paddingBottom: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  title: { color: '#1C1C1C', fontSize: 20, fontWeight: '800' },
  sub: { color: '#7A7A7A', fontSize: 14, marginTop: 6 },
  amount: { color: '#00B14F', fontSize: 32, fontWeight: '800', marginVertical: 12 },
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  method: { backgroundColor: '#F5F6F7', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, borderWidth: 1, borderColor: '#ECECEC' },
  methodText: { color: '#1C1C1C', fontWeight: '700' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  primaryText: { color: '#fff', fontWeight: '700' },
  qrBox: { backgroundColor: '#F5F6F7', borderRadius: 12, padding: 24, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#ECECEC' },
  qrText: { color: '#1C1C1C', fontSize: 11, textAlign: 'center' },
  qrHint: { color: '#7A7A7A', fontSize: 13, marginTop: 12 },
  sandbox: { marginTop: 16, backgroundColor: '#00B14F', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20 },
  sandboxText: { color: '#fff', fontWeight: '800' },
});
