// Host — create a vehicle listing (goes live immediately; edit/pause later).
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { uploadListingPhoto } from '@/lib/uploads';

export default function NewListing() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [rate, setRate] = useState('');
  const [deposit, setDeposit] = useState('');
  const [seats, setSeats] = useState('');
  const [transmission, setTransmission] = useState('');
  const [year, setYear] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled) setPhoto(res.assets[0].uri);
  }

  async function create() {
    if (!title.trim() || !Number(rate)) return Alert.alert('Add a title and daily rate');
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      let photos: string[] = [];
      if (photo) photos = [await uploadListingPhoto(user.id, photo)];
      const { error } = await supabase.from('listings').insert({
        host_id: user.id, type: 'vehicle', title: title.trim(), description: desc || null,
        price_per_unit: Number(rate), deposit: Number(deposit) || 0, currency: 'USD',
        address: address || null, photos, status: 'active',
        attributes: { seats: Number(seats) || null, transmission: transmission || null, year: Number(year) || null },
      });
      if (error) throw error;
      Alert.alert('Listing published', 'It is now available to renters.');
      router.replace('/(customer)/host');
    } catch (e: any) {
      Alert.alert('Could not publish', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <Text style={styles.h1}>New vehicle listing</Text>

      <TextInput style={styles.input} placeholder="Title (e.g. Toyota Camry 2020)" placeholderTextColor="#5B6B84" value={title} onChangeText={setTitle} />
      <TextInput style={[styles.input, styles.multiline]} placeholder="Description" placeholderTextColor="#5B6B84" value={desc} onChangeText={setDesc} multiline />
      <View style={styles.row2}>
        <TextInput style={[styles.input, styles.half]} placeholder="Daily rate $" placeholderTextColor="#5B6B84" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
        <TextInput style={[styles.input, styles.half]} placeholder="Deposit $" placeholderTextColor="#5B6B84" keyboardType="decimal-pad" value={deposit} onChangeText={setDeposit} />
      </View>
      <View style={styles.row2}>
        <TextInput style={[styles.input, styles.half]} placeholder="Seats" placeholderTextColor="#5B6B84" keyboardType="number-pad" value={seats} onChangeText={setSeats} />
        <TextInput style={[styles.input, styles.half]} placeholder="Year" placeholderTextColor="#5B6B84" keyboardType="number-pad" value={year} onChangeText={setYear} />
      </View>
      <TextInput style={styles.input} placeholder="Transmission (auto/manual)" placeholderTextColor="#5B6B84" value={transmission} onChangeText={setTransmission} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Pickup location / address" placeholderTextColor="#5B6B84" value={address} onChangeText={setAddress} />

      <Pressable style={styles.photoBtn} onPress={pickPhoto}>
        {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <Text style={styles.photoText}>Add photo</Text>}
      </Pressable>

      <Pressable style={[styles.primary, busy && { opacity: 0.6 }]} onPress={create} disabled={busy}>
        <Text style={styles.primaryText}>Publish listing</Text>
      </Pressable>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, paddingTop: 72 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  input: { backgroundColor: '#151E30', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#1F2A40', marginBottom: 10 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  photoBtn: { backgroundColor: '#151E30', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1F2A40', marginBottom: 16 },
  photoText: { color: '#8FA3BF' },
  photo: { width: 160, height: 110, borderRadius: 8 },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#8FA3BF', fontWeight: '600' },
});
