// Customer super-app home — Grab-inspired.
// Green header + search, colorful service grid, gold promo banner, and the
// roadside-help categories. Tapping a service starts its flow.
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import {
  SERVICE_CATEGORIES,
  categoryLabel,
  type ServiceCategory,
  type Language,
} from '@angkorgo/shared';
import { theme, tileColors } from '../../lib/theme';
import { TabBar, TAB_BAR_SPACE } from '@/components/TabBar';
import { Mascot } from '@/components/Mascot';
import { TukiTukTuk } from '@/components/TukiTukTuk';
import { LocationLangBar } from '@/components/LocationLangBar';
import { useLocale } from '@/lib/locale';

const L: Record<Language, Record<string, string>> = {
  en: {
    hi: 'Hi there',
    searchPlaceholder: 'What do you need today?',
    catRides: 'Rides', catFoods: 'Foods', catShopping: 'Shopping', catStay: 'Stay & Travel', catFun: 'Entertainment',
    snaeh: 'Snaeh', movies: 'Movies', comingSoon: 'Coming soon', comingSoonMsg: 'Movies are coming soon to AngkorGo.',
    bus: 'Bus tickets', tours: 'Tours', soonBody: 'This feature is coming soon to AngkorGo.', flowers: 'Flowers Shop',
    ride: 'Ride', rent: 'Rent', airport: 'Airport', repair: 'Repair', schedule: 'Schedule', spin: 'Spin',
    food: 'Food', stay: 'Stay', express: 'Mail Express', mart: 'Mart', grocery: 'Grocery', host: 'Host', rewards: 'Rewards',
    topUp: 'Top up', coupons: 'Coupons', invite: 'Invite',
    ribbon: '50% OFF',
    promoTitle: 'Your first ride is on us',
    promoSub: "Welcome to AngkorGo — Cambodia's super-app",
    promo1Title: '50% off', promo1Sub: 'first ride',
    promo2Title: 'Free', promo2Sub: 'repair callout',
    promo3Title: '$0', promo3Sub: 'delivery fees',
    roadsideHelp: 'Roadside help',
    sosTitle: 'Emergency SOS',
    sosSub: 'Members · alert the nearest police station',
  },
  km: {
    hi: 'សួស្តី',
    searchPlaceholder: 'តើអ្នកត្រូវការអ្វីថ្ងៃនេះ?',
    catRides: 'ការជិះ', catFoods: 'អាហារ', catShopping: 'ទិញទំនិញ', catStay: 'ស្នាក់នៅ & ធ្វើដំណើរ', catFun: 'កម្សាន្ត',
    snaeh: 'ស្នេហ៍', movies: 'ភាពយន្ត', comingSoon: 'នឹងមកដល់ឆាប់ៗ', comingSoonMsg: 'ភាពយន្តនឹងមកដល់ AngkorGo ឆាប់ៗនេះ។',
    bus: 'សំបុត្រឡានក្រុង', tours: 'ដំណើរកម្សាន្ត', soonBody: 'មុខងារនេះនឹងមកដល់ AngkorGo ឆាប់ៗនេះ។', flowers: 'ហាងផ្កា',
    ride: 'ជិះ', rent: 'ជួល', airport: 'ព្រលានយន្តហោះ', repair: 'ជួសជុល', schedule: 'កំណត់ពេល', spin: 'បង្វិល',
    food: 'អាហារ', stay: 'ស្នាក់នៅ', express: 'ដឹកសំបុត្រ', mart: 'ផ្សារ', grocery: 'គ្រឿងទេស', host: 'ម្ចាស់ផ្ទះ', rewards: 'រង្វាន់',
    topUp: 'បញ្ចូលទឹកប្រាក់', coupons: 'គូប៉ុង', invite: 'អញ្ជើញ',
    ribbon: 'បញ្ចុះ 50%',
    promoTitle: 'ការជិះលើកដំបូងរបស់អ្នកគឺឥតគិតថ្លៃ',
    promoSub: 'សូមស្វាគមន៍មកកាន់ AngkorGo — កម្មវិធីរួមរបស់កម្ពុជា',
    promo1Title: 'បញ្ចុះ 50%', promo1Sub: 'ជិះលើកដំបូង',
    promo2Title: 'ឥតគិតថ្លៃ', promo2Sub: 'ហៅជួសជុល',
    promo3Title: '$0', promo3Sub: 'ថ្លៃដឹកជញ្ជូន',
    roadsideHelp: 'ជំនួយតាមផ្លូវ',
    sosTitle: 'អាសន្ន SOS',
    sosSub: 'សមាជិក · ជូនដំណឹងដល់ស្ថានីយ៍ប៉ូលិសនៅជិតបំផុត',
  },
  zh: {
    hi: '你好',
    searchPlaceholder: '今天需要什么？',
    catRides: '出行', catFoods: '美食', catShopping: '购物', catStay: '住宿与旅行', catFun: '娱乐',
    snaeh: 'Snaeh', movies: '电影', comingSoon: '即将推出', comingSoonMsg: '电影功能即将登陆 AngkorGo。',
    bus: '巴士车票', tours: '旅行团', soonBody: '此功能即将登陆 AngkorGo。', flowers: '花店',
    ride: '打车', rent: '租车', airport: '机场', repair: '维修', schedule: '预约', spin: '转盘',
    food: '美食', stay: '住宿', express: '邮件快递', mart: '商城', grocery: '生鲜', host: '房东', rewards: '奖励',
    topUp: '充值', coupons: '优惠券', invite: '邀请',
    ribbon: '5折优惠',
    promoTitle: '首次乘车免费',
    promoSub: '欢迎使用 AngkorGo — 柬埔寨超级应用',
    promo1Title: '5折', promo1Sub: '首次乘车',
    promo2Title: '免费', promo2Sub: '维修上门',
    promo3Title: '$0', promo3Sub: '配送费',
    roadsideHelp: '道路救援',
    sosTitle: '紧急 SOS',
    sosSub: '会员 · 提醒最近的警察局',
  },
};

