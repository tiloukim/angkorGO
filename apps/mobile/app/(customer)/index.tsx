// Customer super-app home — Grab-inspired.
// Green header + search, colorful service grid, gold promo banner, and the
// roadside-help categories. Tapping a service starts its flow.
import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  SERVICE_CATEGORIES,
  LANGUAGES,
  categoryLabel,
  type Language,
  type ServiceCategory,
} from '@angkorgo/shared';
import { theme, tileColors } from '../../lib/theme';
import { TabBar, TAB_BAR_SPACE } from '@/components/TabBar';

export default function HomeScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');

  const nextIndex = (LANGUAGES.findIndex((l) => l.code === lang) + 1) % LANGUAGES.length;
  const nextLang = () => setLang(LANGUAGES[nextIndex].code);

  const onSelect = (category: ServiceCategory) =>
    router.push({ pathname: '/(customer)/request/location', params: { category } });

  // The super-app service grid (icon tiles).
  // Grouped category cards (WOWNOW-style): a hero + labeled sub-icon grid.
  type Item = { label: string; icon: string; go: () => void };
  const groups: { title: string; hero: string; tile: string; items: Item[] }[] = [
    {
      title: 'Get around',
      hero: '🛺',
      tile: tileColors.green,
      items: [
        { label: 'Ride', icon: '🛺', go: () => router.push('/(customer)/ride') },
        { label: 'Rent', icon: '🚗', go: () => router.push('/(customer)/rentals') },
        { label: 'Airport', icon: '✈️', go: () => router.push('/(customer)/ride') },
        { label: 'Repair', icon: '🔧', go: () => onSelect('emergency_repair') },
        { label: 'Schedule', icon: '🗓️', go: () => router.push('/(customer)/ride') },
        { label: 'Spin', icon: '🎡', go: () => router.push('/(customer)/wallet') },
      ],
    },
    {
      title: 'Order & shop',
      hero: '🍜',
      tile: tileColors.peach,
      items: [
        { label: 'Food', icon: '🍜', go: () => router.push('/(customer)/food') },
        { label: 'Stay', icon: '🏠', go: () => router.push('/(customer)/stays') },
        { label: 'Mart', icon: '🛒', go: () => router.push('/(customer)/food') },
        { label: 'Grocery', icon: '🥬', go: () => router.push('/(customer)/food') },
        { label: 'Host', icon: '🔑', go: () => router.push('/(customer)/host') },
        { label: 'Rewards', icon: '🎁', go: () => router.push('/(customer)/wallet') },
      ],
    },
  ];

  const subPromos = [
    { title: '50% off', sub: 'first ride', color: theme.greenSoft },
    { title: 'Free', sub: 'repair callout', color: '#FFE8D6' },
    { title: '$0', sub: 'delivery fees', color: '#FFF3C4' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + 16 }}>
        {/* Green header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.greetRow}>
              <View style={styles.mascot}>
                <Text style={styles.mascotEmoji}>🐘</Text>
              </View>
              <View>
                <Text style={styles.hi}>Hi there 👋</Text>
                <Text style={styles.loc}>📍 Phnom Penh ▾</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable onPress={nextLang} hitSlop={10} style={styles.langChip}>
                <Text style={styles.langText}>{LANGUAGES[nextIndex].code.toUpperCase()}</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/(customer)/account')} hitSlop={10} style={styles.avatar}>
                <Text style={styles.avatarText}>A</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.search} onPress={() => router.push('/(customer)/ride')}>
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchText}>What do you need today?</Text>
          </Pressable>
        </View>

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
            { icon: '💰', label: 'Top up', go: () => router.push('/(customer)/wallet') },
            { icon: '🎟️', label: 'Coupons', go: () => router.push('/(customer)/wallet') },
            { icon: '👥', label: 'Invite', go: () => router.push('/(customer)/account') },
            { icon: '🎁', label: 'Rewards', go: () => router.push('/(customer)/wallet') },
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
            <Text style={styles.ribbonText}>50% OFF</Text>
          </View>
          <View style={styles.promoTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.promoTitle}>Your first ride is on us</Text>
              <Text style={styles.promoSub}>Welcome to AngkorGo — Cambodia&apos;s super-app</Text>
            </View>
            <Text style={styles.promoWat}>🛕</Text>
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
        <Text style={styles.sectionTitle}>Roadside help</Text>
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
  hi: { color: '#fff', fontSize: 20, fontWeight: '800' },
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
