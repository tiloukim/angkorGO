// Provider profile — identity, rating, jobs completed, business details.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { DeleteAccountButton } from '@/components/DeleteAccountButton';
import { useLocale } from '@/lib/locale';
import type { Provider, Language } from '@angkorgo/shared';

const L: Record<Language, Record<string, string>> = {
  en: {
    saveFailed: 'Save failed', saved: 'Saved',
    provider: 'Provider',
    status: 'Status',
    rating: 'Rating',
    jobsDone: 'Jobs done',
    commission: 'Commission',
    bio: 'Bio',
    bioPh: 'Tell customers about your service',
    save: 'Save',
    editServices: 'Edit services & documents →',
    back: 'Back',
  },
  km: {
    saveFailed: 'រក្សាទុក​បរាជ័យ', saved: 'បាន​រក្សាទុក',
    provider: 'អ្នក​ផ្ដល់​សេវា',
    status: 'ស្ថានភាព',
    rating: 'ការ​វាយ​តម្លៃ',
    jobsDone: 'ការងារ​បាន​បញ្ចប់',
    commission: 'កម្រៃ​ជើងសា',
    bio: 'ប្រវត្តិ​រូប',
    bioPh: 'ប្រាប់​អតិថិជន​អំពី​សេវា​របស់​អ្នក',
    save: 'រក្សាទុក',
    editServices: 'កែ​សេវា & ឯកសារ →',
    back: 'ថយក្រោយ',
  },
  zh: {
    saveFailed: '保存失败', saved: '已保存',
    provider: '服务商',
    status: '状态',
    rating: '评分',
    jobsDone: '已完成订单',
    commission: '佣金',
    bio: '简介',
    bioPh: '向客户介绍您的服务',
    save: '保存',
    editServices: '编辑服务和文件 →',
    back: '返回',
  },
};

export default function ProviderProfile() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
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
    Alert.alert(error ? t.saveFailed : t.saved, error?.message ?? '');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>{provider?.business_name ?? t.provider}</Text>
      <Text style={styles.status}>{t.status}: {provider?.status ?? '…'}</Text>

      <View style={styles.stats}>
        <Stat label={t.rating} value={provider?.rating?.toFixed(1) ?? '—'} />
        <Stat label={t.jobsDone} value={String(provider?.total_jobs ?? 0)} />
        <Stat label={t.commission} value={`${Math.round((provider?.commission_rate ?? 0.1) * 100)}%`} />
      </View>

      <Text style={styles.label}>{t.bio}</Text>
      <TextInput
        style={styles.input} multiline placeholder={t.bioPh} placeholderTextColor="#9AA0A6"
        value={bio} onChangeText={setBio}
      />
      <Pressable style={styles.primary} onPress={save}>
        <Text style={styles.primaryText}>{t.save}</Text>
      </Pressable>

      <Pressable style={styles.link} onPress={() => router.push('/(provider)/onboarding')}>
        <Text style={styles.linkText}>{t.editServices}</Text>
      </Pressable>
      <Pressable style={styles.back} onPress={() => router.replace('/(provider)')}>
        <Text style={styles.backText}>{t.back}</Text>
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
