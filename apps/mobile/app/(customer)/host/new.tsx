// Host — create a listing (Vehicle or Place). Goes live immediately.
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ListingType } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { uploadListingPhoto } from '@/lib/uploads';

export default function NewListing() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const [type, setType] = useState<ListingType>(params.type === 'place' ? 'place' : 'vehicle');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [rate, setRate] = useState('');
  const [deposit, setDeposit] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // vehicle
  const [seats, setSeats] = useState('');
  const [transmission, setTransmission] = useState('');
  const [year, setYear] = useState('');
  // place
  const [beds, setBeds] = useState('');
  const [baths, setBaths] = useState('');
  const [guests, setGuests] = useState('');
  const [amenities, setAmenities] = useState('');

  const isPlace = type === 'place';

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled) setPhoto(res.assets[0].uri);
  }

  async function create() {
    if (!title.trim() || !Number(rate)) return Alert.alert('Add a title and rate');
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      let photos: string[] = [];
      if (photo) photos = [await uploadListingPhoto(user.id, photo)];
      const attributes = isPlace
        ? { beds: Number(beds) || null, baths: Number(baths) || null, max_guests: Number(guests) || null,
            amenities: amenities ? amenities.split(',').map((a) => a.trim()).filter(Boolean) : [] }
        : { seats: Number(seats) || null, transmission: transmission || null, year: Number(year) || null };
      const { error } = await supabase.from('listings').insert({
        host_id: user.id, type, title: title.trim(), description: desc || null,
        price_per_unit: Number(rate), deposit: Number(deposit) || 0, currency: 'USD',
        address: address || null, photos, status: 'active', attributes,
      });
      if (error) throw error;
      Alert.alert('Listing published', 'It is now available to guests.');
      router.replace('/(customer)/host');
    } catch (e: any) {
      Alert.alert('Could not publish', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <Text style={styles.h1}>New listing</Text>

      <View style={styles.toggle}>
        {(['vehicle', 'place'] as const).map((t) => (
          <Pressable key={t} style={[styles.toggleBtn, type === t && styles.toggleOn]} onPress={() => setType(t)}>
            <Text style={[styles.toggleText, type === t && { color: '#fff' }]}>{t === 'vehicle' ? '🚗 Vehicle' : '🏠 Place'}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput style={styles.input} placeholder="Title" placeholderTextColor="#9AA0A6" value={title} onChangeText={setTitle} />
      <TextInput style={[styles.input, styles.multiline]} placeholder="Description" placeholderTextColor="#9AA0A6" value={desc} onChangeText={setDesc} multiline />
      <View style={styles.row2}>
        <TextInput style={[styles.input, styles.half]} placeholder={isPlace ? 'Nightly rate $' : 'Daily rate $'} placeholderTextColor="#9AA0A6" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
        <TextInput style={[styles.input, styles.half]} placeholder="Deposit $" placeholderTextColor="#9AA0A6" keyboardType="decimal-pad" value={deposit} onChangeText={setDeposit} />
      </View>

      {isPlace ? (
        <>
          <View style={styles.row2}>
            <TextInput style={[styles.input, styles.half]} placeholder="Beds" placeholderTextColor="#9AA0A6" keyboardType="number-pad" value={beds} onChangeText={setBeds} />
            <TextInput style={[styles.input, styles.half]} placeholder="Baths" placeholderTextColor="#9AA0A6" keyboardType="number-pad" value={baths} onChangeText={setBaths} />
          </View>
          <TextInput style={styles.input} placeholder="Max guests" placeholderTextColor="#9AA0A6" keyboardType="number-pad" value={guests} onChangeText={setGuests} />
          <TextInput style={styles.input} placeholder="Amenities (comma separated)" placeholderTextColor="#9AA0A6" value={amenities} onChangeText={setAmenities} />
        </>
      ) : (
        <>
          <View style={styles.row2}>
            <TextInput style={[styles.input, styles.half]} placeholder="Seats" placeholderTextColor="#9AA0A6" keyboardType="number-pad" value={seats} onChangeText={setSeats} />
            <TextInput style={[styles.input, styles.half]} placeholder="Year" placeholderTextColor="#9AA0A6" keyboardType="number-pad" value={year} onChangeText={setYear} />
          </View>
          <TextInput style={styles.input} placeholder="Transmission (auto/manual)" placeholderTextColor="#9AA0A6" value={transmission} onChangeText={setTransmission} autoCapitalize="none" />
        </>
      )}

      <TextInput style={styles.input} placeholder="Location / address" placeholderTextColor="#9AA0A6" value={address} onChangeText={setAddress} />

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
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, paddingTop: 72 },
  h1: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  toggle: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ECECEC' },
  toggleOn: { backgroundColor: '#00B14F', borderColor: '#00B14F' },
  toggleText: { color: '#7A7A7A', fontWeight: '700' },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, color: '#1C1C1C', fontSize: 16, borderWidth: 1, borderColor: '#ECECEC', marginBottom: 10 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  photoBtn: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ECECEC', marginBottom: 16 },
  photoText: { color: '#7A7A7A' },
  photo: { width: 160, height: 110, borderRadius: 8 },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
