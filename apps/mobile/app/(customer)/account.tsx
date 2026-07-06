// Customer account screen — profile, sign out, and account deletion.
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { DeleteAccountButton } from '@/components/DeleteAccountButton';

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
        <Text style={styles.rowText}>Host a vehicle →</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={signOut}>
        <Text style={styles.rowText}>Sign out</Text>
      </Pressable>

      <View style={{ marginTop: 'auto' }}>
        <DeleteAccountButton />
        <Pressable style={styles.back} onPress={() => router.replace('/(customer)')}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, paddingTop: 72 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  card: { backgroundColor: '#151E30', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1F2A40' },
  name: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sub: { color: '#8FA3BF', marginTop: 4 },
  row: { backgroundColor: '#151E30', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#1F2A40' },
  rowText: { color: '#fff', fontWeight: '600' },
  back: { padding: 12, alignItems: 'center' },
  backText: { color: '#8FA3BF', fontWeight: '600' },
});
