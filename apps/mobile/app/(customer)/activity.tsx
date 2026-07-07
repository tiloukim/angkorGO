// Activity tab — recent rides, orders and bookings (Grab-style segmented view).
import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';
import { TabBar, TAB_BAR_SPACE } from '@/components/TabBar';

type Seg = 'rides' | 'food' | 'stays';
const SEGMENTS: { key: Seg; label: string; icon: string; empty: string }[] = [
  { key: 'rides', label: 'Rides', icon: '🛺', empty: 'No rides yet — your trips will show here.' },
  { key: 'food', label: 'Food', icon: '🍜', empty: 'No orders yet — your food orders will show here.' },
  { key: 'stays', label: 'Bookings', icon: '🏠', empty: 'No bookings yet — rentals & stays will show here.' },
];

export default function ActivityScreen() {
  const [seg, setSeg] = useState<Seg>('rides');
  const current = SEGMENTS.find((s) => s.key === seg)!;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>Your activity</Text>
      </View>

      <View style={styles.segbar}>
        {SEGMENTS.map((s) => {
          const active = s.key === seg;
          return (
            <Pressable key={s.key} style={[styles.seg, active && styles.segActive]} onPress={() => setSeg(s.key)}>
              <Text style={[styles.segText, active && styles.segTextActive]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{current.icon}</Text>
          <Text style={styles.emptyText}>{current.empty}</Text>
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
