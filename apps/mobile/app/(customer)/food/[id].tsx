// Food — restaurant menu + cart → place order (delivery to current GPS).
import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getCurrentCoords, coordsToAddress } from '@/lib/location';

interface Item { id: string; name: string; description: string | null; price: number; category: string | null }

export default function RestaurantMenu() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('restaurants').select('name').eq('id', id).single().then(({ data }) => setName(data?.name ?? ''));
    supabase.from('menu_items').select('id, name, description, price, category').eq('restaurant_id', id).eq('available', true)
      .then(({ data }) => setItems((data ?? []) as Item[]));
  }, [id]);

  const add = (mid: string) => setCart((c) => ({ ...c, [mid]: (c[mid] ?? 0) + 1 }));
  const sub = (mid: string) => setCart((c) => { const n = (c[mid] ?? 0) - 1; const nc = { ...c }; if (n <= 0) delete nc[mid]; else nc[mid] = n; return nc; });

  const subtotal = items.reduce((s, it) => s + (cart[it.id] ?? 0) * it.price, 0);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);

  async function checkout() {
    if (count === 0) return;
    setBusy(true);
    try {
      const c = await getCurrentCoords();
      const address = await coordsToAddress(c);
      const orderItems = Object.entries(cart).map(([menu_item_id, qty]) => ({ menu_item_id, qty }));
      const { data: orderId, error } = await supabase.rpc('place_order', {
        p_restaurant: id, p_items: orderItems, p_lng: c.lng, p_lat: c.lat, p_address: address, p_method: 'cash',
      });
      if (error || !orderId) throw error ?? new Error('Order failed');
      router.replace({ pathname: '/(customer)/food/order/[id]', params: { id: orderId as string } });
    } catch (e: any) {
      Alert.alert('Could not place order', e.message);
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 72, paddingBottom: 120 }}>
        <Text style={styles.h1}>{name}</Text>
        {items.map((it) => (
          <View key={it.id} style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{it.name}</Text>
              {it.description ? <Text style={styles.itemDesc} numberOfLines={2}>{it.description}</Text> : null}
              <Text style={styles.itemPrice}>${Number(it.price).toFixed(2)}</Text>
            </View>
            {cart[it.id] ? (
              <View style={styles.qtyRow}>
                <Pressable style={styles.qtyBtn} onPress={() => sub(it.id)}><Text style={styles.qtyText}>−</Text></Pressable>
                <Text style={styles.qty}>{cart[it.id]}</Text>
                <Pressable style={styles.qtyBtn} onPress={() => add(it.id)}><Text style={styles.qtyText}>＋</Text></Pressable>
              </View>
            ) : (
              <Pressable style={styles.addBtn} onPress={() => add(it.id)}><Text style={styles.addText}>Add</Text></Pressable>
            )}
          </View>
        ))}
        {items.length === 0 && <Text style={styles.empty}>No menu items yet.</Text>}
      </ScrollView>

      {count > 0 && (
        <View style={styles.checkout}>
          <Pressable style={[styles.checkoutBtn, busy && { opacity: 0.6 }]} onPress={checkout} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkoutText}>Place order · {count} items · ${subtotal.toFixed(2)}</Text>}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#151E30', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1F2A40' },
  itemName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  itemDesc: { color: '#8FA3BF', fontSize: 13, marginTop: 2 },
  itemPrice: { color: '#10B981', fontSize: 15, fontWeight: '700', marginTop: 6 },
  addBtn: { backgroundColor: '#F04438', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  addText: { color: '#fff', fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#1F2A40', alignItems: 'center', justifyContent: 'center' },
  qtyText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  qty: { color: '#fff', fontWeight: '700', minWidth: 18, textAlign: 'center' },
  empty: { color: '#5B6B84', marginTop: 20 },
  checkout: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: '#0B1220', borderTopWidth: 1, borderTopColor: '#1F2A40' },
  checkoutBtn: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
