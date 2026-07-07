// Live request status — "finding help" while dispatching, then a live tracking
// map (customer pin + moving provider + route/ETA) once a provider is assigned.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { RequestStatus, Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { useProviderLocation } from '@/hooks/useProviderLocation';
import { usePayment } from '@/hooks/usePayment';
import { TrackingMap } from '@/components/TrackingMap';
import { PaymentSheet } from '@/components/PaymentSheet';
import { ReviewPrompt } from '@/components/ReviewPrompt';
import type { Coords } from '@/lib/location';

const COPY: Record<Language, Partial<Record<RequestStatus, { title: string; sub: string }>>> = {
  en: {
    pending:     { title: 'Submitting…', sub: 'Creating your request' },
    dispatching: { title: 'Finding help nearby…', sub: 'Contacting providers around you' },
    accepted:    { title: 'A provider accepted!', sub: 'They are preparing to head your way' },
    en_route:    { title: 'On the way', sub: 'Your provider is driving to you' },
    arrived:     { title: 'Provider has arrived', sub: 'Meet them at your vehicle' },
    in_progress: { title: 'Work in progress', sub: 'Your provider is helping now' },
    completed:   { title: 'Completed', sub: 'Thanks for using AngkorGo' },
    expired:     { title: 'No provider available', sub: 'Nobody accepted in time — please try again' },
    cancelled:   { title: 'Cancelled', sub: 'This request was cancelled' },
  },
  km: {
    pending:     { title: 'កំពុងដាក់ស្នើ…', sub: 'កំពុងបង្កើតសំណើរបស់អ្នក' },
    dispatching: { title: 'កំពុងស្វែងរកជំនួយនៅជិត…', sub: 'កំពុងទាក់ទងអ្នកផ្តល់សេវានៅជុំវិញអ្នក' },
    accepted:    { title: 'អ្នកផ្តល់សេវាបានទទួល!', sub: 'ពួកគេកំពុងរៀបចំធ្វើដំណើរមករកអ្នក' },
    en_route:    { title: 'កំពុងធ្វើដំណើរមក', sub: 'អ្នកផ្តល់សេវាកំពុងបើកបរមករកអ្នក' },
    arrived:     { title: 'អ្នកផ្តល់សេវាបានមកដល់', sub: 'ជួបពួកគេនៅរថយន្តរបស់អ្នក' },
    in_progress: { title: 'កំពុងធ្វើការ', sub: 'អ្នកផ្តល់សេវាកំពុងជួយឥឡូវនេះ' },
    completed:   { title: 'បានបញ្ចប់', sub: 'អរគុណដែលបានប្រើ AngkorGo' },
    expired:     { title: 'គ្មានអ្នកផ្តល់សេវា', sub: 'គ្មាននរណាទទួលទាន់ពេល — សូមព្យាយាមម្តងទៀត' },
    cancelled:   { title: 'បានលុបចោល', sub: 'សំណើនេះត្រូវបានលុបចោល' },
  },
  zh: {
    pending:     { title: '正在提交…', sub: '正在创建您的请求' },
    dispatching: { title: '正在寻找附近的帮助…', sub: '正在联系您周围的服务人员' },
    accepted:    { title: '有服务人员已接单！', sub: '他们正准备前往您所在位置' },
    en_route:    { title: '正在前往', sub: '服务人员正驾车前来' },
    arrived:     { title: '服务人员已到达', sub: '请在您的车辆旁会合' },
    in_progress: { title: '正在处理中', sub: '服务人员正在为您提供帮助' },
    completed:   { title: '已完成', sub: '感谢您使用 AngkorGo' },
    expired:     { title: '暂无可用服务人员', sub: '无人及时接单 — 请重试' },
    cancelled:   { title: '已取消', sub: '此请求已被取消' },
  },
};

const TRACKING: RequestStatus[] = ['accepted', 'en_route', 'arrived', 'in_progress'];

const L: Record<Language, Record<string, string>> = {
  en: { cancelRequest: 'Cancel request', backHome: 'Back to home', cancelRequestQ: 'Cancel request?', keepWaiting: 'Keep waiting', cancel: 'Cancel' },
  km: { cancelRequest: 'បោះបង់សំណើ', backHome: 'ត្រឡប់ទៅទំព័រដើម', cancelRequestQ: 'បោះបង់​ការ​ស្នើ?', keepWaiting: 'រង់ចាំ​បន្ត', cancel: 'បោះបង់' },
  zh: { cancelRequest: '取消请求', backHome: '返回首页', cancelRequestQ: '取消请求？', keepWaiting: '继续等待', cancel: '取消' },
};

export default function RequestStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLocale();
  const [status, setStatus] = useState<RequestStatus>('dispatching');
  const [providerId, setProviderId] = useState<string | null>(null);
  const [pickup, setPickup] = useState<Coords | null>(null);

  const providerCoords = useProviderLocation(TRACKING.includes(status) ? providerId : null);
  const payment = usePayment(id);

  async function loadDetail() {
    const { data } = await supabase.rpc('get_request', { p_request_id: id });
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setStatus(row.status);
      setProviderId(row.assigned_provider_id);
      if (row.lat != null) setPickup({ lat: row.lat, lng: row.lng });
    }
  }

  useEffect(() => {
    if (!id) return;
    loadDetail();
    const channel = supabase
      .channel(`request:${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `id=eq.${id}` },
        () => loadDetail())   // refetch so we pick up assigned_provider_id too
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function cancel() {
    await supabase.from('service_requests').update({ status: 'cancelled' }).eq('id', id);
    router.replace('/(customer)');
  }

  const copy = COPY[lang][status] ?? COPY.en[status] ?? COPY[lang].dispatching ?? COPY.en.dispatching!;
  const searching = status === 'pending' || status === 'dispatching';
  const tracking = TRACKING.includes(status) && pickup;
  const terminal = status === 'completed' || status === 'expired' || status === 'cancelled';

  const awaitingPayment = payment && payment.status !== 'released';

  // Live tracking layout (map + status banner or payment sheet).
  if (tracking) {
    return (
      <View style={styles.container}>
        <TrackingMap customer={pickup!} provider={providerCoords} />
        {awaitingPayment ? (
          <View style={styles.sheetWrap}><PaymentSheet payment={payment!} /></View>
        ) : (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>{copy.title}</Text>
            <Text style={styles.bannerSub}>{copy.sub}</Text>
          </View>
        )}
      </View>
    );
  }

  // Searching / terminal layout.
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        {searching && <ActivityIndicator size="large" color="#00B14F" style={{ marginBottom: 24 }} />}
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
      </View>

      {searching && (
        <Pressable style={styles.cancel} onPress={() => Alert.alert(L[lang].cancelRequestQ, '', [
          { text: L[lang].keepWaiting, style: 'cancel' },
          { text: L[lang].cancel, style: 'destructive', onPress: cancel },
        ])}>
          <Text style={styles.cancelText}>{L[lang].cancelRequest}</Text>
        </Pressable>
      )}

      {status === 'completed' && providerId && (
        <ReviewPrompt requestId={id!} providerId={providerId} onDone={() => router.replace('/(customer)')} />
      )}

      {terminal && status !== 'completed' && (
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
  cancel: { padding: 16, alignItems: 'center' },
  cancelText: { color: '#E5484D', fontWeight: '600' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  banner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', padding: 24, paddingBottom: 40,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  bannerTitle: { color: '#1C1C1C', fontSize: 20, fontWeight: '800' },
  bannerSub: { color: '#7A7A7A', fontSize: 14, marginTop: 4 },
  sheetWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
