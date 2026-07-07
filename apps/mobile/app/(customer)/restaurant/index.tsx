// Merchant — create/manage a restaurant: menu + incoming orders.
import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getCurrentCoords, coordsToAddress } from '@/lib/location';

export default function Restaurant() {
  const router = useRouter();
  const [rest, setRest] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  // create form
  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('');
  // menu form
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: r } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).maybeSingle();
    setRest(r);
    if (r) {
      const [{ data: m }, { data: o }] = await Promise.all([
        supabase.from('menu_items').select('*').eq('restaurant_id', r.id).order('created_at'),
        supabase.from('orders').select('id, status, total, delivery_address, placed_at').eq('restaurant_id', r.id)
          .in('status', ['placed', 'accepted', 'ready']).order('placed_at', { ascending: false }),
      ]);
      setMenu(m ?? []);
      setOrders(o ?? []);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createRestaurant() {
    if (!name.trim()) return Alert.alert('Enter a name');
    const { data: { user } } = await supabase.auth.getUser();
    const c = await getCurrentCoords();
    const address = await coordsToAddress(c);
    const { error } = await supabase.from('restaurants').insert({
      owner_id: user!.id, name: name.trim(), cuisine: cuisine || null, address,
      lat: c.lat, lng: c.lng, status: 'active', is_open: true,
    });
    if (error) return Alert.alert('Failed', error.message);
    load();
  }

  async function addItem() {
    if (!itemName.trim() || !Number(itemPrice)) return Alert.alert('Enter item name and price');
    const { error } = await supabase.from('menu_items').insert({
      restaurant_id: rest.id, name: itemName.trim(), price: Number(itemPrice),
    });
    if (error) return Alert.alert('Failed', error.message);
    setItemName(''); setItemPrice(''); load();
  }

  async function toggleOpen(v: boolean) {
    await supabase.from('restaurants').update({ is_open: v }).eq('id', rest.id);
    setRest({ ...rest, is_open: v });
  }

  async function accept(orderId: string) {
    const { error } = await supabase.rpc('accept_order', { p_order: orderId });
    if (error) return Alert.alert('Failed', error.message);
    load();
  }

  async function ready(orderId: string) {
    const { data, error } = await supabase.rpc('dispatch_order', { p_order: orderId });
    if (error) return Alert.alert('Failed', error.message);
    Alert.alert('Dispatched', `Offered to ${data ?? 0} nearby couriers.`);
    load();
  }

  if (!rest) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.h1}>Open a restaurant</Text>
        <TextInput style={styles.input} placeholder="Restaurant name" placeholderTextColor="#9AA0A6" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Cuisine (e.g. Khmer, BBQ)" placeholderTextColor="#9AA0A6" value={cuisine} onChangeText={setCuisine} />
        <Pressable style={styles.primary} onPress={createRestaurant}><Text style={styles.primaryText}>Create (uses your current location)</Text></Pressable>
        <Pressable style={styles.back} onPress={() => router.replace('/(customer)')}><Text style={styles.backText}>Back</Text></Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>{rest.name}</Text>
        <View style={styles.openWrap}><Text style={styles.openLabel}>{rest.is_open ? 'Open' : 'Closed'}</Text><Switch value={rest.is_open} onValueChange={toggleOpen} /></View>
      </View>

      <Text style={styles.section}>Orders ({orders.length})</Text>
      {orders.map((o) => (
        <View key={o.id} style={styles.order}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderTitle}>${Number(o.total).toFixed(2)} · {o.status}</Text>
            <Text style={styles.orderSub} numberOfLines={1}>{o.delivery_address}</Text>
          </View>
          {o.status === 'placed' && <Pressable style={styles.act} onPress={() => accept(o.id)}><Text style={styles.actText}>Accept</Text></Pressable>}
          {o.status === 'accepted' && <Pressable style={styles.act} onPress={() => ready(o.id)}><Text style={styles.actText}>Ready</Text></Pressable>}
        </View>
      ))}
      {orders.length === 0 && <Text style={styles.empty}>No active orders.</Text>}

      <Text style={styles.section}>Menu ({menu.length})</Text>
      {menu.map((m) => (
        <View key={m.id} style={styles.menuRow}><Text style={styles.menuName}>{m.name}</Text><Text style={styles.menuPrice}>${Number(m.price).toFixed(2)}</Text></View>
      ))}
      <View style={styles.addRow}>
        <TextInput style={[styles.input, { flex: 2, marginBottom: 0 }]} placeholder="Item name" placeholderTextColor="#9AA0A6" value={itemName} onChangeText={setItemName} />
        <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="$" placeholderTextColor="#9AA0A6" keyboardType="decimal-pad" value={itemPrice} onChangeText={setItemPrice} />
        <Pressable style={styles.addBtn} onPress={addItem}><Text style={styles.addText}>Add</Text></Pressable>
      </View>

      <Pressable style={styles.back} onPress={() => router.replace('/(customer)')}><Text style={styles.backText}>Back</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, paddingTop: 72 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  openWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  openLabel: { color: '#7A7A7A', fontWeight: '600' },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, color: '#1C1C1C', fontSize: 16, borderWidth: 1, borderColor: '#ECECEC', marginBottom: 10 },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#fff', fontWeight: '700' },
  section: { color: '#1C1C1C', fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  empty: { color: '#9AA0A6' },
  order: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#ECECEC' },
  orderTitle: { color: '#1C1C1C', fontWeight: '700', textTransform: 'capitalize' },
  orderSub: { color: '#7A7A7A', fontSize: 13, marginTop: 2 },
  act: { backgroundColor: '#00B14F', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  actText: { color: '#fff', fontWeight: '700' },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ECECEC' },
  menuName: { color: '#1C1C1C' },
  menuPrice: { color: '#00B14F', fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 },
  addBtn: { backgroundColor: '#00B14F', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14 },
  addText: { color: '#fff', fontWeight: '700' },
  back: { padding: 14, alignItems: 'center', marginTop: 8 },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
