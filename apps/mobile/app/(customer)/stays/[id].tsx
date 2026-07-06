// Stay — place detail + check-in/out dates → book.
import { useEffect, useState } from 'react';
import { View, Text, Image, TextInput, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface Listing {
  id: string; title: string; description: string | null; price_per_unit: number;
  deposit: number; cleaning_fee: number; photos: string[]; address: string | null; attributes: Record<string, any>;
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

export default function StayDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [l, setL] = useState<Listing | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('1');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('listings').select('*').eq('id', id).single().then(({ data }) => setL(data as Listing));
  }, [id]);

  const nights = isDate(checkIn) && isDate(checkOut) ? Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000) : 0;
  const subtotal = l && nights > 0 ? l.price_per_unit * nights : 0;
  const total = l ? subtotal + Number(l.cleaning_fee) + Number(l.deposit) : 0;

  async function book() {
    if (!l) return;
    if (nights < 1) return Alert.alert('Pick valid dates', 'Use YYYY-MM-DD; check-out after check-in.');
    setBusy(true);
    const { data: bookingId, error } = await supabase.rpc('create_booking', {
      p_listing: l.id, p_start: checkIn, p_end: checkOut, p_guests: Number(guests) || 1,
    });
    setBusy(false);
    if (error || !bookingId) return Alert.alert('Could not book', error?.message ?? '');
    router.replace({ pathname: '/(customer)/booking/[id]', params: { id: bookingId as string } });
  }

  if (!l) return <View style={styles.container} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      {l.photos?.[0] && <Image source={{ uri: l.photos[0] }} style={styles.photo} />}
      <Text style={styles.title}>{l.title}</Text>
      {l.address ? <Text style={styles.addr}>{l.address}</Text> : null}
      <Text style={styles.price}>${Number(l.price_per_unit).toFixed(2)} / night</Text>
      {l.attributes?.beds ? <Text style={styles.attr}>{l.attributes.beds} beds · {l.attributes.baths ?? '?'} baths · up to {l.attributes.max_guests ?? '?'} guests</Text> : null}
      {l.description ? <Text style={styles.desc}>{l.description}</Text> : null}
      {Array.isArray(l.attributes?.amenities) && l.attributes.amenities.length > 0 && (
        <Text style={styles.attr}>Amenities: {l.attributes.amenities.join(', ')}</Text>
      )}

      <Text style={styles.label}>Dates & guests</Text>
      <View style={styles.dates}>
        <TextInput style={styles.input} placeholder="Check-in YYYY-MM-DD" placeholderTextColor="#5B6B84" value={checkIn} onChangeText={setCheckIn} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Check-out YYYY-MM-DD" placeholderTextColor="#5B6B84" value={checkOut} onChangeText={setCheckOut} autoCapitalize="none" />
      </View>
      <TextInput style={[styles.input, { marginHorizontal: 24, marginTop: 10 }]} placeholder="Guests" placeholderTextColor="#5B6B84" keyboardType="number-pad" value={guests} onChangeText={setGuests} />

      {nights > 0 && (
        <View style={styles.summary}>
          <Row label={`$${Number(l.price_per_unit).toFixed(2)} × ${nights} nights`} value={`$${subtotal.toFixed(2)}`} />
          {Number(l.cleaning_fee) > 0 && <Row label="Cleaning fee" value={`$${Number(l.cleaning_fee).toFixed(2)}`} />}
          {Number(l.deposit) > 0 && <Row label="Deposit (refundable)" value={`$${Number(l.deposit).toFixed(2)}`} />}
          <Row label="Total" value={`$${total.toFixed(2)}`} bold />
        </View>
      )}

      <Pressable style={[styles.primary, busy && { opacity: 0.6 }]} onPress={book} disabled={busy}>
        <Text style={styles.primaryText}>Request to book</Text>
      </Pressable>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { color: '#fff', fontWeight: '800' }]}>{label}</Text>
      <Text style={[styles.rowVal, bold && { fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  photo: { width: '100%', height: 220 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', paddingHorizontal: 24, marginTop: 20 },
  addr: { color: '#8FA3BF', paddingHorizontal: 24, marginTop: 4 },
  price: { color: '#10B981', fontSize: 20, fontWeight: '800', paddingHorizontal: 24, marginTop: 10 },
  attr: { color: '#8FA3BF', paddingHorizontal: 24, marginTop: 10 },
  desc: { color: '#C7D0DE', paddingHorizontal: 24, marginTop: 12, lineHeight: 20 },
  label: { color: '#fff', fontSize: 15, fontWeight: '700', paddingHorizontal: 24, marginTop: 24, marginBottom: 10 },
  dates: { flexDirection: 'row', gap: 10, paddingHorizontal: 24 },
  input: { flex: 1, backgroundColor: '#151E30', borderRadius: 12, padding: 14, color: '#fff', borderWidth: 1, borderColor: '#1F2A40' },
  summary: { marginHorizontal: 24, marginTop: 20, backgroundColor: '#151E30', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F2A40' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: '#8FA3BF' },
  rowVal: { color: '#fff' },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 24, marginTop: 24 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#8FA3BF', fontWeight: '600' },
});