export default function HomeScreen() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;

  const onSelect = (category: ServiceCategory) =>
    router.push({ pathname: '/(customer)/request/location', params: { category } });

  // The super-app service grid (icon tiles).
  // Grouped category cards (WOWNOW-style): a hero + labeled sub-icon grid.
  type Item = { label: string; icon: string; go: () => void };
  const groups: { title: string; hero: string; tile: string; items: Item[] }[] = [
    {
      title: t.catRides,
      hero: '🛺',
      tile: tileColors.green,
      items: [
        { label: t.ride, icon: '🛺', go: () => router.push('/(customer)/ride') },
        { label: t.rent, icon: '🚗', go: () => router.push('/(customer)/rentals') },
        { label: t.repair, icon: '🔧', go: () => onSelect('emergency_repair') },
        { label: t.schedule, icon: '🗓️', go: () => router.push('/(customer)/ride') },
      ],
    },
    {
      title: t.catFoods,
      hero: '🍜',
      tile: tileColors.peach,
      items: [
        { label: t.food, icon: '🍜', go: () => router.push('/(customer)/food') },
        { label: t.grocery, icon: '🥬', go: () => router.push('/(customer)/food') },
        { label: t.mart, icon: '🛒', go: () => router.push('/(customer)/food') },
      ],
    },
    {
      title: t.catShopping,
      hero: '🛍️',
      tile: tileColors.gold,
      items: [
        { label: t.express, icon: '📦', go: () => router.push('/(customer)/express') },
        { label: t.flowers, icon: '🌸', go: () => Linking.openURL('https://cambodiafloral.com') },
        { label: t.rewards, icon: '🎁', go: () => router.push('/(customer)/wallet') },
        { label: t.spin, icon: '🎡', go: () => router.push('/(customer)/spin') },
      ],
    },
    {
      title: t.catStay,
      hero: '🏠',
      tile: tileColors.lavender,
      items: [
        { label: t.stay, icon: '🏠', go: () => router.push('/(customer)/stays') },
        { label: t.airport, icon: '✈️', go: () => router.push('/(customer)/airport') },
        { label: t.bus, icon: '🚌', go: () => Alert.alert(t.comingSoon, t.soonBody) },
        { label: t.tours, icon: '🗺️', go: () => Alert.alert(t.comingSoon, t.soonBody) },
        { label: t.host, icon: '🔑', go: () => router.push('/(customer)/host') },
      ],
    },
    {
      title: t.catFun,
      hero: '🎉',
      tile: tileColors.pink,
      items: [
        { label: t.snaeh, icon: '💘', go: () => Linking.openURL('https://snaeh.com') },
        { label: t.movies, icon: '🎬', go: () => Alert.alert(t.comingSoon, t.comingSoonMsg) },
      ],
    },
  ];

  const subPromos = [
    { title: t.promo1Title, sub: t.promo1Sub, color: theme.greenSoft },
    { title: t.promo2Title, sub: t.promo2Sub, color: '#FFE8D6' },
    { title: t.promo3Title, sub: t.promo3Sub, color: '#FFF3C4' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + 16 }}>
        {/* Green header */}
        <View style={styles.header}>
          <LocationLangBar
            right={
              <Pressable onPress={() => router.push('/(customer)/account')} hitSlop={10} style={styles.mascot}>
                <Mascot size={38} />
              </Pressable>
            }
          />

          <Text style={styles.hi}>{t.hi} 👋</Text>

          <Pressable style={styles.search} onPress={() => router.push('/(customer)/ride')}>
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchText}>{t.searchPlaceholder}</Text>
          </Pressable>
        </View>

        {/* Emergency SOS — membership safety feature */}
        <Pressable style={styles.sosBanner} onPress={() => router.push('/(customer)/sos')}>
          <Text style={styles.sosBannerIcon}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sosBannerTitle}>{t.sosTitle}</Text>
            <Text style={styles.sosBannerSub}>{t.sosSub}</Text>
          </View>
          <Text style={styles.sosBannerChevron}>›</Text>
        </Pressable>

        {/* Grouped category cards */}
        {groups.map((g) => (
          <View key={g.title} style={styles.groupCard}>
            <Text style={styles.groupTitle}>{g.title}</Text>
            <View style={styles.groupBody}>
              <View style={[styles.groupHero, { backgroundColor: g.tile }]}>
                <Text style={styles.groupHeroEmoji}>{g.hero}</Text>
              </View>
              <View style={styles.groupGrid}>
                {g.items.map((it) => (
                  <Pressable key={it.label} style={styles.groupItem} onPress={it.go}>
                    <Text style={styles.groupItemIcon}>{it.icon}</Text>
                    <Text style={styles.groupItemLabel}>{it.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ))}

        {/* Quick actions (WOWNOW-style strip) */}
        <View style={styles.quickRow}>
          {[
            { icon: '💰', label: t.topUp, go: () => router.push('/(customer)/wallet') },
            { icon: '🎟️', label: t.coupons, go: () => router.push('/(customer)/wallet') },
            { icon: '👥', label: t.invite, go: () => router.push('/(customer)/account') },
            { icon: '🎁', label: t.rewards, go: () => router.push('/(customer)/wallet') },
          ].map((q) => (
            <Pressable key={q.label} style={styles.quickAction} onPress={q.go}>
              <View style={styles.quickIcon}>
                <Text style={styles.quickIconEmoji}>{q.icon}</Text>
              </View>
              <Text style={styles.quickActionLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Gold promo banner */}
        <View style={styles.promo}>
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>{t.ribbon}</Text>
          </View>
          <View style={styles.promoTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.promoTitle}>{t.promoTitle}</Text>
              <Text style={styles.promoSub}>{t.promoSub}</Text>
            </View>
            <TukiTukTuk width={132} />
          </View>
          <View style={styles.subPromos}>
            {subPromos.map((p) => (
              <View key={p.sub} style={[styles.subPromo, { backgroundColor: p.color }]}>
                <Text style={styles.subPromoTitle}>{p.title}</Text>
                <Text style={styles.subPromoSub}>{p.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Roadside help */}
        <Text style={styles.sectionTitle}>{t.roadsideHelp}</Text>
        <View style={styles.rescueGrid}>
          {SERVICE_CATEGORIES.map((c) => (
            <Pressable key={c} style={styles.rescueCard} onPress={() => onSelect(c)}>
              <View style={styles.rescueDot} />
              <Text style={styles.rescueLabel}>{categoryLabel(lang, c)}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <TabBar active="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },

  header: {
    backgroundColor: theme.greenDark,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mascot: { width: 44, height: 44, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  mascotEmoji: { fontSize: 24 },
  hi: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 16 },
  loc: { color: '#CFEAD9', fontSize: 13, marginTop: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  langChip: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  langText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  avatar: { width: 38, height: 38, borderRadius: 999, backgroundColor: theme.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#1C1C1C', fontWeight: '800', fontSize: 16 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 14, marginTop: 18,
  },
  searchIcon: { fontSize: 15 },
  searchText: { color: theme.muted, fontSize: 15 },

  sosBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FDECEA', borderRadius: 16, marginHorizontal: 16, marginTop: 16, padding: 16, borderWidth: 1, borderColor: '#F5C6C2' },
  sosBannerIcon: { fontSize: 26 },
  sosBannerTitle: { color: '#B71C1C', fontSize: 16, fontWeight: '900' },
  sosBannerSub: { color: '#7A2E2A', fontSize: 12.5, marginTop: 2 },
  sosBannerChevron: { color: '#B71C1C', fontSize: 26, fontWeight: '800' },

  groupCard: { backgroundColor: theme.card, borderRadius: 20, marginHorizontal: 16, marginTop: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  groupTitle: { color: theme.ink, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  groupBody: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  groupHero: { width: 76, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  groupHeroEmoji: { fontSize: 40 },
  groupGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  groupItem: { width: '33.333%', alignItems: 'center', paddingVertical: 8 },
  groupItemIcon: { fontSize: 24 },
  groupItemLabel: { color: theme.ink, fontSize: 11.5, fontWeight: '600', marginTop: 6 },

  quickRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 4, paddingBottom: 8 },
  quickAction: { alignItems: 'center', gap: 6 },
  quickIcon: { width: 52, height: 52, borderRadius: 999, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  quickIconEmoji: { fontSize: 22 },
  quickActionLabel: { color: theme.ink, fontSize: 12, fontWeight: '600' },

  promo: {
    backgroundColor: theme.goldSoft, borderRadius: 20, margin: 16, padding: 18,
    position: 'relative', overflow: 'hidden',
  },
  ribbon: {
    position: 'absolute', top: 14, right: -30, backgroundColor: theme.green,
    paddingHorizontal: 36, paddingVertical: 4, transform: [{ rotate: '45deg' }],
  },
  ribbonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  promoTop: { flexDirection: 'row', alignItems: 'center' },
  promoTitle: { color: '#5B4200', fontSize: 20, fontWeight: '900' },
  promoSub: { color: '#8A6D1F', fontSize: 13, marginTop: 4 },
  promoWat: { fontSize: 46 },
  subPromos: { flexDirection: 'row', gap: 10, marginTop: 16 },
  subPromo: { flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12 },
  subPromoTitle: { color: theme.ink, fontSize: 16, fontWeight: '900' },
  subPromoSub: { color: theme.muted, fontSize: 12, marginTop: 2 },

  sectionTitle: { color: theme.ink, fontSize: 18, fontWeight: '800', marginTop: 8, marginBottom: 12, marginHorizontal: 16 },
  rescueGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 },
  rescueCard: {
    width: '48%', backgroundColor: theme.card, borderRadius: 16, paddingVertical: 20, paddingHorizontal: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  rescueDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: theme.green },
  rescueLabel: { color: theme.ink, fontSize: 15, fontWeight: '700', flex: 1 },
});
