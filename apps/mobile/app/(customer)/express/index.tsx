// Express — send a parcel. Pickup (GPS) + recipient dropoff (Places search) +
// package details → server prices it → place_parcel + dispatch_parcel → track.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import type { Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { getCurrentCoords, coordsToAddress, type Coords } from '@/lib/location';
import { placeAutocomplete, placeCoords, type Prediction } from '@/lib/places';
import { fetchRoute } from '@/lib/directions';
import { pickImage } from '@/lib/imagePicker';
import { uploadParcelPhoto } from '@/lib/uploads';
import { BackButton } from '@/components/BackButton';

type Size = 'small' | 'medium' | 'large';
const SIZE_MULT: Record<Size, number> = { small: 1.0, medium: 1.3, large: 1.6 };
const SIZES: Size[] = ['small', 'medium', 'large'];

const L: Record<Language, Record<string, string>> = {
  en: {
    title: 'Send a parcel', pickup: 'Pickup', currentLocation: 'Current location',
    dropoff: 'Recipient address', searchDropoff: 'Search drop-off address', noMatches: 'No matches',
    recipient: 'Recipient', recipientName: 'Recipient name', recipientPhone: 'Recipient phone',
    packageSize: 'Package size', small: 'Small', medium: 'Medium', large: 'Large',
    note: 'Note for the courier (optional)', addPhoto: 'Add package photo', photoAdded: 'Photo added ✓',
    payment: 'Payment', cash: 'Cash', khqr: 'KHQR', estFee: 'Estimated fee', send: 'Send parcel',
    pickDropoff: 'Choose a drop-off address first', couldNotSend: 'Could not send parcel',
    photoAdd: 'Add photo', takePhoto: 'Take photo', choosePhoto: 'Choose from library', cancel: 'Cancel', cameraDenied: 'Camera permission is required.', uploadFailed: 'Upload failed',
  },
  km: {
    title: 'ផ្ញើកញ្ចប់', pickup: 'ទទួល', currentLocation: 'ទីតាំងបច្ចុប្បន្ន',
    dropoff: 'អាសយដ្ឋានអ្នកទទួល', searchDropoff: 'ស្វែងរកអាសយដ្ឋានដឹកជូន', noMatches: 'គ្មានលទ្ធផល',
    recipient: 'អ្នកទទួល', recipientName: 'ឈ្មោះអ្នកទទួល', recipientPhone: 'លេខទូរស័ព្ទអ្នកទទួល',
    packageSize: 'ទំហំកញ្ចប់', small: 'តូច', medium: 'មធ្យម', large: 'ធំ',
    note: 'ចំណាំសម្រាប់អ្នកដឹក (ស្រេចចិត្ត)', addPhoto: 'បន្ថែមរូបកញ្ចប់', photoAdded: 'បានបន្ថែមរូប ✓',
    payment: 'ការទូទាត់', cash: 'សាច់ប្រាក់', khqr: 'KHQR', estFee: 'ថ្លៃប៉ាន់ស្មាន', send: 'ផ្ញើកញ្ចប់',
    pickDropoff: 'ជ្រើសអាសយដ្ឋានដឹកជូនជាមុនសិន', couldNotSend: 'មិនអាចផ្ញើកញ្ចប់',
    photoAdd: 'បន្ថែមរូបភាព', takePhoto: 'ថតរូប', choosePhoto: 'ជ្រើសពីបណ្ណាល័យ', cancel: 'បោះបង់', cameraDenied: 'ត្រូវការការអនុញ្ញាតកាមេរ៉ា។', uploadFailed: 'ការផ្ទុកឡើងបរាជ័យ',
  },
  zh: {
    title: '寄送包裹', pickup: '取件', currentLocation: '当前位置',
    dropoff: '收件地址', searchDropoff: '搜索送达地址', noMatches: '无匹配结果',
    recipient: '收件人', recipientName: '收件人姓名', recipientPhone: '收件人电话',
    packageSize: '包裹大小', small: '小', medium: '中', large: '大',
    note: '给快递员的备注（可选）', addPhoto: '添加包裹照片', photoAdded: '已添加照片 ✓',
    payment: '支付', cash: '现金', khqr: 'KHQR', estFee: '预估费用', send: '寄送包裹',
    pickDropoff: '请先选择送达地址', couldNotSend: '无法寄送包裹',
    photoAdd: '添加照片', takePhoto: '拍照', choosePhoto: '从相册选择', cancel: '取消', cameraDenied: '需要相机权限。', uploadFailed: '上传失败',
  },
};

