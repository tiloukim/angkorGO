// Express — live parcel status. Searching → tracking map (courier) once
// assigned. Shows the delivery code the recipient hands the courier as proof.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { useProviderLocation } from '@/hooks/useProviderLocation';
import { useParcelPayment } from '@/hooks/usePayment';
import { TrackingMap } from '@/components/TrackingMap';
import { PaymentSheet } from '@/components/PaymentSheet';
import type { Coords } from '@/lib/location';

type ParcelStatus = 'requested' | 'searching' | 'courier_assigned' | 'picked_up' | 'delivering' | 'delivered' | 'cancelled';

const COPY: Record<Language, Partial<Record<ParcelStatus, { title: string; sub: string }>>> = {
  en: {
    requested:        { title: 'Submitting…', sub: 'Creating your parcel' },
    searching:        { title: 'Finding a courier…', sub: 'Matching you with a courier nearby' },
    courier_assigned: { title: 'Courier assigned', sub: 'Heading to the pickup' },
    picked_up:        { title: 'Parcel picked up', sub: 'On the way to the recipient' },
    delivering:       { title: 'Out for delivery', sub: 'Almost there' },
    delivered:        { title: 'Delivered', sub: 'Your parcel has arrived 📦' },
    cancelled:        { title: 'Cancelled', sub: 'This parcel was cancelled' },
  },
  km: {
    requested:        { title: 'កំពុងដាក់ស្នើ…', sub: 'កំពុងបង្កើតកញ្ចប់របស់អ្នក' },
    searching:        { title: 'កំពុងស្វែងរកអ្នកដឹក…', sub: 'កំពុងផ្គូផ្គងអ្នកជាមួយអ្នកដឹកនៅជិត' },
    courier_assigned: { title: 'បានចាត់អ្នកដឹក', sub: 'កំពុងទៅកន្លែងទទួល' },
    picked_up:        { title: 'បានយកកញ្ចប់', sub: 'កំពុងធ្វើដំណើរទៅអ្នកទទួល' },
    delivering:       { title: 'កំពុងដឹកជញ្ជូន', sub: 'ជិតដល់ហើយ' },
    delivered:        { title: 'បានដឹកជញ្ជូន', sub: 'កញ្ចប់របស់អ្នកបានមកដល់ 📦' },
    cancelled:        { title: 'បានលុបចោល', sub: 'កញ្ចប់នេះត្រូវបានលុបចោល' },
  },
  zh: {
    requested:        { title: '正在提交…', sub: '正在创建您的包裹' },
    searching:        { title: '正在寻找快递员…', sub: '正在为您匹配附近的快递员' },
    courier_assigned: { title: '已分配快递员', sub: '正前往取件点' },
    picked_up:        { title: '已取件', sub: '正在送往收件人' },
    delivering:       { title: '正在派送', sub: '快到了' },
    delivered:        { title: '已送达', sub: '您的包裹已送达 📦' },
    cancelled:        { title: '已取消', sub: '此包裹已取消' },
  },
};

const TRACKING: ParcelStatus[] = ['courier_assigned', 'picked_up', 'delivering'];

const L: Record<Language, Record<string, string>> = {
  en: { deliveryCode: 'Delivery code', codeHint: 'Give this code to the recipient — the courier confirms it on delivery.', cancel: 'Cancel parcel', backHome: 'Back to home', cancelQ: 'Cancel this parcel?', keep: 'Keep', fee: 'Fee' },
  km: { deliveryCode: 'លេខកូដដឹកជញ្ជូន', codeHint: 'ផ្តល់លេខកូដនេះទៅអ្នកទទួល — អ្នកដឹកនឹងបញ្ជាក់នៅពេលដឹកជូន។', cancel: 'បោះបង់កញ្ចប់', backHome: 'ត្រឡប់ទៅទំព័រដើម', cancelQ: 'បោះបង់កញ្ចប់នេះ?', keep: 'រក្សាទុក', fee: 'ថ្លៃ' },
  zh: { deliveryCode: '取件码', codeHint: '把此码给收件人 — 快递员送达时核对。', cancel: '取消包裹', backHome: '返回首页', cancelQ: '取消此包裹？', keep: '保留', fee: '费用' },
};

