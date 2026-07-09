// Stay — browse active place listings.
import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { useLocale } from '@/lib/locale';
import type { Language } from '@angkorgo/shared';
import { LocationLangBar } from '@/components/LocationLangBar';
import { BackButton } from '@/components/BackButton';

interface Listing {
  id: string; title: string; price_per_unit: number; photos: string[]; address: string | null; attributes: Record<string, any>;
}

const L: Record<Language, Record<string, string>> = {
  en: { h1: 'Book a stay', empty: 'No places available yet.', beds: 'beds', guests: 'guests', perNight: '/ night', back: 'Back' },
  km: { h1: 'កក់កន្លែងស្នាក់នៅ', empty: 'មិនទាន់មានកន្លែងស្នាក់នៅទេ។', beds: 'គ្រែ', guests: 'ភ្ញៀវ', perNight: '/ យប់', back: 'ថយក្រោយ' },
  zh: { h1: '预订住宿', empty: '暂无可用住宿。', beds: '床', guests: '位客人', perNight: '/ 晚', back: '返回' },
};

export default function Stays() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('listings').select('id, title, price_per_unit, photos, address, attributes')
      .eq('type', 'place').eq('status', 'active').order('created_at', { ascending: false })
      .then(({ data }) => { setListings((data ?? []) as Listing[]); setLoading(false); });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton variant="onDark" style={{ marginBottom: 10 }} />
        <LocationLangBar />
      </View>
      <View style={styles.content}>
      <Text style={styles.h1}>{t.h1}</Text>
      <FlatList
        data={listings}
        keyExtractor={(l) => l.id}
        initialNumToRender={6}
        ListEmptyComponent={loading ? <ActivityIndicator color="#00B14F" style={{ marginTop: 32 }} /> : <Text style={styles.empty}>{t.empty}</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push({ pathname: '/(customer)/stays/[id]', params: { id: item.id } })}>
            {item.photos?.[0]
              ? <Image source={{ uri: item.photos[0] }} style={styles.photo} />
              : <View style={[styles.photo, styles.photoEmpty]}><Text style={styles.photoEmptyText}>🏠</Text></View>}
            <View style={styles.cardBody}>
              <Text style={styles.title}>{item.title}</Text>
              {item.address ? <Text style={styles.sub}>{item.address}</Text> : null}
              {item.attributes?.beds ? <Text style={styles.sub}>{item.attributes.beds} {t.beds} · {item.attributes.max_guests ?? '?'} {t.guests}</Text> : null}
              <Text style={styles.price}>${Number(item.price_per_unit).toFixed(2)} <Text style={styles.perNight}>{t.perNight}</Text></Text>
            </View>
          </Pressable>
        )}
      />
      <Pressable style={styles.back} onPress={() => router.replace('/(customer)')}>
        <Text style={styles.backText}>{t.back}</Text>
      </Pressable>
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
  photo: { width: '100%', height: 160, backgroundColor: '#ECECEC' },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECECEC' },
  photoEmptyText: { fontSize: 44 },
  cardBody: { padding: 16 },
  title: { color: '#1C1C1C', fontSize: 18, fontWeight: '700' },
  sub: { color: '#7A7A7A', fontSize: 13, marginTop: 2 },
  price: { color: '#00B14F', fontSize: 18, fontWeight: '800', marginTop: 8 },
  perNight: { color: '#7A7A7A', fontSize: 13, fontWeight: '600' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
