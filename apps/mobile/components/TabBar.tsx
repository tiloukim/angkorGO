// Grab-style bottom tab bar for the customer main screens.
// Renders on Home / Activity / Wallet / Account (not on deep booking flows),
// with a raised green center action to start a ride.
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/lib/theme';

export type TabKey = 'home' | 'activity' | 'wallet' | 'account';

// Bottom padding screens should reserve so content clears the bar.
export const TAB_BAR_SPACE = 96;

const TABS: { key: TabKey; label: string; icon: string; href: string }[] = [
  { key: 'home', label: 'Home', icon: '🏠', href: '/(customer)' },
  { key: 'activity', label: 'Activity', icon: '🧾', href: '/(customer)/activity' },
  { key: 'wallet', label: 'Wallet', icon: '👛', href: '/(customer)/wallet' },
  { key: 'account', label: 'Account', icon: '👤', href: '/(customer)/account' },
];

function TabButton({ tab, active, onPress }: { tab: (typeof TABS)[number]; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tab} onPress={onPress} hitSlop={8}>
      <Text style={[styles.icon, { opacity: active ? 1 : 0.85 }]}>{tab.icon}</Text>
      <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
    </Pressable>
  );
}

export function TabBar({ active }: { active: TabKey }) {
  const router = useRouter();
  const go = (href: string) => router.navigate(href as never);

  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)];

  return (
    <View style={styles.wrap}>
      <View style={styles.side}>
        {left.map((t) => (
          <TabButton key={t.key} tab={t} active={active === t.key} onPress={() => go(t.href)} />
        ))}
      </View>

      {/* Center action — start a ride */}
      <Pressable style={styles.centerWrap} onPress={() => router.push('/(customer)/ride' as never)} hitSlop={8}>
        <View style={styles.center}>
          <Text style={styles.centerIcon}>🛺</Text>
        </View>
        <Text style={styles.centerLabel}>Ride</Text>
      </Pressable>

      <View style={styles.side}>
        {right.map((t) => (
          <TabButton key={t.key} tab={t} active={active === t.key} onPress={() => go(t.href)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingHorizontal: 12,
  },
  side: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  tab: { alignItems: 'center', gap: 3, minWidth: 56 },
  icon: { fontSize: 20 },
  label: { fontSize: 11, fontWeight: '600', color: theme.muted },
  labelActive: { color: theme.green },
  centerWrap: { alignItems: 'center', width: 72, gap: 3 },
  center: {
    width: 56,
    height: 56,
    borderRadius: 999,
    marginTop: -24,
    backgroundColor: theme.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: theme.card,
  },
  centerIcon: { fontSize: 26 },
  centerLabel: { fontSize: 11, fontWeight: '700', color: theme.green },
});
