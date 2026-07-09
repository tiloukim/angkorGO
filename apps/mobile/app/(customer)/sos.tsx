// Emergency SOS — membership-gated. One tap alerts the nearest police station
// with the member's live location. NOT a substitute for calling 117 directly;
// the disclaimer + a Call-117 button are always shown (never gated).
import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { theme } from '@/lib/theme';
import { BackButton } from '@/components/BackButton';
import { useMembership } from '@/hooks/useMembership';
import { getCurrentCoords } from '@/lib/location';
import type { Language } from '@angkorgo/shared';

const RED = '#E5302A';
const RED_DARK = '#B71C1C';

const L: Record<Language, Record<string, string>> = {
  en: {
    title: 'Emergency SOS',
    memberOnly: 'Emergency SOS is a membership feature',
    memberOnlySub: 'Subscribe to alert the nearest police station with one tap.',
    getMembership: 'Get membership',
    pressButton: 'PRESS FOR EMERGENCY',
    pressSub: 'Alerts the nearest police station with your live location.',
    confirmTitle: 'Send emergency alert?',
    confirmMsg: 'This alerts the nearest police station with your location. For immediate danger, call 117 now.',
    cancel: 'Cancel',
    alertNow: 'Alert police',
    sentTitle: '🚨 Alert sent',
    sentSub: 'Help requested. Stay safe — call 117 if you are in danger.',
    acknowledged: '✓ Police acknowledged your alert',
    nearestStation: 'Nearest station',
    away: 'away',
    call117: 'Call 117 (Police)',
    callStation: 'Call station',
    cancelAlert: 'Cancel alert',
    numbers: 'Cambodia emergency numbers',
    police: 'Police', ambulance: 'Ambulance', fire: 'Fire',
    disclaimer: 'This does not replace emergency services. For immediate danger, call 117 (Police) directly.',
    failed: 'Could not send alert',
  },
  km: {
    title: 'អាសន្ន SOS',
    memberOnly: 'អាសន្ន SOS គឺជាមុខងារសមាជិកភាព',
    memberOnlySub: 'ជាវដើម្បីជូនដំណឹងដល់ស្ថានីយ៍ប៉ូលិសនៅជិតបំផុតដោយចុចម្តង។',
    getMembership: 'ទទួលបានសមាជិកភាព',
    pressButton: 'ចុចសម្រាប់អាសន្ន',
    pressSub: 'ជូនដំណឹងដល់ស្ថានីយ៍ប៉ូលិសនៅជិតបំផុតជាមួយទីតាំងផ្ទាល់របស់អ្នក។',
    confirmTitle: 'ផ្ញើការជូនដំណឹងអាសន្ន?',
    confirmMsg: 'វាជូនដំណឹងដល់ស្ថានីយ៍ប៉ូលិសនៅជិតបំផុតជាមួយទីតាំងរបស់អ្នក។ សម្រាប់គ្រោះថ្នាក់បន្ទាន់ សូមទូរស័ព្ទ 117 ឥឡូវនេះ។',
    cancel: 'បោះបង់',
    alertNow: 'ជូនដំណឹងប៉ូលិស',
    sentTitle: '🚨 បានផ្ញើការជូនដំណឹង',
    sentSub: 'បានស្នើសុំជំនួយ។ សូមរក្សាសុវត្ថិភាព — ទូរស័ព្ទ 117 ប្រសិនបើអ្នកមានគ្រោះថ្នាក់។',
    acknowledged: '✓ ប៉ូលិសបានទទួលស្គាល់ការជូនដំណឹងរបស់អ្នក',
    nearestStation: 'ស្ថានីយ៍ជិតបំផុត',
    away: 'ឆ្ងាយ',
    call117: 'ទូរស័ព្ទ 117 (ប៉ូលិស)',
    callStation: 'ទូរស័ព្ទស្ថានីយ៍',
    cancelAlert: 'បោះបង់ការជូនដំណឹង',
    numbers: 'លេខអាសន្នកម្ពុជា',
    police: 'ប៉ូលិស', ambulance: 'រថពេទ្យ', fire: 'ពន្លត់អគ្គិភ័យ',
    disclaimer: 'វាមិនជំនួសសេវាអាសន្នទេ។ សម្រាប់គ្រោះថ្នាក់បន្ទាន់ សូមទូរស័ព្ទ 117 (ប៉ូលិស) ដោយផ្ទាល់។',
    failed: 'មិនអាចផ្ញើការជូនដំណឹងបានទេ',
  },
  zh: {
    title: '紧急 SOS',
    memberOnly: '紧急 SOS 是会员功能',
    memberOnlySub: '订阅后一键提醒最近的警察局。',
    getMembership: '开通会员',
    pressButton: '按下求救',
    pressSub: '将您的实时位置发送给最近的警察局。',
    confirmTitle: '发送紧急警报？',
    confirmMsg: '这会将您的位置发送给最近的警察局。如遇紧急危险，请立即拨打 117。',
    cancel: '取消',
    alertNow: '通知警察',
    sentTitle: '🚨 警报已发送',
    sentSub: '已请求帮助。请注意安全——如遇危险请拨打 117。',
    acknowledged: '✓ 警方已确认您的警报',
    nearestStation: '最近的警察局',
    away: '距离',
    call117: '拨打 117（警察）',
    callStation: '致电警察局',
    cancelAlert: '取消警报',
    numbers: '柬埔寨紧急电话',
    police: '警察', ambulance: '救护车', fire: '消防',
    disclaimer: '此功能不能替代紧急服务。如遇紧急危险，请直接拨打 117（警察）。',
    failed: '无法发送警报',
  },
};

