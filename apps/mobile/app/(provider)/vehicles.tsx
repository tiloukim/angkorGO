// Driver vehicles (R7) — register vehicles used for rides. Each stays unverified
// until an admin approves it; only verified+active vehicles receive ride offers.
import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { VEHICLE_CLASSES, VEHICLE_LABELS, type VehicleClass } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { uploadVehiclePhoto } from '@/lib/uploads';

interface Vehicle {
  id: string; class: VehicleClass; make_model: string | null; plate_number: string;
  color: string | null; verified: boolean; active: boolean;
}

export default function VehiclesScreen() {
  const router = useRouter();
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
    if (!plate.trim()) return Alert.alert('Enter the plate number');
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
      Alert.alert('Vehicle added', 'It will receive rides once an admin verifies it.');
      load();
    } catch (e: any) {
      Alert.alert('Could not add', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <Text style={styles.h1}>My vehicles</Text>

      {vehicles.map((v) => (
        <View key={v.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vTitle}>{VEHICLE_LABELS.en[v.class]} · {v.plate_number}</Text>
            {v.make_model ? <Text style={styles.vSub}>{v.make_model}{v.color ? ` · ${v.color}` : ''}</Text> : null}
          </View>
          <Text style={[styles.badge, v.verified ? { color: '#10B981' } : { color: '#F5A524' }]}>
            {v.verified ? 'Verified' : 'Pending'}
          </Text>
        </View>
      ))}

      <Text style={styles.section}>Add a vehicle</Text>
      <View style={styles.chips}>
        {VEHICLE_CLASSES.map((c) => (
          <Pressable key={c} onPress={() => setCls(c)} style={[styles.chip, cls === c && styles.chipOn]}>
            <Text style={[styles.chipText, cls === c && { color: '#fff' }]}>{VEHICLE_LABELS.en[c]}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.input} placeholder="Make & model (e.g. Honda Dream)" placeholderTextColor="#5B6B84" value={makeModel} onChangeText={setMakeModel} />
      <TextInput style={styles.input} placeholder="Plate number" placeholderTextColor="#5B6B84" value={plate} onChangeText={setPlate} />
      <TextInput style={styles.input} placeholder="Color" placeholderTextColor="#5B6B84" value={color} onChangeText={setColor} />

      <Pressable style={styles.photoBtn} onPress={pickPhoto}>
        {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <Text style={styles.photoText}>Add photo (optional)</Text>}
      </Pressable>

      <Pressable style={[styles.primary, busy && { opacity: 0.6 }]} onPress={add} disabled={busy}>
        <Text style={styles.primaryText}>Add vehicle</Text>
      </Pressable>
      <Pressable style={styles.back} onPress={() => router.replace('/(provider)')}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, paddingTop: 72 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#151E30', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1F2A40' },
  vTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  vSub: { color: '#8FA3BF', fontSize: 13, marginTop: 2 },
  badge: { fontWeight: '700', fontSize: 13 },
  section: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { flex: 1, backgroundColor: '#151E30', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1F2A40' },
  chipOn: { backgroundColor: '#F04438', borderColor: '#F04438' },
  chipText: { color: '#8FA3BF', fontWeight: '700' },
  input: { backgroundColor: '#151E30', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#1F2A40', marginBottom: 10 },
  photoBtn: { backgroundColor: '#151E30', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1F2A40', marginBottom: 16 },
  photoText: { color: '#8FA3BF' },
  photo: { width: 120, height: 90, borderRadius: 8 },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#8FA3BF', fontWeight: '600' },
});
