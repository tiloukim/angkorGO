// Host dashboard — your listings + incoming booking requests (confirm/decline).
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function HostDashboard() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: ls }, { data: rq }] = await Promise.all([
      supabase.from('listings').select('id, title, status, price_per_unit').eq('host_id', user.id).order('created_at', { ascending: false }),
      supabase.from('bookings').select('id, start_date, end_date, total_amount, status, listings!inner(title, host_id)')
        .eq('status', 'requested').order('created_at', { ascending: false }),
    ]);
    setListings(ls ?? []);
    setRequests((rq ?? []).filter((b: any) => b.listings?.host_id === user.id));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function respond(id: string, action: 'confirm' | 'decline') {
    const { error } = await supabase.rpc(`${action}_booking`, { p_booking: id });
    if (error) return Alert.alert('Failed', error.message);
    load();
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>Host</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push('/(customer)/host/new')}>
          <Text style={styles.addText}>+ Listing</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Booking requests ({requests.length})</Text>
      {requests.map((b) => (
        <View key={b.id} style={styles.req}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reqTitle}>{b.listings?.title}</Text>
            <Text style={styles.reqSub}>{b.start_date} → {b.end_date} · ${Number(b.total_amount).toFixed(2)}</Text>
          </View>
          <Pressable style={styles.decline} onPress={() => respond(b.id, 'decline')}><Text style={styles.declineText}>Decline</Text></Pressable>
          <Pressable style={styles.confirm} onPress={() => respond(b.id, 'confirm')}><Text style={styles.confirmText}>Confirm</Text></Pressable>
        </View>
      ))}
      {requests.length === 0 && <Text style={styles.empty}>No pending requests.</Text>}

      <Text style={styles.section}>My listings ({listings.length})</Text>
      <FlatList
        data={listings}
        keyExtractor={(l) => l.id}
        ListEmptyComponent={<Text style={styles.empty}>No listings yet — add one.</Text>}
        renderItem={({ item }) => (
          <View style={styles.listing}>
            <Text style={styles.listingTitle}>{item.title}</Text>
            <Text style={styles.listingSub}>${Number(item.price_per_unit).toFixed(2)}/day · {item.status}</Text>
          </View>
        )}
      />

      <Pressable style={styles.back} onPress={() => router.replace('/(customer)')}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, paddingTop: 72 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800' },
  addBtn: { backgroundColor: '#F04438', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  addText: { color: '#fff', fontWeight: '700' },
  section: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  empty: { color: '#5B6B84' },
  req: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#151E30', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1F2A40' },
  reqTitle: { color: '#fff', fontWeight: '700' },
  reqSub: { color: '#8FA3BF', fontSize: 13, marginTop: 2 },
  decline: { paddingVertical: 8, paddingHorizontal: 10 },
  declineText: { color: '#8FA3BF', fontWeight: '600' },
  confirm: { backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  confirmText: { color: '#fff', fontWeight: '700' },
  listing: { backgroundColor: '#151E30', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1F2A40' },
  listingTitle: { color: '#fff', fontWeight: '700' },
  listingSub: { color: '#8FA3BF', fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#8FA3BF', fontWeight: '600' },
});
