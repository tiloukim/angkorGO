// Customer account screen — profile, sign out, and account deletion.
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { DeleteAccountButton } from '@/components/DeleteAccountButton';
import { TabBar, TAB_BAR_SPACE } from '@/components/TabBar';

export default function AccountScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{profile?.full_name ?? 'AngkorGo user'}</Text>
        <Text style={styles.sub}>{profile?.phone ?? ''}</Text>
      </View>

      <Pressable style={styles.row} onPress={() => router.push('/(customer)/host')}>
        <Text style={styles.rowText}>Host a vehicle or place →</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => router.push('/(customer)/restaurant')}>
        <Text style={styles.rowText}>Manage a restaurant →</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={signOut}>
        <Text style={styles.rowText}>Sign out</Text>
      </Pressable>

      <View style={{ marginTop: 'auto' }}>
        <DeleteAccountButton />
      </View>

      <TabBar active="account" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, paddingTop: 72, paddingBottom: TAB_BAR_SPACE },
  h1: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#ECECEC' },
  name: { color: '#1C1C1C', fontSize: 18, fontWeight: '700' },
  sub: { color: '#7A7A7A', marginTop: 4 },
  row: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#ECECEC' },
  rowText: { color: '#1C1C1C', fontWeight: '600' },
  back: { padding: 12, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
