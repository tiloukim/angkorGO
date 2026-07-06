// Vehicle Rental — browse active vehicle listings.
import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface Listing {
  id: string; title: string; price_per_unit: number; currency: string;
  photos: string[]; address: string | null; attributes: Record<string, any>;
}

export default function Rentals() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    supabase.from('listings').select('id, title, price_per_unit, currency, photos, address, attributes')
      .eq('type', 'vehicle').eq('status', 'active').order('created_at', { ascending: false })
      .then(({ data }) => setListings((data ?? []) as Listing[]));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Rent a vehicle</Text>
      <FlatList
        data={listings}
        keyExtractor={(l) => l.id}
        ListEmptyComponent={<Text style={styles.empty}>No vehicles available yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push({ pathname: '/(customer)/rentals/[id]', params: { id: item.id } })}>
            {item.photos?.[0]
              ? <Image source={{ uri: item.photos[0] }} style={styles.photo} />
              : <View style={[styles.photo, styles.photoEmpty]}><Text style={styles.photoEmptyText}>🚗</Text></View>}
            <View style={styles.cardBody}>
              <Text style={styles.title}>{item.title}</Text>
              {item.attributes?.seats ? <Text style={styles.sub}>{item.attributes.seats} seats{item.attributes.transmission ? ` · ${item.attributes.transmission}` : ''}</Text> : null}
              <Text style={styles.price}>${Number(item.price_per_unit).toFixed(2)} <Text style={styles.perDay}>/ day</Text></Text>
            </View>
          </Pressable>
        )}
      />
      <Pressable style={styles.back} onPress={() => router.replace('/(customer)')}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, paddingTop: 72 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  empty: { color: '#5B6B84', marginTop: 20 },
  card: { backgroundColor: '#151E30', borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: '#1F2A40', overflow: 'hidden' },
  photo: { width: '100%', height: 160 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F2A40' },
  photoEmptyText: { fontSize: 44 },
  cardBody: { padding: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sub: { color: '#8FA3BF', fontSize: 13, marginTop: 2 },
  price: { color: '#10B981', fontSize: 18, fontWeight: '800', marginTop: 8 },
  perDay: { color: '#8FA3BF', fontSize: 13, fontWeight: '600' },
  back: { padding: 14, alignItems: 'center' },
  backText: { color: '#8FA3BF', fontWeight: '600' },
});
