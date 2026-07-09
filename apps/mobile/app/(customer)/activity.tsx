// Activity tab — recent rides, food orders and bookings (Grab-style segmented
// view). Each item reopens its live status screen. RLS scopes rows to the user.
import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { theme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { TabBar, TAB_BAR_SPACE } from '@/components/TabBar';
import { useLocale } from '@/lib/locale';
import { type Language } from '@angkorgo/shared';
import { BackButton } from '@/components/BackButton';

type Seg = 'rides' | 'food' | 'stays';
const SEGMENTS: { key: Seg; icon: string }[] = [
  { key: 'rides', icon: '🛺' },
  { key: 'food', icon: '🍜' },
  { key: 'stays', icon: '🏠' },
];

const L: Record<Language, Record<string, string>> = {
  en: {
    title: 'Your activity',
    ridesLabel: 'Rides', foodLabel: 'Food', staysLabel: 'Bookings',
    ridesEmpty: 'No rides yet — your trips will show here.',
    foodEmpty: 'No orders yet — your food orders will show here.',
    staysEmpty: 'No bookings yet — rentals & stays will show here.',
  },
  km: {
    title: 'សកម្មភាពរបស់អ្នក',
    ridesLabel: 'ការជិះ', foodLabel: 'អាហារ', staysLabel: 'ការកក់',
    ridesEmpty: 'មិនទាន់មានការជិះ — ដំណើររបស់អ្នកនឹងបង្ហាញនៅទីនេះ។',
    foodEmpty: 'មិនទាន់មានការកម្ម៉ង់ — ការកម្ម៉ង់អាហាររបស់អ្នកនឹងបង្ហាញនៅទីនេះ។',
    staysEmpty: 'មិនទាន់មានការកក់ — ការជួល និងកន្លែងស្នាក់នៅនឹងបង្ហាញនៅទីនេះ។',
  },
  zh: {
    title: '你的活动',
    ridesLabel: '行程', foodLabel: '美食', staysLabel: '预订',
    ridesEmpty: '暂无行程 — 你的行程将显示在此处。',
    foodEmpty: '暂无订单 — 你的美食订单将显示在此处。',
    staysEmpty: '暂无预订 — 租赁和住宿将显示在此处。',
  },
};

// Compact trilingual status labels across trips/orders/bookings.
const STATUS: Record<Language, Record<string, string>> = {
  en: {
    requested: 'Requested', searching: 'Finding driver', matched: 'Matched',
    driver_arriving: 'Driver on the way', driver_arrived: 'Driver arrived',
    in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled',
    expired: 'Expired', no_drivers: 'No drivers',
    placed: 'Placed', accepted: 'Preparing', ready: 'Ready',
    courier_assigned: 'Courier assigned', picked_up: 'Picked up',
    delivering: 'Delivering', delivered: 'Delivered',
    confirmed: 'Confirmed', declined: 'Declined',
  },
  km: {
    requested: 'បានស្នើ', searching: 'កំពុងរកអ្នកបើកបរ', matched: 'បានផ្គូផ្គង',
    driver_arriving: 'អ្នកបើកបរកំពុងមក', driver_arrived: 'អ្នកបើកបរមកដល់',
    in_progress: 'កំពុងដំណើរការ', completed: 'បានបញ្ចប់', cancelled: 'បានលុបចោល',
    expired: 'ផុតកំណត់', no_drivers: 'គ្មានអ្នកបើកបរ',
    placed: 'បានកម្ម៉ង់', accepted: 'កំពុងរៀបចំ', ready: 'រួចរាល់',
    courier_assigned: 'បានចាត់អ្នកដឹក', picked_up: 'បានយក',
    delivering: 'កំពុងដឹក', delivered: 'បានដឹកជញ្ជូន',
    confirmed: 'បានបញ្ជាក់', declined: 'បានបដិសេធ',
  },
  zh: {
    requested: '已请求', searching: '寻找司机', matched: '已匹配',
    driver_arriving: '司机前往中', driver_arrived: '司机已到',
    in_progress: '进行中', completed: '已完成', cancelled: '已取消',
    expired: '已过期', no_drivers: '暂无司机',
    placed: '已下单', accepted: '备餐中', ready: '已备好',
    courier_assigned: '已派配送员', picked_up: '已取餐',
    delivering: '配送中', delivered: '已送达',
    confirmed: '已确认', declined: '已拒绝',
  },
};

const TERMINAL = new Set(['completed', 'cancelled', 'delivered', 'declined', 'expired', 'no_drivers']);

type Ride = { id: string; class: string; status: string; est_fare: number | null; final_fare: number | null; dropoff_address: string | null; requested_at: string };
type Order = { id: string; status: string; total: number; placed_at: string; restaurant: { name: string } | null };
type Booking = { id: string; status: string; total_amount: number; start_date: string; end_date: string; listing: { title: string; type: string } | null };

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; }
}

