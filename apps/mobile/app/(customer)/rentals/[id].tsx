// Vehicle Rental — listing detail + date range → book.
import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import type { Language } from '@angkorgo/shared';
import { BackButton } from '@/components/BackButton';
import { DateField } from '@/components/DateField';

interface Listing {
  id: string; title: string; description: string | null; price_per_unit: number;
  deposit: number; cleaning_fee: number; photos: string[]; address: string | null; attributes: Record<string, any>;
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

const L: Record<Language, Record<string, string>> = {
  en: {
    perDay: '/ day', seats: 'seats', dates: 'Dates', startPh: 'Start date', endPh: 'End date',
    days: 'days', cleaningFee: 'Cleaning fee', deposit: 'Deposit (refundable)', total: 'Total',
    request: 'Request to book', back: 'Back',
    pickValidDates: 'Pick valid dates', pickValidDatesMsg: 'Use YYYY-MM-DD; end must be after start.', couldNotBook: 'Could not book',
  },
  km: {
    perDay: '/ ថ្ងៃ', seats: 'កៅអី', dates: 'កាលបរិច្ឆេទ', startPh: 'ថ្ងៃចាប់ផ្តើម', endPh: 'ថ្ងៃបញ្ចប់',
    days: 'ថ្ងៃ', cleaningFee: 'ថ្លៃសម្អាត', deposit: 'ប្រាក់កក់ (សងវិញបាន)', total: 'សរុប',
    request: 'ស្នើសុំកក់', back: 'ថយក្រោយ',
    pickValidDates: 'ជ្រើស​កាលបរិច្ឆេទ​ត្រឹមត្រូវ', pickValidDatesMsg: 'ប្រើ YYYY-MM-DD; ថ្ងៃបញ្ចប់​ត្រូវ​នៅ​ក្រោយ​ថ្ងៃ​ចាប់ផ្តើម។', couldNotBook: 'មិន​អាច​កក់',
  },
  zh: {
    perDay: '/ 天', seats: '座位', dates: '日期', startPh: '开始日期', endPh: '结束日期',
    days: '天', cleaningFee: '清洁费', deposit: '押金（可退）', total: '总计',
    request: '请求预订', back: '返回',
    pickValidDates: '请选择有效日期', pickValidDatesMsg: '使用 YYYY-MM-DD；结束日期须晚于开始日期。', couldNotBook: '无法预订',
  },
};

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const [l, setL] = useState<Listing | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('listings').select('*').eq('id', id).single().then(({ data }) => setL(data as Listing));
  }, [id]);

  const days = isDate(start) && isDate(end) ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) : 0;
  const subtotal = l && days > 0 ? l.price_per_unit * days : 0;
  const total = l ? subtotal + Number(l.cleaning_fee) + Number(l.deposit) : 0;

  async function book() {
    if (!l) return;
    if (days < 1) return Alert.alert(t.pickValidDates, t.pickValidDatesMsg);
    setBusy(true);
    const { data: bookingId, error } = await supabase.rpc('create_booking', {
      p_listing: l.id, p_start: start, p_end: end, p_guests: 1,
    });
    setBusy(false);
    if (error || !bookingId) return Alert.alert(t.couldNotBook, error?.message ?? '');
    router.replace({ pathname: '/(customer)/booking/[id]', params: { id: bookingId as string } });
  }

  if (!l) return <View style={styles.container} />;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      {l.photos?.[0] && <Image source={{ uri: l.photos[0] }} style={styles.photo} />}
      <Text style={styles.title}>{l.title}</Text>
      {l.address ? <Text style={styles.addr}>{l.address}</Text> : null}
      <Text style={styles.price}>${Number(l.price_per_unit).toFixed(2)} {t.perDay}</Text>
      {l.description ? <Text style={styles.desc}>{l.description}</Text> : null}
      {l.attributes?.seats ? <Text style={styles.attr}>{l.attributes.seats} {t.seats} · {l.attributes.transmission ?? ''} · {l.attributes.year ?? ''}</Text> : null}

      <Text style={styles.label}>{t.dates}</Text>
      <View style={styles.dates}>
        <DateField value={start} placeholder={t.startPh}
          onChange={(v) => { setStart(v); if (end && end <= v) setEnd(''); }} />
        <DateField value={end} placeholder={t.endPh} min={start || undefined} onChange={setEnd} />
      </View>

      {days > 0 && (
        <View style={styles.summary}>
          <Row label={`$${Number(l.price_per_unit).toFixed(2)} × ${days} ${t.days}`} value={`$${subtotal.toFixed(2)}`} />
          {Number(l.cleaning_fee) > 0 && <Row label={t.cleaningFee} value={`$${Number(l.cleaning_fee).toFixed(2)}`} />}
          {Number(l.deposit) > 0 && <Row label={t.deposit} value={`$${Number(l.deposit).toFixed(2)}`} />}
          <Row label={t.total} value={`$${total.toFixed(2)}`} bold />
        </View>
      )}

      <Pressable style={[styles.primary, busy && { opacity: 0.6 }]} onPress={book} disabled={busy}>
        <Text style={styles.primaryText}>{t.request}</Text>
      </Pressable>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>{t.back}</Text>
      </Pressable>
    </ScrollView>
    <BackButton variant="float" />
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { color: '#1C1C1C', fontWeight: '800' }]}>{label}</Text>
      <Text style={[styles.rowVal, bold && { fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  photo: { width: '100%', height: 220 },
  title: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', paddingHorizontal: 24, marginTop: 20 },
  addr: { color: '#7A7A7A', paddingHorizontal: 24, marginTop: 4 },
  price: { color: '#00B14F', fontSize: 20, fontWeight: '800', paddingHorizontal: 24, marginTop: 10 },
  desc: { color: '#3A3A3A', paddingHorizontal: 24, marginTop: 12, lineHeight: 20 },
  attr: { color: '#7A7A7A', paddingHorizontal: 24, marginTop: 10 },
  label: { color: '#1C1C1C', fontSize: 15, fontWeight: '700', paddingHorizontal: 24, marginTop: 24, marginBottom: 10 },
  dates: { flexDirection: 'row', gap: 10, paddingHorizontal: 24 },
  input: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, color: '#1C1C1C', borderWidth: 1, borderColor: '#ECECEC' },
  summary: { marginHorizontal: 24, marginTop: 20, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#ECECEC' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: '#7A7A7A' },
  rowVal: { color: '#1C1C1C' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 24, marginTop: 24 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
