// Provider profile — identity, rating, jobs completed, business details.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { DeleteAccountButton } from '@/components/DeleteAccountButton';
import type { Provider } from '@angkorgo/shared';

export default function ProviderProfile() {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [bio, setBio] = useState('');

  useEffect(() => {
    supabase.from('providers').select('*').single().then(({ data }) => {
      setProvider(data as Provider | null);
      setBio((data as Provider)?.bio ?? '');
    });
  }, []);

  async function save() {
    if (!provider) return;
    const { error } = await supabase.from('providers').update({ bio }).eq('id', provider.id);
    Alert.alert(error ? 'Save failed' : 'Saved', error?.message ?? '');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>{provider?.business_name ?? 'Provider'}</Text>
      <Text style={styles.status}>Status: {provider?.status ?? '…'}</Text>

      <View style={styles.stats}>
        <Stat label="Rating" value={provider?.rating?.toFixed(1) ?? '—'} />
        <Stat label="Jobs done" value={String(provider?.total_jobs ?? 0)} />
        <Stat label="Commission" value={`${Math.round((provider?.commission_rate ?? 0.1) * 100)}%`} />
      </View>

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={styles.input} multiline placeholder="Tell customers about your service" placeholderTextColor="#9AA0A6"
        value={bio} onChangeText={setBio}
      />
      <Pressable style={styles.primary} onPress={save}>
        <Text style={styles.primaryText}>Save</Text>
      </Pressable>

      <Pressable style={styles.link} onPress={() => router.push('/(provider)/onboarding')}>
        <Text style={styles.linkText}>Edit services & documents →</Text>
      </Pressable>
      <Pressable style={styles.back} onPress={() => router.replace('/(provider)')}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <DeleteAccountButton />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, paddingTop: 72 },
  h1: { color: '#1C1C1C', fontSize: 24, fontWeight: '800' },
  status: { color: '#7A7A7A', marginTop: 4, textTransform: 'capitalize' },
  stats: { flexDirection: 'row', gap: 12, marginTop: 20 },
  stat: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { color: '#1C1C1C', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#7A7A7A', fontSize: 12, marginTop: 4 },
  label: { color: '#1C1C1C', fontSize: 15, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, color: '#1C1C1C', fontSize: 16, minHeight: 90, textAlignVertical: 'top', borderWidth: 1, borderColor: '#ECECEC' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  primaryText: { color: '#fff', fontWeight: '700' },
  link: { padding: 16, alignItems: 'center', marginTop: 8 },
  linkText: { color: '#1C1C1C', fontWeight: '600' },
  back: { padding: 12, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