export default function ActivityScreen() {
  const [seg, setSeg] = useState<Seg>('rides');
  const { lang } = useLocale();
  const router = useRouter();
  const t = L[lang] ?? L.en;
  const st = STATUS[lang] ?? STATUS.en;
  const current = SEGMENTS.find((s) => s.key === seg)!;

  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<Ride[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const [r, o, b] = await Promise.all([
          supabase.from('trips').select('id, class, status, est_fare, final_fare, dropoff_address, requested_at').order('requested_at', { ascending: false }).limit(50),
          supabase.from('orders').select('id, status, total, placed_at, restaurant:restaurants(name)').order('placed_at', { ascending: false }).limit(50),
          supabase.from('bookings').select('id, status, total_amount, start_date, end_date, listing:listings(title, type)').order('start_date', { ascending: false }).limit(50),
        ]);
        if (!alive) return;
        setRides((r.data ?? []) as Ride[]);
        setOrders((o.data ?? []) as unknown as Order[]);
        setBookings((b.data ?? []) as unknown as Booking[]);
        setLoading(false);
      })();
      return () => { alive = false; };
    }, [])
  );

  function statusPill(status: string) {
    return (
      <View style={[styles.pill, TERMINAL.has(status) ? styles.pillDone : styles.pillLive]}>
        <Text style={[styles.pillText, TERMINAL.has(status) ? styles.pillTextDone : styles.pillTextLive]}>
          {st[status] ?? status}
        </Text>
      </View>
    );
  }

  function Card({ icon, title, subtitle, amount, date, onPress }: {
    icon: string; title: string; subtitle: string; amount: string; date: string; onPress: () => void;
  }) {
    return (
      <Pressable style={styles.card} onPress={onPress}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{subtitle}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardAmount}>{amount}</Text>
          <Text style={styles.cardDate}>{date}</Text>
        </View>
      </Pressable>
    );
  }

  const listData: any[] = loading ? [] : seg === 'rides' ? rides : seg === 'food' ? orders : bookings;

  function renderRow({ item }: { item: any }) {
    if (seg === 'rides') {
      return (
        <View style={{ marginBottom: 12 }}>
          <Card
            icon="🛺"
            title={`${item.class.charAt(0).toUpperCase()}${item.class.slice(1)}`}
            subtitle={item.dropoff_address || ''}
            amount={`$${Number(item.final_fare ?? item.est_fare ?? 0).toFixed(2)}`}
            date={fmtDate(item.requested_at)}
            onPress={() => router.push({ pathname: '/(customer)/ride/[id]', params: { id: item.id } })}
          />
          <View style={styles.pillRow}>{statusPill(item.status)}</View>
        </View>
      );
    }
    if (seg === 'food') {
      return (
        <View style={{ marginBottom: 12 }}>
          <Card
            icon="🍜"
            title={item.restaurant?.name || 'Restaurant'}
            subtitle=""
            amount={`$${Number(item.total).toFixed(2)}`}
            date={fmtDate(item.placed_at)}
            onPress={() => router.push({ pathname: '/(customer)/food/order/[id]', params: { id: item.id } })}
          />
          <View style={styles.pillRow}>{statusPill(item.status)}</View>
        </View>
      );
    }
    return (
      <View style={{ marginBottom: 12 }}>
        <Card
          icon={item.listing?.type === 'vehicle' ? '🚗' : '🏠'}
          title={item.listing?.title || 'Booking'}
          subtitle={`${item.start_date} → ${item.end_date}`}
          amount={`$${Number(item.total_amount).toFixed(2)}`}
          date={fmtDate(item.start_date)}
          onPress={() => router.push({ pathname: '/(customer)/booking/[id]', params: { id: item.id } })}
        />
        <View style={styles.pillRow}>{statusPill(item.status)}</View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton variant="light" style={{ marginBottom: 12 }} />
        <Text style={styles.h1}>{t.title}</Text>
      </View>

      <View style={styles.segbar}>
        {SEGMENTS.map((s) => {
          const active = s.key === seg;
          return (
            <Pressable key={s.key} style={[styles.seg, active && styles.segActive]} onPress={() => setSeg(s.key)}>
              <Text style={[styles.segText, active && styles.segTextActive]}>{t[`${s.key}Label`]}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        initialNumToRender={8}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: TAB_BAR_SPACE + 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={theme.green} style={{ marginTop: 60 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{current.icon}</Text>
              <Text style={styles.emptyText}>{t[`${current.key}Empty`]}</Text>
            </View>
          )
        }
      />

      <TabBar active="activity" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { paddingTop: 64, paddingHorizontal: 16, paddingBottom: 8 },
  h1: { color: theme.ink, fontSize: 24, fontWeight: '800' },
  segbar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  seg: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  segActive: { backgroundColor: theme.green, borderColor: theme.green },
  segText: { color: theme.muted, fontWeight: '700', fontSize: 13 },
  segTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 90, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 52 },
  emptyText: { color: theme.muted, fontSize: 15, textAlign: 'center', marginTop: 14, lineHeight: 22 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.border },
  cardIcon: { fontSize: 26 },
  cardTitle: { color: theme.ink, fontSize: 15, fontWeight: '700' },
  cardSub: { color: theme.muted, fontSize: 13, marginTop: 2 },
  cardAmount: { color: theme.green, fontSize: 15, fontWeight: '800' },
  cardDate: { color: theme.muted, fontSize: 12, marginTop: 2 },
  pillRow: { flexDirection: 'row', marginTop: 6, marginLeft: 4 },
  pill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  pillLive: { backgroundColor: '#E4F7EC' },
  pillDone: { backgroundColor: '#EEF0F2' },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillTextLive: { color: theme.green },
  pillTextDone: { color: theme.muted },
});
