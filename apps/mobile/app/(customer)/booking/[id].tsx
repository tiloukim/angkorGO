// Generic booking status + payment — shared by Vehicle Rental and Stay.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { BookingStatus, Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { useBookingPayment } from '@/hooks/usePayment';
import { PaymentSheet } from '@/components/PaymentSheet';

const COPY: Record<Language, Partial<Record<BookingStatus, { title: string; sub: string }>>> = {
  en: {
    requested:   { title: 'Request sent', sub: 'Waiting for the host to confirm' },
    confirmed:   { title: 'Confirmed!', sub: 'Complete payment to lock in your booking' },
    declined:    { title: 'Declined', sub: 'The host declined this request' },
    cancelled:   { title: 'Cancelled', sub: 'This booking was cancelled' },
    in_progress: { title: 'Booking active', sub: 'Enjoy your stay' },
    completed:   { title: 'Completed', sub: 'Thanks for booking with AngkorGo' },
  },
  km: {
    requested:   { title: 'បានផ្ញើសំណើ', sub: 'កំពុងរង់ចាំម្ចាស់ផ្ទះបញ្ជាក់' },
    confirmed:   { title: 'បានបញ្ជាក់!', sub: 'បំពេញការទូទាត់ដើម្បីចាក់សោការកក់របស់អ្នក' },
    declined:    { title: 'បានបដិសេធ', sub: 'ម្ចាស់ផ្ទះបានបដិសេធសំណើនេះ' },
    cancelled:   { title: 'បានលុបចោល', sub: 'ការកក់នេះត្រូវបានលុបចោល' },
    in_progress: { title: 'ការកក់កំពុងដំណើរការ', sub: 'សូមរីករាយនឹងការស្នាក់នៅ' },
    completed:   { title: 'បានបញ្ចប់', sub: 'សូមអរគុណដែលបានកក់ជាមួយ AngkorGo' },
  },
  zh: {
    requested:   { title: '请求已发送', sub: '等待房东确认' },
    confirmed:   { title: '已确认！', sub: '完成付款以锁定您的预订' },
    declined:    { title: '已拒绝', sub: '房东拒绝了此请求' },
    cancelled:   { title: '已取消', sub: '此预订已取消' },
    in_progress: { title: '预订进行中', sub: '祝您入住愉快' },
    completed:   { title: '已完成', sub: '感谢您通过 AngkorGo 预订' },
  },
};

const L: Record<Language, Record<string, string>> = {
  en: { backHome: 'Back to home', cancelBooking: 'Cancel booking', cancelBookingQ: 'Cancel this booking?', keepBooking: 'Keep booking' },
  km: { backHome: 'ត្រឡប់ទៅទំព័រដើម', cancelBooking: 'បោះបង់ការកក់', cancelBookingQ: 'បោះបង់ការកក់នេះ?', keepBooking: 'រក្សាការកក់' },
  zh: { backHome: '返回首页', cancelBooking: '取消预订', cancelBookingQ: '取消此预订？', keepBooking: '保留预订' },
};

export default function BookingStatus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLocale();
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

  const copy = COPY[lang][status] ?? COPY.en[status] ?? COPY.en.requested!;
  const needsPay = (status === 'confirmed' || status === 'in_progress') && payment && payment.status !== 'released';
  const canCancel = status === 'requested' || status === 'confirmed';

  function confirmCancel() {
    Alert.alert(L[lang].cancelBookingQ, '', [
      { text: L[lang].keepBooking, style: 'cancel' },
      { text: L[lang].cancelBooking, style: 'destructive', onPress: async () => {
          const { error } = await supabase.rpc('cancel_booking', { p_booking: id, p_reason: 'guest_cancelled' });
          if (error) Alert.alert(error.message);
        } },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
        {total != null && <Text style={styles.total}>${total.toFixed(2)}</Text>}
      </View>

      {needsPay && <PaymentSheet payment={payment!} />}
      {canCancel && (
        <Pressable style={styles.cancel} onPress={confirmCancel}>
          <Text style={styles.cancelText}>{L[lang].cancelBooking}</Text>
        </Pressable>
      )}
      {!needsPay && (
        <Pressable style={styles.primary} onPress={() => router.replace('/(customer)')}>
          <Text style={styles.primaryText}>{L[lang].backHome}</Text>
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
  cancel: { padding: 16, alignItems: 'center' },
  cancelText: { color: '#E5484D', fontWeight: '600' },
});