type ActiveAlert = { id: string; status: string; stationName: string | null; stationPhone: string | null; distanceKm: number | null };

export default function SosScreen() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const { isMember, loading: memberLoading } = useMembership();
  const [alert, setAlert] = useState<ActiveAlert | null>(null);
  const [busy, setBusy] = useState(false);

  const loadActive = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('emergency_alerts')
      .select('id, status, station_id')
      .eq('member_id', user.id).in('status', ['active', 'acknowledged'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!data) { setAlert(null); return; }
    let name: string | null = null, phone: string | null = null;
    if (data.station_id) {
      const { data: st } = await supabase.from('police_stations').select('name, phone').eq('id', data.station_id).maybeSingle();
      name = (st?.name as string) ?? null; phone = (st?.phone as string) ?? null;
    }
    setAlert({ id: data.id, status: data.status as string, stationName: name, stationPhone: phone, distanceKm: null });
  }, []);

  useEffect(() => { loadActive(); }, [loadActive]);

  // Live status of the active alert.
  useEffect(() => {
    if (!alert) return;
    const ch = supabase.channel(`alert:${alert.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emergency_alerts', filter: `id=eq.${alert.id}` },
        (payload) => {
          const s = (payload.new as any).status as string;
          if (s === 'cancelled' || s === 'resolved') setAlert(null);
          else setAlert((a) => (a ? { ...a, status: s } : a));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [alert?.id]);

  function confirmSend() {
    Alert.alert(t.confirmTitle, t.confirmMsg, [
      { text: t.cancel, style: 'cancel' },
      { text: t.alertNow, style: 'destructive', onPress: send },
    ]);
  }

  async function send() {
    setBusy(true);
    try {
      const c = await getCurrentCoords();
      const { data, error } = await supabase.rpc('trigger_emergency', { p_lng: c.lng, p_lat: c.lat, p_note: null });
      if (error) throw error;
      const r = Array.isArray(data) ? data[0] : data;
      if (r) setAlert({ id: r.alert_id, status: 'active', stationName: r.station_name, stationPhone: r.station_phone, distanceKm: r.distance_km });
    } catch (e: any) {
      Alert.alert(t.failed, e.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!alert) return;
    await supabase.rpc('cancel_emergency', { p_alert: alert.id });
    setAlert(null);
  }

  const Numbers = () => (
    <View style={styles.numbers}>
      <Text style={styles.numbersTitle}>{t.numbers}</Text>
      <View style={styles.numberRow}>
        {[{ n: '117', l: t.police }, { n: '119', l: t.ambulance }, { n: '118', l: t.fire }].map((x) => (
          <Pressable key={x.n} style={styles.numberChip} onPress={() => Linking.openURL(`tel:${x.n}`)}>
            <Text style={styles.numberN}>{x.n}</Text>
            <Text style={styles.numberL}>{x.l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const Disclaimer = () => <Text style={styles.disclaimer}>⚠️ {t.disclaimer}</Text>;

  return (
    <View style={styles.container}>
      <View style={styles.header}><BackButton variant="light" /></View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Text style={styles.title}>{t.title}</Text>

        {memberLoading ? (
          <ActivityIndicator color={RED} style={{ marginTop: 40 }} />
        ) : !isMember ? (
          // Gated — but calling 117 is never gated.
          <>
            <View style={styles.gate}>
              <Text style={styles.gateIcon}>🔒</Text>
              <Text style={styles.gateTitle}>{t.memberOnly}</Text>
              <Text style={styles.gateSub}>{t.memberOnlySub}</Text>
              <Pressable style={styles.gateCta} onPress={() => router.push('/(customer)/membership')}>
                <Text style={styles.gateCtaText}>{t.getMembership}</Text>
              </Pressable>
            </View>
            <Pressable style={styles.call117} onPress={() => Linking.openURL('tel:117')}>
              <Text style={styles.call117Text}>📞 {t.call117}</Text>
            </Pressable>
            <Numbers />
            <Disclaimer />
          </>
        ) : alert ? (
          // Active alert view.
          <>
            <View style={styles.sentCard}>
              <Text style={styles.sentTitle}>{t.sentTitle}</Text>
              <Text style={styles.sentSub}>{t.sentSub}</Text>
              {alert.status === 'acknowledged' && <Text style={styles.ack}>{t.acknowledged}</Text>}
            </View>

            {alert.stationName && (
              <View style={styles.stationCard}>
                <Text style={styles.stationLabel}>{t.nearestStation}</Text>
                <Text style={styles.stationName}>{alert.stationName}</Text>
                {alert.distanceKm != null && <Text style={styles.stationMeta}>{alert.distanceKm} km {t.away}</Text>}
              </View>
            )}

            <Pressable style={styles.call117} onPress={() => Linking.openURL('tel:117')}>
              <Text style={styles.call117Text}>📞 {t.call117}</Text>
            </Pressable>
            {alert.stationPhone && (
              <Pressable style={styles.callStation} onPress={() => Linking.openURL(`tel:${alert.stationPhone}`)}>
                <Text style={styles.callStationText}>☎️ {t.callStation}</Text>
              </Pressable>
            )}
            <Pressable style={styles.cancelBtn} onPress={cancel}>
              <Text style={styles.cancelText}>{t.cancelAlert}</Text>
            </Pressable>
            <Numbers />
            <Disclaimer />
          </>
        ) : (
          // Member, no active alert — the big SOS button.
          <>
            <Pressable style={[styles.sosButton, busy && { opacity: 0.7 }]} onPress={confirmSend} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" size="large" /> : (
                <>
                  <Text style={styles.sosIcon}>🚨</Text>
                  <Text style={styles.sosText}>{t.pressButton}</Text>
                </>
              )}
            </Pressable>
            <Text style={styles.pressSub}>{t.pressSub}</Text>
            <Pressable style={styles.call117} onPress={() => Linking.openURL('tel:117')}>
              <Text style={styles.call117Text}>📞 {t.call117}</Text>
            </Pressable>
            <Numbers />
            <Disclaimer />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 4 },
  title: { color: theme.ink, fontSize: 26, fontWeight: '900', marginBottom: 20 },

  sosButton: { backgroundColor: RED, borderRadius: 999, aspectRatio: 1, alignSelf: 'center', width: '78%', alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowColor: RED_DARK, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  sosIcon: { fontSize: 56 },
  sosText: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 8, textAlign: 'center', letterSpacing: 0.5 },
  pressSub: { color: theme.muted, fontSize: 14, textAlign: 'center', marginTop: 20, lineHeight: 20 },

  gate: { backgroundColor: theme.card, borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  gateIcon: { fontSize: 40 },
  gateTitle: { color: theme.ink, fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  gateSub: { color: theme.muted, fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  gateCta: { backgroundColor: theme.green, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, marginTop: 18 },
  gateCtaText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  sentCard: { backgroundColor: '#FDECEA', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#F5C6C2' },
  sentTitle: { color: RED_DARK, fontSize: 22, fontWeight: '900' },
  sentSub: { color: '#7A2E2A', fontSize: 14, marginTop: 8, lineHeight: 20 },
  ack: { color: theme.greenDark, fontWeight: '800', marginTop: 12 },
  stationCard: { backgroundColor: theme.card, borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1, borderColor: theme.border },
  stationLabel: { color: theme.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  stationName: { color: theme.ink, fontSize: 18, fontWeight: '800', marginTop: 4 },
  stationMeta: { color: theme.muted, fontSize: 13, marginTop: 2 },

  call117: { backgroundColor: RED, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 20 },
  call117Text: { color: '#fff', fontSize: 17, fontWeight: '900' },
  callStation: { backgroundColor: theme.card, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 12, borderWidth: 1.5, borderColor: RED },
  callStationText: { color: RED_DARK, fontSize: 15, fontWeight: '800' },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 6 },
  cancelText: { color: theme.muted, fontWeight: '700' },

  numbers: { marginTop: 26, backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  numbersTitle: { color: theme.ink, fontSize: 14, fontWeight: '800', marginBottom: 12 },
  numberRow: { flexDirection: 'row', gap: 10 },
  numberChip: { flex: 1, backgroundColor: theme.bg, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  numberN: { color: RED_DARK, fontSize: 20, fontWeight: '900' },
  numberL: { color: theme.muted, fontSize: 12, marginTop: 2 },

  disclaimer: { color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 18 },
});
