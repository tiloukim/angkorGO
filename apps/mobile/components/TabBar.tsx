// Grab-style bottom tab bar for the customer main screens.
// Renders on Home / Activity / Wallet / Account (not on deep booking flows),
// with a raised red center action for Emergency SOS (always one tap away).
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { type Language } from '@angkorgo/shared';
import { theme } from '@/lib/theme';
import { useLocale } from '@/lib/locale';

export type TabKey = 'home' | 'activity' | 'wallet' | 'account';

// Bottom padding screens should reserve so content clears the bar.
export const TAB_BAR_SPACE = 96;

const L: Record<Language, Record<string, string>> = {
  en: { home: 'Home', activity: 'Activity', ride: 'Ride', wallet: 'Wallet', account: 'Account', sos: 'SOS' },
  km: { home: 'ទំព័រដើម', activity: 'សកម្មភាព', ride: 'ដំណើរ', wallet: 'កាបូប', account: 'គណនី', sos: 'អាសន្ន' },
  zh: { home: '首页', activity: '活动', ride: '行程', wallet: '钱包', account: '账户', sos: '紧急' },
};

const TABS: { key: TabKey; icon: string; href: string }[] = [
  { key: 'home', icon: '🏠', href: '/(customer)' },
  { key: 'activity', icon: '🧾', href: '/(customer)/activity' },
  { key: 'wallet', icon: '👛', href: '/(customer)/wallet' },
  { key: 'account', icon: '👤', href: '/(customer)/account' },
];

function TabButton({ tab, label, active, onPress }: { tab: (typeof TABS)[number]; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tab} onPress={onPress} hitSlop={8}>
      <Text style={[styles.icon, { opacity: active ? 1 : 0.85 }]}>{tab.icon}</Text>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

export function TabBar({ active }: { active: TabKey }) {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const go = (href: string) => router.navigate(href as never);

  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)];

  return (
    <View style={styles.wrap}>
      <View style={styles.side}>
        {left.map((tab) => (
          <TabButton key={tab.key} tab={tab} label={t[tab.key]} active={active === tab.key} onPress={() => go(tab.href)} />
        ))}
      </View>

      {/* Center action — Emergency SOS (always reachable) */}
      <Pressable style={styles.centerWrap} onPress={() => router.push('/(customer)/sos' as never)} hitSlop={8}>
        <View style={[styles.center, styles.centerSos]}>
          <Text style={styles.centerIcon}>🚨</Text>
        </View>
        <Text style={[styles.centerLabel, styles.centerLabelSos]}>{t.sos}</Text>
      </Pressable>

      <View style={styles.side}>
        {right.map((tab) => (
          <TabButton key={tab.key} tab={tab} label={t[tab.key]} active={active === tab.key} onPress={() => go(tab.href)} />
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
  centerSos: { backgroundColor: '#E5484D' },
  centerIcon: { fontSize: 26 },
  centerLabel: { fontSize: 11, fontWeight: '700', color: theme.green },
  centerLabelSos: { color: '#E5484D' },
});
