// Food — browse open restaurants.
import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface Restaurant { id: string; name: string; cuisine: string | null; photo_url: string | null; rating: number; is_open: boolean }

export default function Food() {
  const router = useRouter();
  const [rows, setRows] = useState<Restaurant[]>([]);

  useEffect(() => {
    supabase.from('restaurants').select('id, name, cuisine, photo_url, rating, is_open')
      .eq('status', 'active').order('rating', { ascending: false })
      .then(({ data }) => setRows((data ?? []) as Restaurant[]));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Food delivery</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<Text style={styles.empty}>No restaurants yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={[styles.card, !item.is_open && { opacity: 0.5 }]} disabled={!item.is_open}
            onPress={() => router.push({ pathname: '/(customer)/food/[id]', params: { id: item.id } })}>
            {item.photo_url
              ? <Image source={{ uri: item.photo_url }} style={styles.photo} />
              : <View style={[styles.photo, styles.photoEmpty]}><Text style={styles.photoEmptyText}>🍜</Text></View>}
            <View style={styles.body}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.cuisine ?? 'Restaurant'} · ⭐ {Number(item.rating).toFixed(1)}{item.is_open ? '' : ' · Closed'}</Text>
            </View>
          </Pressable>
        )}
      />
      <Pressable style={styles.back} onPress={() => router.replace('/(customer)')}><Text style={styles.backText}>Back</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, paddingTop: 72 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  empty: { color: '#5B6B84', marginTop: 20 },
  card: { backgroundColor: '#151E30', borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: '#1F2A40', overflow: 'hidden' },
  photo: { width: '100%', height: 150 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F2A40' },
  photoEmptyText: { fontSize: 44 },
  body: { padding: 16 },
  name: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sub: { color: '#8FA3BF', fontSize: 13, marginTop: 2 },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#8FA3BF', fontWeight: '600' },
});
