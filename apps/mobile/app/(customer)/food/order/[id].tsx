// Food — order status + payment.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { useOrderPayment } from '@/hooks/usePayment';
import { PaymentSheet } from '@/components/PaymentSheet';
import { RatingCard } from '@/components/RatingCard';

type OrderStatus = 'placed' | 'accepted' | 'ready' | 'courier_assigned' | 'picked_up' | 'delivering' | 'delivered' | 'cancelled';

const COPY: Record<Language, Partial<Record<OrderStatus, { title: string; sub: string }>>> = {
  en: {
    placed:           { title: 'Order placed', sub: 'Waiting for the restaurant to accept' },
    accepted:         { title: 'Preparing your food', sub: 'The restaurant is cooking' },
    ready:            { title: 'Finding a courier', sub: 'Your food is ready for pickup' },
    courier_assigned: { title: 'Courier assigned', sub: 'Heading to the restaurant' },
    picked_up:        { title: 'Picked up', sub: 'Your food is on the way' },
    delivering:       { title: 'Out for delivery', sub: 'Almost there' },
    delivered:        { title: 'Delivered', sub: 'Enjoy your meal! 🍜' },
    cancelled:        { title: 'Cancelled', sub: 'This order was cancelled' },
  },
  km: {
    placed:           { title: 'បានដាក់ការបញ្ជាទិញ', sub: 'កំពុងរង់ចាំភោជនីយដ្ឋានទទួលយក' },
    accepted:         { title: 'កំពុងរៀបចំម្ហូបរបស់អ្នក', sub: 'ភោជនីយដ្ឋានកំពុងធ្វើម្ហូប' },
    ready:            { title: 'កំពុងស្វែងរកអ្នកដឹកជញ្ជូន', sub: 'ម្ហូបរបស់អ្នករួចរាល់សម្រាប់យក' },
    courier_assigned: { title: 'បានចាត់អ្នកដឹកជញ្ជូន', sub: 'កំពុងទៅភោជនីយដ្ឋាន' },
    picked_up:        { title: 'បានយកម្ហូប', sub: 'ម្ហូបរបស់អ្នកកំពុងធ្វើដំណើរ' },
    delivering:       { title: 'កំពុងដឹកជញ្ជូន', sub: 'ជិតដល់ហើយ' },
    delivered:        { title: 'បានដឹកជញ្ជូន', sub: 'សូមរីករាយនឹងអាហារ! 🍜' },
    cancelled:        { title: 'បានលុបចោល', sub: 'ការបញ្ជាទិញនេះត្រូវបានលុបចោល' },
  },
  zh: {
    placed:           { title: '订单已下达', sub: '等待餐厅接单' },
    accepted:         { title: '正在准备您的餐点', sub: '餐厅正在烹饪' },
    ready:            { title: '正在寻找配送员', sub: '您的餐点已备好待取' },
    courier_assigned: { title: '已安排配送员', sub: '正前往餐厅' },
    picked_up:        { title: '已取餐', sub: '您的餐点正在配送中' },
    delivering:       { title: '正在配送', sub: '快到了' },
    delivered:        { title: '已送达', sub: '祝您用餐愉快！🍜' },
    cancelled:        { title: '已取消', sub: '此订单已取消' },
  },
};

const L: Record<Language, Record<string, string>> = {
  en: { backHome: 'Back to home', rateRestaurant: 'Rate the restaurant', rateCourier: 'Rate your courier', cancelOrder: 'Cancel order', cancelOrderQ: 'Cancel this order?', keepOrder: 'Keep order' },
  km: { backHome: 'ត្រឡប់ទៅទំព័រដើម', rateRestaurant: 'វាយតម្លៃភោជនីយដ្ឋាន', rateCourier: 'វាយតម្លៃអ្នកដឹកជញ្ជូន', cancelOrder: 'បោះបង់ការបញ្ជាទិញ', cancelOrderQ: 'បោះបង់ការបញ្ជាទិញនេះ?', keepOrder: 'រក្សាការបញ្ជាទិញ' },
  zh: { backHome: '返回首页', rateRestaurant: '评价餐厅', rateCourier: '评价配送员', cancelOrder: '取消订单', cancelOrderQ: '取消此订单？', keepOrder: '保留订单' },
};

export default function OrderStatus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLocale();
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

  async function submitReview(target: 'restaurant' | 'courier', rating: number, comment: string): Promise<string | null> {
    const { error } = await supabase.rpc('submit_order_review', { p_order: id, p_target: target, p_rating: rating, p_comment: comment || null });
    return error?.message ?? null;
  }

  function confirmCancel() {
    Alert.alert(L[lang].cancelOrderQ, '', [
      { text: L[lang].keepOrder, style: 'cancel' },
      { text: L[lang].cancelOrder, style: 'destructive', onPress: async () => {
          const { error } = await supabase.rpc('cancel_order', { p_order: id, p_reason: 'customer_cancelled' });
          if (error) Alert.alert(error.message);
        } },
    ]);
  }

  if (loading) return <View style={styles.container}><ActivityIndicator color="#00B14F" style={{ marginTop: 80 }} /></View>;

  const copy = COPY[lang][status] ?? COPY.en[status]!;
  const active = !['delivered', 'cancelled'].includes(status);
  const needsPay = payment && payment.status !== 'released' && status !== 'cancelled';
  const canCancel = ['placed', 'accepted', 'ready', 'courier_assigned'].includes(status);

  // Delivered → collect ratings.
  if (status === 'delivered' && !needsPay) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 72, paddingBottom: 40 }}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
        {total != null && <Text style={[styles.total, { textAlign: 'center' }]}>${total.toFixed(2)}</Text>}
        <RatingCard title={L[lang].rateRestaurant} onSubmit={(r, c) => submitReview('restaurant', r, c)} />
        <RatingCard title={L[lang].rateCourier} onSubmit={(r, c) => submitReview('courier', r, c)} />
        <Pressable style={[styles.primary, { marginTop: 16 }]} onPress={() => router.replace('/(customer)')}>
          <Text style={styles.primaryText}>{L[lang].backHome}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        {active && <ActivityIndicator size="large" color="#00B14F" style={{ marginBottom: 24 }} />}
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
        {total != null && <Text style={styles.total}>${total.toFixed(2)}</Text>}
      </View>

      {needsPay && <PaymentSheet payment={payment!} />}
      {!needsPay && canCancel && (
        <Pressable style={styles.cancel} onPress={confirmCancel}>
          <Text style={styles.cancelText}>{L[lang].cancelOrder}</Text>
        </Pressable>
      )}
      {!needsPay && !active && (
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
  total: { color: '#00B14F', fontSize: 30, fontWeight: '800', marginTop: 16 },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  cancel: { padding: 16, alignItems: 'center' },
  cancelText: { color: '#E5484D', fontWeight: '600' },
});
