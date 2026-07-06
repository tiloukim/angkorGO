// Provider dashboard — online toggle + live offer inbox with Accept/Reject.
// Accepting calls the atomic accept_assignment RPC (first-wins) then opens the job.
import { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Pressable, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { categoryLabel, VEHICLE_LABELS } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { registerPushToken } from '@/lib/push';
import { useProviderOffers, type Offer } from '@/hooks/useProviderOffers';
import { useTripOffers, type TripOffer } from '@/hooks/useTripOffers';
import type { Provider } from '@angkorgo/shared';

export default function ProviderDashboard() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const { offers, refresh } = useProviderOffers(provider?.id);
  const { offers: rideOffers, refresh: refreshRides } = useTripOffers(provider?.id);

  async function load() {
    const { data } = await supabase.from('providers').select('*').single();
    setProvider(data as Provider | null);
  }
  useEffect(() => { load(); registerPushToken(); }, []);

  async function toggleOnline(v: boolean) {
    if (!provider || provider.status !== 'approved') return;
    await supabase.from('providers').update({ is_online: v }).eq('id', provider.id);
    setProvider({ ...provider, is_online: v });
  }

  async function accept(o: Offer) {
    const { error } = await supabase.rpc('accept_assignment', { p_assignment_id: o.assignment_id });
    if (error) { Alert.alert('Too late', 'This request was taken by another provider.'); refresh(); return; }
    router.push({ pathname: '/(provider)/job/[id]', params: { id: o.request_id } });
  }

  async function reject(o: Offer) {
    await supabase.rpc('reject_assignment', { p_assignment_id: o.assignment_id });
    refresh();
  }

  async function acceptRide(o: TripOffer) {
    const { error } = await supabase.rpc('accept_trip', { p_offer_id: o.offer_id });
    if (error) { Alert.alert('Too late', 'This ride was taken by another driver.'); refreshRides(); return; }
    router.push({ pathname: '/(provider)/trip/[id]', params: { id: o.trip_id } });
  }

  async function rejectRide(o: TripOffer) {
    await supabase.rpc('reject_trip_offer', { p_offer_id: o.offer_id });
    refreshRides();
  }

  const approved = provider?.status === 'approved';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>Dashboard</Text>
        {approved && (
          <View style={styles.onlineWrap}>
            <Text style={styles.onlineLabel}>{provider?.is_online ? 'Online' : 'Offline'}</Text>
            <Switch value={provider?.is_online ?? false} onValueChange={toggleOnline} />
          </View>
        )}
      </View>

      {!approved && (
        <Pressable style={styles.banner} onPress={() => router.push('/(provider)/onboarding')}>
          <Text style={styles.bannerTitle}>
            {provider?.status === 'pending' ? 'Complete your onboarding →' : `Account ${provider?.status ?? '…'}`}
          </Text>
          <Text style={styles.bannerSub}>Upload documents and choose your services to get approved.</Text>
        </Pressable>
      )}

      {approved && !provider?.is_online && (
        <Text style={styles.hint}>Go online to start receiving nearby rescue requests.</Text>
      )}

      {approved && provider?.is_online && rideOffers.length > 0 && (
        <>
          <Text style={styles.section}>Ride requests ({rideOffers.length})</Text>
          {rideOffers.map((item) => (
            <View key={item.offer_id} style={styles.offer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerCat}>🛺 {VEHICLE_LABELS.en[item.class]} · ${Number(item.est_fare ?? 0).toFixed(2)}</Text>
                <Text style={styles.offerMeta}>{item.distance_km ?? '?'} km to pickup · ~{item.eta_minutes ?? '?'} min</Text>
                {item.dropoff_address ? <Text style={styles.offerAddr} numberOfLines={1}>→ {item.dropoff_address}</Text> : null}
              </View>
              <Pressable style={styles.reject} onPress={() => rejectRide(item)}>
                <Text style={styles.rejectText}>Skip</Text>
              </Pressable>
              <Pressable style={styles.accept} onPress={() => acceptRide(item)}>
                <Text style={styles.acceptText}>Accept</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}

      {approved && provider?.is_online && (
        <>
          <Text style={styles.section}>Roadside requests ({offers.length})</Text>
          <FlatList
            data={offers}
            keyExtractor={(o) => o.assignment_id}
            ListEmptyComponent={<Text style={styles.empty}>Waiting for requests…</Text>}
            renderItem={({ item }) => (
              <View style={styles.offer}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.offerCat}>{categoryLabel('en', item.category)}</Text>
                  <Text style={styles.offerMeta}>
                    {item.distance_km ?? '?'} km · ~{item.eta_minutes ?? '?'} min
                  </Text>
                  {item.address ? <Text style={styles.offerAddr} numberOfLines={1}>{item.address}</Text> : null}
                </View>
                <Pressable style={styles.reject} onPress={() => reject(item)}>
                  <Text style={styles.rejectText}>Skip</Text>
                </Pressable>
                <Pressable style={styles.accept} onPress={() => accept(item)}>
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
              </View>
            )}
          />
        </>
      )}

      <View style={styles.navRow}>
        <Pressable style={styles.navBtn} onPress={() => router.push('/(provider)/jobs')}>
          <Text style={styles.navText}>Jobs</Text>
        </Pressable>
        <Pressable style={styles.navBtn} onPress={() => router.push('/(provider)/vehicles')}>
          <Text style={styles.navText}>Vehicles</Text>
        </Pressable>
        <Pressable style={styles.navBtn} onPress={() => router.push('/(provider)/wallet')}>
          <Text style={styles.navText}>Wallet</Text>
        </Pressable>
        <Pressable style={styles.navBtn} onPress={() => router.push('/(provider)/profile')}>
          <Text style={styles.navText}>Profile</Text>
        </Pressable>
      </View>
      <Pressable style={styles.signout} onPress={signOut}>
        <Text style={styles.signoutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, paddingTop: 72 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800' },
  onlineWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineLabel: { color: '#8FA3BF', fontWeight: '600' },
  banner: { backgroundColor: '#2A1B10', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#5A3A1A', marginTop: 16 },
  bannerTitle: { color: '#F5A524', fontSize: 16, fontWeight: '700' },
  bannerSub: { color: '#C79A5B', fontSize: 14, marginTop: 4 },
  hint: { color: '#8FA3BF', marginTop: 24 },
  section: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  empty: { color: '#5B6B84', marginTop: 20, textAlign: 'center' },
  offer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#151E30', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1F2A40' },
  offerCat: { color: '#fff', fontSize: 16, fontWeight: '700' },
  offerMeta: { color: '#8FA3BF', fontSize: 13, marginTop: 2 },
  offerAddr: { color: '#5B6B84', fontSize: 12, marginTop: 2 },
  reject: { paddingVertical: 8, paddingHorizontal: 12 },
  rejectText: { color: '#8FA3BF', fontWeight: '600' },
  accept: { backgroundColor: '#F04438', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  acceptText: { color: '#fff', fontWeight: '700' },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  navBtn: { flex: 1, backgroundColor: '#151E30', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1F2A40' },
  navText: { color: '#fff', fontWeight: '700' },
  signout: { marginTop: 8, padding: 12, alignItems: 'center' },
  signoutText: { color: '#F04438', fontWeight: '600' },
});
