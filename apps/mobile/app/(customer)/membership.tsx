// AngkorGo Membership — subscribe to unlock member perks (Emergency SOS).
// SANDBOX: start_membership activates immediately; real ABA PayWay gating is a TODO.
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { theme } from '@/lib/theme';
import { BackButton } from '@/components/BackButton';
import { useMembership } from '@/hooks/useMembership';
import type { Language } from '@angkorgo/shared';

const L: Record<Language, Record<string, string>> = {
  en: {
    title: 'AngkorGo Membership',
    sub: 'Extra safety & perks for everyday travel in Cambodia.',
    perk1Title: 'Emergency SOS',
    perk1Sub: 'One tap alerts the nearest police station with your live location.',
    perk2Title: 'Priority support',
    perk2Sub: '24/7 help when you need it most.',
    perk3Title: 'Member deals',
    perk3Sub: 'Exclusive discounts across rides, food & more.',
    perMonth: '/ month',
    subscribe: 'Subscribe',
    activeUntil: 'Membership active until',
    manage: 'You are a member',
    thanksTitle: "You're a member!",
    thanksMsg: 'Emergency SOS and member perks are now unlocked.',
    failed: 'Could not subscribe',
    disclaimer: 'This does not replace emergency services. For immediate danger, call 117 (Police) directly.',
    goSos: 'Open Emergency SOS',
  },
  km: {
    title: 'សមាជិកភាព AngkorGo',
    sub: 'សុវត្ថិភាព និងអត្ថប្រយោជន៍បន្ថែមសម្រាប់ការធ្វើដំណើរប្រចាំថ្ងៃនៅកម្ពុជា។',
    perk1Title: 'អាសន្ន SOS',
    perk1Sub: 'ចុចម្តងជូនដំណឹងដល់ស្ថានីយ៍ប៉ូលិសនៅជិតបំផុតជាមួយទីតាំងផ្ទាល់របស់អ្នក។',
    perk2Title: 'ការគាំទ្រអាទិភាព',
    perk2Sub: 'ជំនួយ 24/7 នៅពេលអ្នកត្រូវការបំផុត។',
    perk3Title: 'ការផ្តល់ជូនសមាជិក',
    perk3Sub: 'ការបញ្ចុះតម្លៃពិសេសលើការជិះ អាហារ និងច្រើនទៀត។',
    perMonth: '/ ខែ',
    subscribe: 'ជាវ',
    activeUntil: 'សមាជិកភាពសកម្មរហូតដល់',
    manage: 'អ្នកគឺជាសមាជិក',
    thanksTitle: 'អ្នកគឺជាសមាជិក!',
    thanksMsg: 'អាសន្ន SOS និងអត្ថប្រយោជន៍សមាជិកត្រូវបានដោះសោឥឡូវនេះ។',
    failed: 'មិនអាចជាវបានទេ',
    disclaimer: 'វាមិនជំនួសសេវាអាសន្នទេ។ សម្រាប់គ្រោះថ្នាក់បន្ទាន់ សូមទូរស័ព្ទ 117 (ប៉ូលិស) ដោយផ្ទាល់។',
    goSos: 'បើកអាសន្ន SOS',
  },
  zh: {
    title: 'AngkorGo 会员',
    sub: '为柬埔寨的日常出行提供额外的安全与福利。',
    perk1Title: '紧急 SOS',
    perk1Sub: '一键将您的实时位置发送给最近的警察局。',
    perk2Title: '优先支持',
    perk2Sub: '全天候为您提供帮助。',
    perk3Title: '会员优惠',
    perk3Sub: '打车、美食等专享折扣。',
    perMonth: '/ 月',
    subscribe: '订阅',
    activeUntil: '会员有效期至',
    manage: '您是会员',
    thanksTitle: '您已成为会员！',
    thanksMsg: '紧急 SOS 和会员福利现已解锁。',
    failed: '无法订阅',
    disclaimer: '此功能不能替代紧急服务。如遇紧急危险，请直接拨打 117（警察）。',
    goSos: '打开紧急 SOS',
  },
};

export default function MembershipScreen() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const { isMember, membershipUntil, refresh } = useMembership();
  const [fee, setFee] = useState(2);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('platform_config').select('value').eq('key', 'membership_monthly_fee').maybeSingle()
      .then(({ data }) => { const v = Number(data?.value); if (!isNaN(v) && v > 0) setFee(v); });
  }, []);

  async function subscribe() {
    setBusy(true);
    const { error } = await supabase.rpc('start_membership', { p_method: 'khqr' });
    setBusy(false);
    if (error) return Alert.alert(t.failed, error.message);
    await refresh();
    Alert.alert(t.thanksTitle, t.thanksMsg, [{ text: t.goSos, onPress: () => router.replace('/(customer)/sos') }]);
  }

  const perks = [
    { icon: '🚨', title: t.perk1Title, sub: t.perk1Sub },
    { icon: '🎧', title: t.perk2Title, sub: t.perk2Sub },
    { icon: '🎁', title: t.perk3Title, sub: t.perk3Sub },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}><BackButton variant="light" /></View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Text style={styles.hero}>👑</Text>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.sub}>{t.sub}</Text>

        {isMember && membershipUntil && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeText}>✓ {t.activeUntil} {new Date(membershipUntil).toLocaleDateString()}</Text>
          </View>
        )}

        <View style={styles.perks}>
          {perks.map((p) => (
            <View key={p.title} style={styles.perk}>
              <Text style={styles.perkIcon}>{p.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.perkTitle}>{p.title}</Text>
                <Text style={styles.perkSub}>{p.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {!isMember ? (
          <Pressable style={[styles.cta, busy && { opacity: 0.6 }]} onPress={subscribe} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.ctaText}>{t.subscribe} · ${fee.toFixed(2)} {t.perMonth}</Text>
            )}
          </Pressable>
        ) : (
          <Pressable style={styles.cta} onPress={() => router.replace('/(customer)/sos')}>
            <Text style={styles.ctaText}>{t.goSos}</Text>
          </Pressable>
        )}

        <Text style={styles.disclaimer}>⚠️ {t.disclaimer}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 4 },
  hero: { fontSize: 48, textAlign: 'center' },
  title: { color: theme.ink, fontSize: 26, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  sub: { color: theme.muted, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 21 },
  activeBadge: { backgroundColor: theme.greenSoft, borderRadius: 12, padding: 14, marginTop: 20 },
  activeText: { color: theme.greenDark, fontWeight: '800', textAlign: 'center' },
  perks: { marginTop: 24, gap: 12 },
  perk: { flexDirection: 'row', gap: 14, backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  perkIcon: { fontSize: 28 },
  perkTitle: { color: theme.ink, fontSize: 16, fontWeight: '800' },
  perkSub: { color: theme.muted, fontSize: 13, marginTop: 2, lineHeight: 18 },
  cta: { backgroundColor: theme.green, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 28 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  disclaimer: { color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 18 },
});
