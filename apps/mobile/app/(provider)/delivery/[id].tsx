// Courier active delivery — pickup → delivering → delivered (+ GPS broadcast, nav).
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast';
import { useLocale } from '@/lib/locale';
import { type Language } from '@angkorgo/shared';

type OrderStatus = 'courier_assigned' | 'picked_up' | 'delivering' | 'delivered';
const ACTIVE = ['courier_assigned', 'picked_up', 'delivering'];

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus }>> = {
  courier_assigned: { to: 'picked_up' },
  picked_up:        { to: 'delivering' },
  delivering:       { to: 'delivered' },
};

// Next-step button label per status, trilingual.
const NEXT_LABEL: Record<Language, Partial<Record<OrderStatus, string>>> = {
  en: { courier_assigned: 'Picked up food', picked_up: 'Start delivery',  delivering: 'Delivered' },
  km: { courier_assigned: 'យកម្ហូបរួច',      picked_up: 'ចាប់ផ្តើមដឹកជញ្ជូន', delivering: 'បានដឹកជញ្ជូន' },
  zh: { courier_assigned: '已取餐',          picked_up: '开始配送',        delivering: '已送达' },
};

const L: Record<Language, Record<string, string>> = {
  en: {
    courier_assigned: 'COURIER ASSIGNED',
    picked_up: 'PICKED UP',
    delivering: 'DELIVERING',
    delivered: 'DELIVERED',
    pickFrom: 'Pick up from',
    deliverTo: 'Deliver to',
    deliveryFee: 'Delivery fee',
    navigate: 'Navigate ↗',
    back: 'Back to dashboard',
    updateFailed: 'Update failed',
    deliveredAlert: 'Delivered',
  },
  km: {
    courier_assigned: 'បានចាត់តាំងអ្នកដឹក',
    picked_up: 'បានយករួច',
    delivering: 'កំពុងដឹកជញ្ជូន',
    delivered: 'បានដឹកជញ្ជូន',
    pickFrom: 'យកពី',
    deliverTo: 'ដឹកទៅ',
    deliveryFee: 'ថ្លៃដឹកជញ្ជូន',
    navigate: 'នាំផ្លូវ ↗',
    back: 'ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង',
    updateFailed: 'ធ្វើ​បច្ចុប្បន្នភាព​បរាជ័យ',
    deliveredAlert: 'បាន​ដឹក​ជញ្ជូន',
  },
  zh: {
    courier_assigned: '已分配骑手',
    picked_up: '已取餐',
    delivering: '配送中',
    delivered: '已送达',
    pickFrom: '取餐地点',
    deliverTo: '送达地点',
    deliveryFee: '配送费',
    navigate: '导航 ↗',
    back: '返回仪表板',
    updateFailed: '更新失败',
    deliveredAlert: '已送达',
  },
};

export default function Delivery() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
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
    if (error) return Alert.alert(t.updateFailed, error.message);
    if (step.to === 'delivered') { Alert.alert(t.deliveredAlert, `Delivery fee $${Number(order?.delivery_fee ?? 0).toFixed(2)} added to your wallet.`); router.replace('/(provider)'); }
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
  const stepLabel = (NEXT_LABEL[lang] ?? NEXT_LABEL.en)[status];

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{t[status] ?? status.replace('_', ' ').toUpperCase()}</Text>
      <Text style={styles.label}>{toPickup ? t.pickFrom : t.deliverTo}</Text>
      <Text style={styles.addr}>{toPickup ? order?.restaurants?.name : order?.delivery_address}</Text>
      {order?.delivery_fee != null && <Text style={styles.fee}>{t.deliveryFee} ${Number(order.delivery_fee).toFixed(2)}</Text>}

      <View style={styles.actions}>
        <Pressable style={styles.nav} onPress={navigate}><Text style={styles.navText}>{t.navigate}</Text></Pressable>
        {step && <Pressable style={styles.primary} onPress={advance}><Text style={styles.primaryText}>{stepLabel}</Text></Pressable>}
        <Pressable style={styles.back} onPress={() => router.replace('/(provider)')}><Text style={styles.backText}>{t.back}</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, paddingTop: 80 },
  status: { color: '#00B14F', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  label: { color: '#7A7A7A', fontSize: 13, marginTop: 16 },
  addr: { color: '#1C1C1C', fontSize: 22, fontWeight: '700', marginTop: 4 },
  fee: { color: '#00B14F', fontSize: 16, fontWeight: '800', marginTop: 12 },
  actions: { marginTop: 'auto', gap: 10 },
  nav: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ECECEC' },
  navText: { color: '#1C1C1C', fontWeight: '700' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
