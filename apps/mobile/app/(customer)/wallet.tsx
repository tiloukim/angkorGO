// Wallet tab — balance, top-up, and linked payment methods.
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { PAYMENT_METHODS, type Language } from '@angkorgo/shared';
import { theme } from '@/lib/theme';
import { TabBar, TAB_BAR_SPACE } from '@/components/TabBar';
import { useLocale } from '@/lib/locale';

const METHOD_ICON: Record<string, string> = {
  khqr: '📱', aba_payway: '🏦', wing: '🕊️', acleda: '🏛️', stripe: '💳', cash: '💵',
};

const L: Record<Language, Record<string, string>> = {
  en: {
    title: 'Wallet',
    balanceLabel: 'AngkorGo balance',
    topUp: '+ Top up',
    points: '0 points',
    rewardsSub: 'Earn points on every ride, order & booking',
    paymentMethods: 'Payment methods',
    link: 'Link →',
  },
  km: {
    title: 'កាបូប',
    balanceLabel: 'សមតុល្យ AngkorGo',
    topUp: '+ បញ្ចូលទឹកប្រាក់',
    points: '0 ពិន្ទុ',
    rewardsSub: 'ទទួលបានពិន្ទុរាល់ការជិះ ការកម្ម៉ង់ និងការកក់',
    paymentMethods: 'មធ្យោបាយបង់ប្រាក់',
    link: 'ភ្ជាប់ →',
  },
  zh: {
    title: '钱包',
    balanceLabel: 'AngkorGo 余额',
    topUp: '+ 充值',
    points: '0 积分',
    rewardsSub: '每次乘车、订购和预订均可赚取积分',
    paymentMethods: '支付方式',
    link: '绑定 →',
  },
};

export default function WalletScreen() {
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + 24 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>{t.title}</Text>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t.balanceLabel}</Text>
          <Text style={styles.balance}>$0.00</Text>
          <Pressable style={styles.topUp}>
            <Text style={styles.topUpText}>{t.topUp}</Text>
          </Pressable>
        </View>

        {/* Rewards strip */}
        <View style={styles.rewards}>
          <Text style={styles.rewardsIcon}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rewardsTitle}>{t.points}</Text>
            <Text style={styles.rewardsSub}>{t.rewardsSub}</Text>
          </View>
        </View>

        {/* Payment methods */}
        <Text style={styles.section}>{t.paymentMethods}</Text>
        <View style={styles.methods}>
          {PAYMENT_METHODS.map((m) => (
            <Pressable key={m.method} style={styles.method}>
              <Text style={styles.methodIcon}>{METHOD_ICON[m.method] ?? '💳'}</Text>
              <Text style={styles.methodLabel}>{m.label}</Text>
              <Text style={styles.methodAdd}>{t.link}</Text>
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
