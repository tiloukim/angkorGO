// Stay — browse active place listings.
import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { LocationLangBar } from '@/components/LocationLangBar';

interface Listing {
  id: string; title: string; price_per_unit: number; photos: string[]; address: string | null; attributes: Record<string, any>;
}

export default function Stays() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    supabase.from('listings').select('id, title, price_per_unit, photos, address, attributes')
      .eq('type', 'place').eq('status', 'active').order('created_at', { ascending: false })
      .then(({ data }) => setListings((data ?? []) as Listing[]));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LocationLangBar />
      </View>
      <View style={styles.content}>
      <Text style={styles.h1}>Book a stay</Text>
      <FlatList
        data={listings}
        keyExtractor={(l) => l.id}
        ListEmptyComponent={<Text style={styles.empty}>No places available yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push({ pathname: '/(customer)/stays/[id]', params: { id: item.id } })}>
            {item.photos?.[0]
              ? <Image source={{ uri: item.photos[0] }} style={styles.photo} />
              : <View style={[styles.photo, styles.photoEmpty]}><Text style={styles.photoEmptyText}>🏠</Text></View>}
            <View style={styles.cardBody}>
              <Text style={styles.title}>{item.title}</Text>
              {item.address ? <Text style={styles.sub}>{item.address}</Text> : null}
              {item.attributes?.beds ? <Text style={styles.sub}>{item.attributes.beds} beds · {item.attributes.max_guests ?? '?'} guests</Text> : null}
              <Text style={styles.price}>${Number(item.price_per_unit).toFixed(2)} <Text style={styles.perNight}>/ night</Text></Text>
            </View>
          </Pressable>
        )}
      />
      <Pressable style={styles.back} onPress={() => router.replace('/(customer)')}>
        <Text style={styles.backText}>Back</Text>
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
  photo: { width: '100%', height: 160 },
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
