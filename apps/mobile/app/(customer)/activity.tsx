// Activity tab — recent rides, orders and bookings (Grab-style segmented view).
import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';
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

export default function ActivityScreen() {
  const [seg, setSeg] = useState<Seg>('rides');
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const current = SEGMENTS.find((s) => s.key === seg)!;

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

      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{current.icon}</Text>
          <Text style={styles.emptyText}>{t[`${current.key}Empty`]}</Text>
        </View>
      </ScrollView>

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
});
