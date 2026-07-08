// Host dashboard — your listings + incoming booking requests (confirm/decline).
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { BackButton } from '@/components/BackButton';

const L: Record<Language, Record<string, string>> = {
  en: {
    failed: 'Failed',
    host: 'Host',
    addListing: '+ Listing',
    bookingRequests: 'Booking requests',
    decline: 'Decline',
    confirm: 'Confirm',
    noRequests: 'No pending requests.',
    myListings: 'My listings',
    noListings: 'No listings yet — add one.',
    perDay: 'day',
    back: 'Back',
  },
  km: {
    failed: 'បរាជ័យ',
    host: 'ម្ចាស់ផ្ទះ',
    addListing: '+ បញ្ជី',
    bookingRequests: 'សំណើកក់',
    decline: 'បដិសេធ',
    confirm: 'បញ្ជាក់',
    noRequests: 'គ្មានសំណើកំពុងរង់ចាំ។',
    myListings: 'បញ្ជីរបស់ខ្ញុំ',
    noListings: 'មិនទាន់មានបញ្ជី — បន្ថែមមួយ។',
    perDay: 'ថ្ងៃ',
    back: 'ថយក្រោយ',
  },
  zh: {
    failed: '失败',
    host: '房东',
    addListing: '+ 房源',
    bookingRequests: '预订请求',
    decline: '拒绝',
    confirm: '确认',
    noRequests: '暂无待处理请求。',
    myListings: '我的房源',
    noListings: '还没有房源 — 添加一个。',
    perDay: '天',
    back: '返回',
  },
};

export default function HostDashboard() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
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
    if (error) return Alert.alert(t.failed, error.message);
    load();
  }

  return (
    <View style={styles.container}>
      <BackButton variant="light" style={{ marginBottom: 16 }} />
      <View style={styles.headerRow}>
        <Text style={styles.h1}>{t.host}</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push('/(customer)/host/new')}>
          <Text style={styles.addText}>{t.addListing}</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>{t.bookingRequests} ({requests.length})</Text>
      {requests.map((b) => (
        <View key={b.id} style={styles.req}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reqTitle}>{b.listings?.title}</Text>
            <Text style={styles.reqSub}>{b.start_date} → {b.end_date} · ${Number(b.total_amount).toFixed(2)}</Text>
          </View>
          <Pressable style={styles.decline} onPress={() => respond(b.id, 'decline')}><Text style={styles.declineText}>{t.decline}</Text></Pressable>
          <Pressable style={styles.confirm} onPress={() => respond(b.id, 'confirm')}><Text style={styles.confirmText}>{t.confirm}</Text></Pressable>
        </View>
      ))}
      {requests.length === 0 && <Text style={styles.empty}>{t.noRequests}</Text>}

      <Text style={styles.section}>{t.myListings} ({listings.length})</Text>
      <FlatList
        data={listings}
        keyExtractor={(l) => l.id}
        ListEmptyComponent={<Text style={styles.empty}>{t.noListings}</Text>}
        renderItem={({ item }) => (
          <View style={styles.listing}>
            <Text style={styles.listingTitle}>{item.title}</Text>
            <Text style={styles.listingSub}>${Number(item.price_per_unit).toFixed(2)}/{t.perDay} · {item.status}</Text>
          </View>
        )}
      />

      <Pressable style={styles.back} onPress={() => router.replace('/(customer)')}>
        <Text style={styles.backText}>{t.back}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, paddingTop: 72 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { color: '#1C1C1C', fontSize: 24, fontWeight: '800' },
  addBtn: { backgroundColor: '#00B14F', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  addText: { color: '#fff', fontWeight: '700' },
  section: { color: '#1C1C1C', fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  empty: { color: '#9AA0A6' },
  req: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#ECECEC' },
  reqTitle: { color: '#1C1C1C', fontWeight: '700' },
  reqSub: { color: '#7A7A7A', fontSize: 13, marginTop: 2 },
  decline: { paddingVertical: 8, paddingHorizontal: 10 },
  declineText: { color: '#7A7A7A', fontWeight: '600' },
  confirm: { backgroundColor: '#00B14F', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  confirmText: { color: '#fff', fontWeight: '700' },
  listing: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#ECECEC' },
  listingTitle: { color: '#1C1C1C', fontWeight: '700' },
  listingSub: { color: '#7A7A7A', fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
