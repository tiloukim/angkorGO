// Live request status — "finding help" while dispatching, then a live tracking
// map (customer pin + moving provider + route/ETA) once a provider is assigned.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { RequestStatus } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useProviderLocation } from '@/hooks/useProviderLocation';
import { usePayment } from '@/hooks/usePayment';
import { TrackingMap } from '@/components/TrackingMap';
import { PaymentSheet } from '@/components/PaymentSheet';
import { ReviewPrompt } from '@/components/ReviewPrompt';
import type { Coords } from '@/lib/location';

const COPY: Partial<Record<RequestStatus, { title: string; sub: string }>> = {
  pending:     { title: 'Submitting…', sub: 'Creating your request' },
  dispatching: { title: 'Finding help nearby…', sub: 'Contacting providers around you' },
  accepted:    { title: 'A provider accepted!', sub: 'They are preparing to head your way' },
  en_route:    { title: 'On the way', sub: 'Your provider is driving to you' },
  arrived:     { title: 'Provider has arrived', sub: 'Meet them at your vehicle' },
  in_progress: { title: 'Work in progress', sub: 'Your provider is helping now' },
  completed:   { title: 'Completed', sub: 'Thanks for using AngkorGo Rescue' },
  expired:     { title: 'No provider available', sub: 'Nobody accepted in time — please try again' },
  cancelled:   { title: 'Cancelled', sub: 'This request was cancelled' },
};

const TRACKING: RequestStatus[] = ['accepted', 'en_route', 'arrived', 'in_progress'];

export default function RequestStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

  const copy = COPY[status] ?? COPY.dispatching!;
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
        {searching && <ActivityIndicator size="large" color="#F04438" style={{ marginBottom: 24 }} />}
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
      </View>

      {searching && (
        <Pressable style={styles.cancel} onPress={() => Alert.alert('Cancel request?', '', [
          { text: 'Keep waiting', style: 'cancel' },
          { text: 'Cancel', style: 'destructive', onPress: cancel },
        ])}>
          <Text style={styles.cancelText}>Cancel request</Text>
        </Pressable>
      )}

      {status === 'completed' && providerId && (
        <ReviewPrompt requestId={id!} providerId={providerId} onDone={() => router.replace('/(customer)')} />
      )}

      {terminal && status !== 'completed' && (
        <Pressable style={styles.primary} onPress={() => router.replace('/(customer)')}>
          <Text style={styles.primaryText}>Back to home</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  sub: { color: '#8FA3BF', fontSize: 15, textAlign: 'center', marginTop: 8 },
  cancel: { padding: 16, alignItems: 'center' },
  cancelText: { color: '#F04438', fontWeight: '600' },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  banner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0B1220', padding: 24, paddingBottom: 40,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bannerSub: { color: '#8FA3BF', fontSize: 14, marginTop: 4 },
  sheetWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
