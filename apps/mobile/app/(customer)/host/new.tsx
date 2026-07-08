// Host — create a listing (Vehicle or Place). Goes live immediately.
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ListingType, Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { uploadListingPhoto } from '@/lib/uploads';
import { BackButton } from '@/components/BackButton';

const L: Record<Language, Record<string, string>> = {
  en: {
    addTitleRate: 'Add a title and rate',
    listingPublished: 'Listing published',
    availableToGuests: 'It is now available to guests.',
    couldNotPublish: 'Could not publish',
    newListing: 'New listing',
    vehicle: '🚗 Vehicle',
    place: '🏠 Place',
    title: 'Title',
    description: 'Description',
    nightlyRate: 'Nightly rate $',
    dailyRate: 'Daily rate $',
    deposit: 'Deposit $',
    beds: 'Beds',
    baths: 'Baths',
    maxGuests: 'Max guests',
    amenities: 'Amenities (comma separated)',
    seats: 'Seats',
    year: 'Year',
    transmission: 'Transmission (auto/manual)',
    address: 'Location / address',
    addPhoto: 'Add photo',
    publishListing: 'Publish listing',
    cancel: 'Cancel',
  },
  km: {
    addTitleRate: 'បញ្ចូល​ចំណងជើង​និង​តម្លៃ',
    listingPublished: 'បាន​បង្ហោះ',
    availableToGuests: 'ឥឡូវ​អាច​ប្រើ​បាន​សម្រាប់​ភ្ញៀវ។',
    couldNotPublish: 'មិន​អាច​បង្ហោះ',
    newListing: 'បញ្ជីថ្មី',
    vehicle: '🚗 យានយន្ត',
    place: '🏠 កន្លែងស្នាក់នៅ',
    title: 'ចំណងជើង',
    description: 'ការពិពណ៌នា',
    nightlyRate: 'តម្លៃក្នុងមួយយប់ $',
    dailyRate: 'តម្លៃក្នុងមួយថ្ងៃ $',
    deposit: 'ប្រាក់កក់ $',
    beds: 'គ្រែ',
    baths: 'បន្ទប់ទឹក',
    maxGuests: 'ភ្ញៀវអតិបរមា',
    amenities: 'សម្ភារៈ (បំបែកដោយសញ្ញាក្បៀស)',
    seats: 'កៅអី',
    year: 'ឆ្នាំ',
    transmission: 'ប្រអប់លេខ (ស្វ័យប្រវត្តិ/ដៃ)',
    address: 'ទីតាំង / អាសយដ្ឋាន',
    addPhoto: 'បន្ថែមរូបភាព',
    publishListing: 'បង្ហោះបញ្ជី',
    cancel: 'បោះបង់',
  },
  zh: {
    addTitleRate: '请输入标题和价格',
    listingPublished: '已发布',
    availableToGuests: '现已向房客开放。',
    couldNotPublish: '无法发布',
    newListing: '新房源',
    vehicle: '🚗 车辆',
    place: '🏠 住所',
    title: '标题',
    description: '描述',
    nightlyRate: '每晚价格 $',
    dailyRate: '每日价格 $',
    deposit: '押金 $',
    beds: '床位',
    baths: '卫生间',
    maxGuests: '最多房客',
    amenities: '设施（用逗号分隔）',
    seats: '座位',
    year: '年份',
    transmission: '变速箱（自动/手动）',
    address: '位置 / 地址',
    addPhoto: '添加照片',
    publishListing: '发布房源',
    cancel: '取消',
  },
};

export default function NewListing() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
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
    if (!title.trim() || !Number(rate)) return Alert.alert(t.addTitleRate);
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
      Alert.alert(t.listingPublished, t.availableToGuests);
      router.replace('/(customer)/host');
    } catch (e: any) {
      Alert.alert(t.couldNotPublish, e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <BackButton variant="light" style={{ marginBottom: 16 }} />
      <Text style={styles.h1}>{t.newListing}</Text>

      <View style={styles.toggle}>
        {(['vehicle', 'place'] as const).map((opt) => (
          <Pressable key={opt} style={[styles.toggleBtn, type === opt && styles.toggleOn]} onPress={() => setType(opt)}>
            <Text style={[styles.toggleText, type === opt && { color: '#fff' }]}>{opt === 'vehicle' ? t.vehicle : t.place}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput style={styles.input} placeholder={t.title} placeholderTextColor="#9AA0A6" value={title} onChangeText={setTitle} />
      <TextInput style={[styles.input, styles.multiline]} placeholder={t.description} placeholderTextColor="#9AA0A6" value={desc} onChangeText={setDesc} multiline />
      <View style={styles.row2}>
        <TextInput style={[styles.input, styles.half]} placeholder={isPlace ? t.nightlyRate : t.dailyRate} placeholderTextColor="#9AA0A6" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
        <TextInput style={[styles.input, styles.half]} placeholder={t.deposit} placeholderTextColor="#9AA0A6" keyboardType="decimal-pad" value={deposit} onChangeText={setDeposit} />
      </View>

      {isPlace ? (
        <>
          <View style={styles.row2}>
            <TextInput style={[styles.input, styles.half]} placeholder={t.beds} placeholderTextColor="#9AA0A6" keyboardType="number-pad" value={beds} onChangeText={setBeds} />
            <TextInput style={[styles.input, styles.half]} placeholder={t.baths} placeholderTextColor="#9AA0A6" keyboardType="number-pad" value={baths} onChangeText={setBaths} />
          </View>
          <TextInput style={styles.input} placeholder={t.maxGuests} placeholderTextColor="#9AA0A6" keyboardType="number-pad" value={guests} onChangeText={setGuests} />
          <TextInput style={styles.input} placeholder={t.amenities} placeholderTextColor="#9AA0A6" value={amenities} onChangeText={setAmenities} />
        </>
      ) : (
        <>
          <View style={styles.row2}>
            <TextInput style={[styles.input, styles.half]} placeholder={t.seats} placeholderTextColor="#9AA0A6" keyboardType="number-pad" value={seats} onChangeText={setSeats} />
            <TextInput style={[styles.input, styles.half]} placeholder={t.year} placeholderTextColor="#9AA0A6" keyboardType="number-pad" value={year} onChangeText={setYear} />
          </View>
          <TextInput style={styles.input} placeholder={t.transmission} placeholderTextColor="#9AA0A6" value={transmission} onChangeText={setTransmission} autoCapitalize="none" />
        </>
      )}

      <TextInput style={styles.input} placeholder={t.address} placeholderTextColor="#9AA0A6" value={address} onChangeText={setAddress} />

      <Pressable style={styles.photoBtn} onPress={pickPhoto}>
        {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <Text style={styles.photoText}>{t.addPhoto}</Text>}
      </Pressable>

      <Pressable style={[styles.primary, busy && { opacity: 0.6 }]} onPress={create} disabled={busy}>
        <Text style={styles.primaryText}>{t.publishListing}</Text>
      </Pressable>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>{t.cancel}</Text>
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
