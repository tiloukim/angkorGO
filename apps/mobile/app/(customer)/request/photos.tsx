// Step 4 & 5 — Add up to 10 photos, then create the request.
// On submit: create_service_request RPC → upload images → dispatch → status screen.
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ServiceCategory, Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';
import { uploadRequestImages, MAX_REQUEST_IMAGES } from '@/lib/uploads';

const L: Record<Language, Record<string, string>> = {
  en: {
    requestFailed: 'Request failed',
    tryAgain: 'Please try again',
    addPhotos: 'Add photos',
    optionalHelp: 'Optional — help the provider understand the problem. Up to',
    requestHelp: 'Request help',
  },
  km: {
    requestFailed: 'ស្នើ​បរាជ័យ',
    tryAgain: 'សូម​ព្យាយាម​ម្តង​ទៀត',
    addPhotos: 'បន្ថែមរូបភាព',
    optionalHelp: 'ស្រេចចិត្ត — ជួយឱ្យអ្នកផ្តល់សេវាយល់ពីបញ្ហា។ រហូតដល់',
    requestHelp: 'ស្នើសុំជំនួយ',
  },
  zh: {
    requestFailed: '请求失败',
    tryAgain: '请重试',
    addPhotos: '添加照片',
    optionalHelp: '可选 — 帮助服务人员了解问题。最多',
    requestHelp: '请求帮助',
  },
};

export default function PhotosScreen() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const { category, lat, lng, address } = useLocalSearchParams<{
    category: ServiceCategory; lat: string; lng: string; address: string;
  }>();
  const [uris, setUris] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function pick() {
    if (uris.length >= MAX_REQUEST_IMAGES) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_REQUEST_IMAGES - uris.length,
      quality: 0.6,
    });
    if (!res.canceled) setUris((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, MAX_REQUEST_IMAGES));
  }

  async function submit() {
    setBusy(true);
    try {
      // 1) Create the request row (geography built server-side).
      const { data: requestId, error } = await supabase.rpc('create_service_request', {
        p_category: category,
        p_lng: Number(lng),
        p_lat: Number(lat),
        p_address: address ?? null,
      });
      if (error || !requestId) throw error ?? new Error('Could not create request');

      // 2) Upload photos (best-effort; a failed photo shouldn't block rescue).
      if (uris.length) {
        try { await uploadRequestImages(requestId as string, uris); } catch (e) { console.warn('photo upload', e); }
      }

      // 3) Kick off dispatch (fan out offers to nearby providers).
      await supabase.rpc('dispatch_request', { p_request_id: requestId });

      // 4) Go to the live status/tracking screen.
      router.replace({ pathname: '/(customer)/request/[id]', params: { id: requestId as string } });
    } catch (e: any) {
      Alert.alert(t.requestFailed, e.message ?? t.tryAgain);
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.addPhotos}</Text>
      <Text style={styles.sub}>{t.optionalHelp} {MAX_REQUEST_IMAGES}.</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {uris.map((u) => (
          <Image key={u} source={{ uri: u }} style={styles.thumb} />
        ))}
        {uris.length < MAX_REQUEST_IMAGES && (
          <Pressable style={styles.add} onPress={pick}>
            <Text style={styles.addText}>＋</Text>
          </Pressable>
        )}
      </ScrollView>

      <Pressable style={[styles.primary, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t.requestHelp}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, paddingTop: 72 },
  title: { color: '#1C1C1C', fontSize: 24, fontWeight: '800' },
  sub: { color: '#7A7A7A', fontSize: 14, marginTop: 6, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 96, height: 96, borderRadius: 12 },
  add: { width: 96, height: 96, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECECEC', alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#7A7A7A', fontSize: 34 },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 'auto' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
