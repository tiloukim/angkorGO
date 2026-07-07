// Wallet tab — balance, top-up, and linked payment methods.
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { PAYMENT_METHODS } from '@angkorgo/shared';
import { theme } from '@/lib/theme';
import { TabBar, TAB_BAR_SPACE } from '@/components/TabBar';

const METHOD_ICON: Record<string, string> = {
  khqr: '📱', aba_payway: '🏦', wing: '🕊️', acleda: '🏛️', stripe: '💳', cash: '💵',
};

export default function WalletScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + 24 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Wallet</Text>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>AngkorGo balance</Text>
          <Text style={styles.balance}>$0.00</Text>
          <Pressable style={styles.topUp}>
            <Text style={styles.topUpText}>+ Top up</Text>
          </Pressable>
        </View>

        {/* Rewards strip */}
        <View style={styles.rewards}>
          <Text style={styles.rewardsIcon}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rewardsTitle}>0 points</Text>
            <Text style={styles.rewardsSub}>Earn points on every ride, order & booking</Text>
          </View>
        </View>

        {/* Payment methods */}
        <Text style={styles.section}>Payment methods</Text>
        <View style={styles.methods}>
          {PAYMENT_METHODS.map((m) => (
            <Pressable key={m.method} style={styles.method}>
              <Text style={styles.methodIcon}>{METHOD_ICON[m.method] ?? '💳'}</Text>
              <Text style={styles.methodLabel}>{m.label}</Text>
              <Text style={styles.methodAdd}>Link →</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <TabBar active="wallet" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  h1: { color: theme.ink, fontSize: 24, fontWeight: '800', marginTop: 64, marginHorizontal: 16, marginBottom: 16 },

  balanceCard: { backgroundColor: theme.green, borderRadius: 20, padding: 22, marginHorizontal: 16 },
  balanceLabel: { color: '#DDF3E6', fontSize: 13, fontWeight: '600' },
  balance: { color: '#fff', fontSize: 40, fontWeight: '900', marginTop: 6 },
  topUp: { alignSelf: 'flex-start', marginTop: 16, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10 },
  topUpText: { color: theme.greenDark, fontWeight: '800' },

  rewards: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.goldSoft, borderRadius: 16, padding: 16, margin: 16 },
  rewardsIcon: { fontSize: 30 },
  rewardsTitle: { color: '#5B4200', fontSize: 16, fontWeight: '900' },
  rewardsSub: { color: '#8A6D1F', fontSize: 12.5, marginTop: 2 },

  section: { color: theme.ink, fontSize: 18, fontWeight: '800', marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
  methods: { marginHorizontal: 16, gap: 10 },
  method: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border,
  },
  methodIcon: { fontSize: 22 },
  methodLabel: { color: theme.ink, fontSize: 15, fontWeight: '700', flex: 1 },
  methodAdd: { color: theme.green, fontSize: 13, fontWeight: '700' },
});