function haversine(a: Coords, b: Coords): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
}

export default function ExpressSend() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;

  const [pickup, setPickup] = useState<Coords | null>(null);
  const [pickupAddr, setPickupAddr] = useState('');
  const [query, setQuery] = useState('');
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [dest, setDest] = useState<Coords | null>(null);
  const [destAddr, setDestAddr] = useState('');
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [size, setSize] = useState<Size>('small');
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [method, setMethod] = useState<'cash' | 'khqr'>('cash');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await getCurrentCoords();
      setPickup(c);
      setPickupAddr((await coordsToAddress(c)) || t.currentLocation);
    })();
  }, []);

  useEffect(() => {
    const id = setTimeout(async () => setPreds(dest ? [] : await placeAutocomplete(query, pickup ?? undefined)), 250);
    return () => clearTimeout(id);
  }, [query, pickup, dest]);

  async function chooseDropoff(p: Prediction) {
    const c = await placeCoords(p.place_id);
    if (!c) return;
    setDest(c);
    setDestAddr(`${p.primary}, ${p.secondary}`);
    setQuery(`${p.primary}, ${p.secondary}`);
    setPreds([]);
    Keyboard.dismiss();
    if (pickup) {
      const r = await fetchRoute(pickup, c);
      setDistanceKm(r?.distanceKm ?? haversine(pickup, c));
    }
  }

  const km = distanceKm ?? 0;
  const fee = dest ? Math.max(1.25, Math.round((1.0 + 0.30 * km) * SIZE_MULT[size] * 100) / 100) : 0;

  async function addPhoto() {
    const uri = await pickImage({ addPhoto: t.photoAdd, takePhoto: t.takePhoto, choosePhoto: t.choosePhoto, cancel: t.cancel, cameraDenied: t.cameraDenied });
    if (!uri) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const url = await uploadParcelPhoto(user?.id ?? 'anon', uri);
      setPhotoUrl(url);
    } catch (e: any) {
      Alert.alert(t.uploadFailed, e.message);
    }
  }

  async function send() {
    if (!pickup || !dest) return Alert.alert(t.pickDropoff);
    setBusy(true);
    const { data: parcelId, error } = await supabase.rpc('place_parcel', {
      p_pickup_lng: pickup.lng, p_pickup_lat: pickup.lat, p_pickup_address: pickupAddr,
      p_dropoff_lng: dest.lng, p_dropoff_lat: dest.lat, p_dropoff_address: destAddr,
      p_recipient_name: name || null, p_recipient_phone: phone || null,
      p_size: size, p_note: note || null, p_photo_url: photoUrl,
      p_distance_km: km, p_method: method,
    });
    if (error || !parcelId) { setBusy(false); return Alert.alert(t.couldNotSend, error?.message ?? ''); }
    await supabase.rpc('dispatch_parcel', { p_parcel: parcelId });
    router.replace({ pathname: '/(customer)/express/[id]', params: { id: parcelId as string } });
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 72, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={styles.h1}>{t.title}</Text>

        <Text style={styles.label}>{t.pickup}</Text>
        <View style={styles.pickup}><View style={styles.dot} /><Text style={styles.pickupText} numberOfLines={1}>{pickupAddr}</Text></View>

        <Text style={styles.label}>{t.dropoff}</Text>
        <TextInput style={styles.input} placeholder={t.searchDropoff} placeholderTextColor="#9AA0A6"
          value={query} onChangeText={(v) => { setQuery(v); setDest(null); }} autoCapitalize="none" />
        {preds.length > 0 && (
          <FlatList data={preds} keyExtractor={(p) => p.place_id} keyboardShouldPersistTaps="handled" style={styles.preds}
            renderItem={({ item }) => (
              <Pressable style={styles.pred} onPress={() => chooseDropoff(item)}>
                <Text style={styles.predPrimary}>{item.primary}</Text>
                {item.secondary ? <Text style={styles.predSecondary}>{item.secondary}</Text> : null}
              </Pressable>
            )} />
        )}

        <Text style={styles.label}>{t.recipient}</Text>
        <TextInput style={styles.input} placeholder={t.recipientName} placeholderTextColor="#9AA0A6" value={name} onChangeText={setName} />
        <TextInput style={[styles.input, { marginTop: 10 }]} placeholder={t.recipientPhone} placeholderTextColor="#9AA0A6" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

        <Text style={styles.label}>{t.packageSize}</Text>
        <View style={styles.chips}>
          {SIZES.map((s) => (
            <Pressable key={s} style={[styles.chip, size === s && styles.chipOn]} onPress={() => setSize(s)}>
              <Text style={[styles.chipText, size === s && styles.chipTextOn]}>{t[s]}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput style={[styles.input, { marginTop: 16 }]} placeholder={t.note} placeholderTextColor="#9AA0A6" value={note} onChangeText={setNote} />

        <Pressable style={styles.photoBtn} onPress={addPhoto}>
          <Text style={[styles.photoText, photoUrl && { color: '#00B14F' }]}>{photoUrl ? t.photoAdded : `📷 ${t.addPhoto}`}</Text>
        </Pressable>

        <Text style={styles.label}>{t.payment}</Text>
        <View style={styles.methods}>
          {(['cash', 'khqr'] as const).map((m) => (
            <Pressable key={m} style={[styles.method, method === m && styles.methodOn]} onPress={() => setMethod(m)}>
              <Text style={[styles.methodText, method === m && { color: '#fff' }]}>{t[m]}</Text>
            </Pressable>
          ))}
        </View>

        {dest && (
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>{t.estFee} · {km} km</Text>
            <Text style={styles.feeVal}>${fee.toFixed(2)}</Text>
          </View>
        )}

        <Pressable style={[styles.primary, (busy || !dest) && { opacity: 0.5 }]} onPress={send} disabled={busy || !dest}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t.send}{dest ? ` · $${fee.toFixed(2)}` : ''}</Text>}
        </Pressable>
      </ScrollView>
      <BackButton variant="float" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  h1: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  label: { color: '#1C1C1C', fontSize: 15, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  pickup: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#ECECEC' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00B14F' },
  pickupText: { color: '#7A7A7A', flex: 1 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, color: '#1C1C1C', fontSize: 15, borderWidth: 1, borderColor: '#ECECEC' },
  preds: { maxHeight: 200, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECECEC', marginTop: 8 },
  pred: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  predPrimary: { color: '#1C1C1C', fontSize: 15, fontWeight: '600' },
  predSecondary: { color: '#9AA0A6', fontSize: 12, marginTop: 2 },
  chips: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ECECEC' },
  chipOn: { backgroundColor: '#00B14F', borderColor: '#00B14F' },
  chipText: { color: '#7A7A7A', fontWeight: '700' },
  chipTextOn: { color: '#fff' },
  photoBtn: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#ECECEC' },
  photoText: { color: '#7A7A7A', fontWeight: '700' },
  methods: { flexDirection: 'row', gap: 10 },
  method: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ECECEC' },
  methodOn: { backgroundColor: '#00B14F', borderColor: '#00B14F' },
  methodText: { color: '#7A7A7A', fontWeight: '700' },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#ECECEC' },
  feeLabel: { color: '#7A7A7A', fontSize: 14 },
  feeVal: { color: '#00B14F', fontSize: 20, fontWeight: '800' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
