// Food — browse open restaurants.
import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { LocationLangBar } from '@/components/LocationLangBar';
import { useLocale } from '@/lib/locale';
import type { Language } from '@angkorgo/shared';
import { BackButton } from '@/components/BackButton';

interface Restaurant { id: string; name: string; cuisine: string | null; photo_url: string | null; rating: number; is_open: boolean }

const L: Record<Language, Record<string, string>> = {
  en: { title: 'Food delivery', empty: 'No restaurants yet.', restaurant: 'Restaurant', closed: 'Closed', back: 'Back' },
  km: { title: 'ការដឹកជញ្ជូនម្ហូប', empty: 'មិន​ទាន់​មាន​ភោជនីយដ្ឋាន​នៅ​ឡើយ។', restaurant: 'ភោជនីយដ្ឋាន', closed: 'បិទ', back: 'ថយក្រោយ' },
  zh: { title: '外卖', empty: '暂无餐厅。', restaurant: '餐厅', closed: '已打烊', back: '返回' },
};

export default function Food() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const [rows, setRows] = useState<Restaurant[]>([]);

  useEffect(() => {
    supabase.from('restaurants').select('id, name, cuisine, photo_url, rating, is_open')
      .eq('status', 'active').order('rating', { ascending: false })
      .then(({ data }) => setRows((data ?? []) as Restaurant[]));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton variant="onDark" style={{ marginBottom: 10 }} />
        <LocationLangBar />
      </View>
      <View style={styles.content}>
      <Text style={styles.h1}>{t.title}</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<Text style={styles.empty}>{t.empty}</Text>}
        renderItem={({ item }) => (
          <Pressable style={[styles.card, !item.is_open && { opacity: 0.5 }]} disabled={!item.is_open}
            onPress={() => router.push({ pathname: '/(customer)/food/[id]', params: { id: item.id } })}>
            {item.photo_url
              ? <Image source={{ uri: item.photo_url }} style={styles.photo} />
              : <View style={[styles.photo, styles.photoEmpty]}><Text style={styles.photoEmptyText}>🍜</Text></View>}
            <View style={styles.body}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.cuisine ?? t.restaurant} · ⭐ {Number(item.rating).toFixed(1)}{item.is_open ? '' : ` · ${t.closed}`}</Text>
            </View>
          </Pressable>
        )}
      />
      <Pressable style={styles.back} onPress={() => router.replace('/(customer)')}><Text style={styles.backText}>{t.back}</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  header: { backgroundColor: theme.greenDark, paddingTop: 60, paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  content: { flex: 1, padding: 24, paddingTop: 20 },
  h1: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  empty: { color: '#9AA0A6', marginTop: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: '#ECECEC', overflow: 'hidden' },
  photo: { width: '100%', height: 150 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECECEC' },
  photoEmptyText: { fontSize: 44 },
  body: { padding: 16 },
  name: { color: '#1C1C1C', fontSize: 18, fontWeight: '700' },
  sub: { color: '#7A7A7A', fontSize: 13, marginTop: 2 },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
