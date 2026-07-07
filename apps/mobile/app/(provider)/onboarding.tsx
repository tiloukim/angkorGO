// Provider onboarding — business info, service categories, and verification
// documents. Provider stays 'pending' (undispatchable) until an admin approves.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SERVICE_CATEGORIES, categoryLabel, type ServiceCategory } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { uploadProviderDocument } from '@/lib/uploads';
import { useLocale } from '@/lib/locale';

const DOCS = [
  { type: 'national_id', label: 'National ID' },
  { type: 'drivers_license', label: "Driver's License" },
  { type: 'business_license', label: 'Business License' },
  { type: 'vehicle_photo', label: 'Vehicle Photo' },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { lang } = useLocale();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [selected, setSelected] = useState<Set<ServiceCategory>>(new Set());
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('providers').select('id, business_name').single().then(({ data }) => {
      if (data) { setProviderId(data.id); setBusinessName(data.business_name ?? ''); }
    });
  }, []);

  function toggle(c: ServiceCategory) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  }

  async function pickDoc(type: string) {
    if (!providerId) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (res.canceled) return;
    try {
      await uploadProviderDocument(providerId, type as any, res.assets[0].uri);
      setUploaded((u) => ({ ...u, [type]: true }));
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    }
  }

  async function submit() {
    if (!providerId) return;
    if (selected.size === 0) return Alert.alert('Select at least one service category');
    setSaving(true);
    try {
      await supabase.from('providers').update({ business_name: businessName }).eq('id', providerId);
      // Reset then insert the chosen categories.
      await supabase.from('provider_services').delete().eq('provider_id', providerId);
      await supabase.from('provider_services').insert(
        [...selected].map((category) => ({ provider_id: providerId, category })),
      );
      Alert.alert('Submitted', 'Your application is under review. You will be notified once approved.', [
        { text: 'OK', onPress: () => router.replace('/(provider)') },
      ]);
    } catch (e: any) {
      Alert.alert('Could not submit', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <Text style={styles.h1}>Become a provider</Text>

      <Text style={styles.label}>Business name</Text>
      <TextInput
        style={styles.input} placeholder="e.g. Sok's Roadside Service" placeholderTextColor="#9AA0A6"
        value={businessName} onChangeText={setBusinessName}
      />

      <Text style={styles.label}>Services you offer</Text>
      <View style={styles.chips}>
        {SERVICE_CATEGORIES.map((c) => (
          <Pressable key={c} onPress={() => toggle(c)} style={[styles.chip, selected.has(c) && styles.chipOn]}>
            <Text style={[styles.chipText, selected.has(c) && styles.chipTextOn]}>{categoryLabel(lang, c)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Verification documents</Text>
      {DOCS.map((d) => (
        <Pressable key={d.type} style={styles.docRow} onPress={() => pickDoc(d.type)}>
          <Text style={styles.docLabel}>{d.label}</Text>
          <Text style={[styles.docState, uploaded[d.type] && { color: '#00B14F' }]}>
            {uploaded[d.type] ? 'Uploaded ✓' : 'Upload'}
          </Text>
        </Pressable>
      ))}

      <Pressable style={[styles.primary, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Submit for review</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, paddingTop: 72 },
  h1: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  label: { color: '#1C1C1C', fontSize: 15, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, color: '#1C1C1C', fontSize: 16, borderWidth: 1, borderColor: '#ECECEC' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: '#ECECEC' },
  chipOn: { backgroundColor: '#00B14F', borderColor: '#00B14F' },
  chipText: { color: '#7A7A7A', fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#ECECEC' },
  docLabel: { color: '#1C1C1C', fontSize: 15, fontWeight: '600' },
  docState: { color: '#7A7A7A', fontWeight: '700' },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
