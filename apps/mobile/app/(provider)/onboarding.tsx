// Provider onboarding — business info, service categories, and verification
// documents. Provider stays 'pending' (undispatchable) until an admin approves.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SERVICE_CATEGORIES, categoryLabel, type ServiceCategory, type Language } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { uploadProviderDocument } from '@/lib/uploads';
import { useLocale } from '@/lib/locale';

const L: Record<Language, Record<string, string>> = {
  en: {
    uploadFailed: 'Upload failed',
    selectCategory: 'Select at least one service category',
    submitted: 'Submitted',
    submittedMsg: 'Your application is under review. You will be notified once approved.',
    ok: 'OK',
    couldNotSubmit: 'Could not submit',
    title: 'Become a provider',
    businessName: 'Business name',
    businessNamePh: "e.g. Sok's Roadside Service",
    servicesYouOffer: 'Services you offer',
    verificationDocs: 'Verification documents',
    upload: 'Upload',
    uploaded: 'Uploaded ✓',
    submitForReview: 'Submit for review',
  },
  km: {
    uploadFailed: 'ការ​ផ្ទុក​ឡើង​បរាជ័យ',
    selectCategory: 'ជ្រើស​យ៉ាង​ហោច​ណាស់​មួយ​ប្រភេទ​សេវា',
    submitted: 'បាន​ដាក់​ស្នើ',
    submittedMsg: 'ពាក្យ​សុំ​របស់​អ្នក​កំពុង​ត្រួតពិនិត្យ។ អ្នក​នឹង​ត្រូវ​ជូន​ដំណឹង​នៅ​ពេល​អនុម័ត។',
    ok: 'យល់​ព្រម',
    couldNotSubmit: 'មិន​អាច​ដាក់​ស្នើ​បាន',
    title: 'ក្លាយ​ជា​អ្នក​ផ្ដល់​សេវា',
    businessName: 'ឈ្មោះ​អាជីវកម្ម',
    businessNamePh: 'ឧ. សេវា​ជួសជុល​តាម​ផ្លូវ​របស់ Sok',
    servicesYouOffer: 'សេវា​ដែល​អ្នក​ផ្ដល់',
    verificationDocs: 'ឯកសារ​ផ្ទៀងផ្ទាត់',
    upload: 'ផ្ទុកឡើង',
    uploaded: 'បាន​ផ្ទុក​ឡើង ✓',
    submitForReview: 'ដាក់​ស្នើ​ដើម្បី​ត្រួតពិនិត្យ',
  },
  zh: {
    uploadFailed: '上传失败',
    selectCategory: '请至少选择一项服务类别',
    submitted: '已提交',
    submittedMsg: '您的申请正在审核中，通过后将通知您。',
    ok: '确定',
    couldNotSubmit: '无法提交',
    title: '成为服务商',
    businessName: '商家名称',
    businessNamePh: '例如：Sok 路边救援',
    servicesYouOffer: '您提供的服务',
    verificationDocs: '验证文件',
    upload: '上传',
    uploaded: '已上传 ✓',
    submitForReview: '提交审核',
  },
};

const DOCS = [
  { type: 'national_id', label: 'National ID' },
  { type: 'drivers_license', label: "Driver's License" },
  { type: 'business_license', label: 'Business License' },
  { type: 'vehicle_photo', label: 'Vehicle Photo' },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
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
      Alert.alert(t.uploadFailed, e.message);
    }
  }

  async function submit() {
    if (!providerId) return;
    if (selected.size === 0) return Alert.alert(t.selectCategory);
    setSaving(true);
    try {
      await supabase.from('providers').update({ business_name: businessName }).eq('id', providerId);
      // Reset then insert the chosen categories.
      await supabase.from('provider_services').delete().eq('provider_id', providerId);
      await supabase.from('provider_services').insert(
        [...selected].map((category) => ({ provider_id: providerId, category })),
      );
      Alert.alert(t.submitted, t.submittedMsg, [
        { text: t.ok, onPress: () => router.replace('/(provider)') },
      ]);
    } catch (e: any) {
      Alert.alert(t.couldNotSubmit, e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <Text style={styles.h1}>{t.title}</Text>

      <Text style={styles.label}>{t.businessName}</Text>
      <TextInput
        style={styles.input} placeholder={t.businessNamePh} placeholderTextColor="#9AA0A6"
        value={businessName} onChangeText={setBusinessName}
      />

      <Text style={styles.label}>{t.servicesYouOffer}</Text>
      <View style={styles.chips}>
        {SERVICE_CATEGORIES.map((c) => (
          <Pressable key={c} onPress={() => toggle(c)} style={[styles.chip, selected.has(c) && styles.chipOn]}>
            <Text style={[styles.chipText, selected.has(c) && styles.chipTextOn]}>{categoryLabel(lang, c)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t.verificationDocs}</Text>
      {DOCS.map((d) => (
        <Pressable key={d.type} style={styles.docRow} onPress={() => pickDoc(d.type)}>
          <Text style={styles.docLabel}>{d.label}</Text>
          <Text style={[styles.docState, uploaded[d.type] && { color: '#00B14F' }]}>
            {uploaded[d.type] ? t.uploaded : t.upload}
          </Text>
        </Pressable>
      ))}

      <Pressable style={[styles.primary, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t.submitForReview}</Text>}
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
