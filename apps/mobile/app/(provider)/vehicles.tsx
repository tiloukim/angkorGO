// Driver vehicles (R7) — register vehicles used for rides. Each stays unverified
// until an admin approves it; only verified+active vehicles receive ride offers.
import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { VEHICLE_CLASSES, VEHICLE_LABELS, type VehicleClass, type Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { uploadVehiclePhoto } from '@/lib/uploads';
import { useLocale } from '@/lib/locale';

const L: Record<Language, Record<string, string>> = {
  en: {
    enterPlate: 'Enter the plate number',
    vehicleAdded: 'Vehicle added',
    vehicleAddedMsg: 'It will receive rides once an admin verifies it.',
    couldNotAdd: 'Could not add',
    title: 'My vehicles',
    verified: 'Verified',
    pending: 'Pending',
    addVehicle: 'Add a vehicle',
    makeModelPh: 'Make & model (e.g. Honda Dream)',
    platePh: 'Plate number',
    colorPh: 'Color',
    addPhoto: 'Add photo (optional)',
    addVehicleBtn: 'Add vehicle',
    back: 'Back',
  },
  km: {
    enterPlate: 'បញ្ចូល​លេខ​ស្លាក',
    vehicleAdded: 'បាន​បន្ថែម​យានយន្ត',
    vehicleAddedMsg: 'វា​នឹង​ទទួល​ការ​ជិះ​នៅ​ពេល​អ្នក​គ្រប់គ្រង​ផ្ទៀងផ្ទាត់​វា។',
    couldNotAdd: 'មិន​អាច​បន្ថែម​បាន',
    title: 'យានយន្ត​របស់​ខ្ញុំ',
    verified: 'បាន​ផ្ទៀងផ្ទាត់',
    pending: 'កំពុង​រង់ចាំ',
    addVehicle: 'បន្ថែម​យានយន្ត',
    makeModelPh: 'ម៉ាក & ម៉ូដែល (ឧ. Honda Dream)',
    platePh: 'លេខ​ស្លាក',
    colorPh: 'ពណ៌',
    addPhoto: 'បន្ថែម​រូបភាព (ជម្រើស)',
    addVehicleBtn: 'បន្ថែម​យានយន្ត',
    back: 'ថយក្រោយ',
  },
  zh: {
    enterPlate: '请输入车牌号',
    vehicleAdded: '已添加车辆',
    vehicleAddedMsg: '管理员验证后即可开始接单。',
    couldNotAdd: '无法添加',
    title: '我的车辆',
    verified: '已验证',
    pending: '待处理',
    addVehicle: '添加车辆',
    makeModelPh: '品牌和型号（例如 Honda Dream）',
    platePh: '车牌号',
    colorPh: '颜色',
    addPhoto: '添加照片（可选）',
    addVehicleBtn: '添加车辆',
    back: '返回',
  },
};

interface Vehicle {
  id: string; class: VehicleClass; make_model: string | null; plate_number: string;
  color: string | null; verified: boolean; active: boolean;
}

export default function VehiclesScreen() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const [providerId, setProviderId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cls, setCls] = useState<VehicleClass>('moto');
  const [makeModel, setMakeModel] = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: me } = await supabase.from('providers').select('id').single();
    if (!me) return;
    setProviderId(me.id);
    const { data } = await supabase.from('driver_vehicles').select('*').eq('provider_id', me.id).order('created_at');
    setVehicles((data ?? []) as Vehicle[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled) setPhoto(res.assets[0].uri);
  }

  async function add() {
    if (!providerId) return;
    if (!plate.trim()) return Alert.alert(t.enterPlate);
    setBusy(true);
    try {
      let photo_url: string | null = null;
      if (photo) photo_url = await uploadVehiclePhoto(providerId, photo);
      const { error } = await supabase.from('driver_vehicles').insert({
        provider_id: providerId, class: cls, make_model: makeModel || null,
        plate_number: plate.trim(), color: color || null, photo_url,
      });
      if (error) throw error;
      setMakeModel(''); setPlate(''); setColor(''); setPhoto(null);
      Alert.alert(t.vehicleAdded, t.vehicleAddedMsg);
      load();
    } catch (e: any) {
      Alert.alert(t.couldNotAdd, e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <Text style={styles.h1}>{t.title}</Text>

      {vehicles.map((v) => (
        <View key={v.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vTitle}>{VEHICLE_LABELS[lang][v.class]} · {v.plate_number}</Text>
            {v.make_model ? <Text style={styles.vSub}>{v.make_model}{v.color ? ` · ${v.color}` : ''}</Text> : null}
          </View>
          <Text style={[styles.badge, v.verified ? { color: '#00B14F' } : { color: '#FF6D00' }]}>
            {v.verified ? t.verified : t.pending}
          </Text>
        </View>
      ))}

      <Text style={styles.section}>{t.addVehicle}</Text>
      <View style={styles.chips}>
        {VEHICLE_CLASSES.map((c) => (
          <Pressable key={c} onPress={() => setCls(c)} style={[styles.chip, cls === c && styles.chipOn]}>
            <Text style={[styles.chipText, cls === c && { color: '#fff' }]}>{VEHICLE_LABELS[lang][c]}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.input} placeholder={t.makeModelPh} placeholderTextColor="#9AA0A6" value={makeModel} onChangeText={setMakeModel} />
      <TextInput style={styles.input} placeholder={t.platePh} placeholderTextColor="#9AA0A6" value={plate} onChangeText={setPlate} />
      <TextInput style={styles.input} placeholder={t.colorPh} placeholderTextColor="#9AA0A6" value={color} onChangeText={setColor} />

      <Pressable style={styles.photoBtn} onPress={pickPhoto}>
        {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <Text style={styles.photoText}>{t.addPhoto}</Text>}
      </Pressable>

      <Pressable style={[styles.primary, busy && { opacity: 0.6 }]} onPress={add} disabled={busy}>
        <Text style={styles.primaryText}>{t.addVehicleBtn}</Text>
      </Pressable>
      <Pressable style={styles.back} onPress={() => router.replace('/(provider)')}>
        <Text style={styles.backText}>{t.back}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, paddingTop: 72 },
  h1: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#ECECEC' },
  vTitle: { color: '#1C1C1C', fontSize: 16, fontWeight: '700' },
  vSub: { color: '#7A7A7A', fontSize: 13, marginTop: 2 },
  badge: { fontWeight: '700', fontSize: 13 },
  section: { color: '#1C1C1C', fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ECECEC' },
  chipOn: { backgroundColor: '#00B14F', borderColor: '#00B14F' },
  chipText: { color: '#7A7A7A', fontWeight: '700' },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, color: '#1C1C1C', fontSize: 16, borderWidth: 1, borderColor: '#ECECEC', marginBottom: 10 },
  photoBtn: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ECECEC', marginBottom: 16 },
  photoText: { color: '#7A7A7A' },
  photo: { width: 120, height: 90, borderRadius: 8 },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