export default function ParcelStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLocale();
  const [status, setStatus] = useState<ParcelStatus>('searching');
  const [courierId, setCourierId] = useState<string | null>(null);
  const [pickup, setPickup] = useState<Coords | null>(null);
  const [dropoff, setDropoff] = useState<Coords | null>(null);
  const [code, setCode] = useState('');
  const [fee, setFee] = useState<number | null>(null);

  const tracking = TRACKING.includes(status);
  const courierCoords = useProviderLocation(tracking ? courierId : null);
  const payment = useParcelPayment(id);

  async function load() {
    const { data } = await supabase.from('parcels')
      .select('status, courier_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, delivery_code, fee').eq('id', id).maybeSingle();
    if (!data) return;
    setStatus(data.status as ParcelStatus);
    setCourierId(data.courier_id);
    setCode(data.delivery_code ?? '');
    setFee(Number(data.fee));
    if (data.pickup_lat != null) setPickup({ lat: data.pickup_lat, lng: data.pickup_lng });
    if (data.dropoff_lat != null) setDropoff({ lat: data.dropoff_lat, lng: data.dropoff_lng });
  }

  useEffect(() => {
    if (!id) return;
    load();
    const channel = supabase.channel(`parcel:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parcels', filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function cancel() {
    await supabase.rpc('cancel_parcel', { p_parcel: id, p_reason: 'sender_cancelled' });
    router.replace('/(customer)');
  }

  const copy = COPY[lang][status] ?? COPY.en[status] ?? COPY[lang].searching ?? COPY.en.searching!;
  const searching = status === 'requested' || status === 'searching';
  const terminal = status === 'delivered' || status === 'cancelled';
  const target = status === 'delivering' ? dropoff : pickup;
  const needsPay = payment && payment.status !== 'released' && status !== 'cancelled';

  const codeCard = code ? (
    <View style={styles.codeCard}>
      <Text style={styles.codeLabel}>{L[lang].deliveryCode}</Text>
      <Text style={styles.code}>{code}</Text>
      <Text style={styles.codeHint}>{L[lang].codeHint}</Text>
    </View>
  ) : null;

  // Live tracking layout.
  if (tracking && target) {
    return (
      <View style={styles.container}>
        <TrackingMap customer={target} provider={courierCoords} />
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>{copy.title}</Text>
          <Text style={styles.bannerSub}>{copy.sub}</Text>
          {codeCard}
          <Pressable style={styles.cancel} onPress={() => Alert.alert(L[lang].cancelQ, '', [
            { text: L[lang].keep, style: 'cancel' },
            { text: L[lang].cancel, style: 'destructive', onPress: cancel },
          ])}>
            <Text style={styles.cancelText}>{L[lang].cancel}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Searching / terminal / payment layout.
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        {searching && <ActivityIndicator size="large" color="#00B14F" style={{ marginBottom: 24 }} />}
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
        {fee != null && <Text style={styles.fee}>{L[lang].fee} ${fee.toFixed(2)}</Text>}
        {searching && codeCard}
      </View>

      {searching && (
        <Pressable style={styles.cancel} onPress={() => Alert.alert(L[lang].cancelQ, '', [
          { text: L[lang].keep, style: 'cancel' },
          { text: L[lang].cancel, style: 'destructive', onPress: cancel },
        ])}>
          <Text style={styles.cancelText}>{L[lang].cancel}</Text>
        </Pressable>
      )}

      {needsPay && <View style={styles.sheetWrap}><PaymentSheet payment={payment!} /></View>}

      {terminal && !needsPay && (
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
  fee: { color: '#00B14F', fontSize: 20, fontWeight: '800', marginTop: 14 },
  cancel: { padding: 16, alignItems: 'center' },
  cancelText: { color: '#E5484D', fontWeight: '600' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  banner: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', padding: 24, paddingBottom: 36, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  bannerTitle: { color: '#1C1C1C', fontSize: 20, fontWeight: '800' },
  bannerSub: { color: '#7A7A7A', fontSize: 14, marginTop: 4 },
  sheetWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  codeCard: { backgroundColor: '#E4F7EC', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
  codeLabel: { color: '#0A7C3E', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  code: { color: '#00B14F', fontSize: 40, fontWeight: '900', letterSpacing: 6, marginTop: 4 },
  codeHint: { color: '#3A7D57', fontSize: 12, textAlign: 'center', marginTop: 6 },
});
