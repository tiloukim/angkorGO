// Provider job history — active + completed jobs assigned to this provider.
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { categoryLabel, type RequestStatus, type ServiceCategory } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/lib/locale';

interface Job { id: string; category: ServiceCategory; status: RequestStatus; address: string | null; created_at: string }

const ACTIVE: RequestStatus[] = ['accepted', 'en_route', 'arrived', 'in_progress'];

export default function JobsScreen() {
  const router = useRouter();
  const { lang } = useLocale();
  const [jobs, setJobs] = useState<Job[]>([]);

  const load = useCallback(async () => {
    const { data: me } = await supabase.from('providers').select('id').single();
    if (!me) return;
    const { data } = await supabase
      .from('service_requests')
      .select('id, category, status, address, created_at')
      .eq('assigned_provider_id', me.id)
      .order('created_at', { ascending: false });
    setJobs((data ?? []) as Job[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const sections = [
    { title: 'Active', data: jobs.filter((j) => ACTIVE.includes(j.status)) },
    { title: 'History', data: jobs.filter((j) => !ACTIVE.includes(j.status)) },
  ].filter((s) => s.data.length);

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>My jobs</Text>
      <SectionList
        sections={sections}
        keyExtractor={(j) => j.id}
        ListEmptyComponent={<Text style={styles.empty}>No jobs yet</Text>}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => ACTIVE.includes(item.status) && router.push({ pathname: '/(provider)/job/[id]', params: { id: item.id } })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowCat}>{categoryLabel(lang, item.category)}</Text>
              {item.address ? <Text style={styles.rowAddr} numberOfLines={1}>{item.address}</Text> : null}
            </View>
            <Text style={[styles.badge, item.status === 'completed' && { color: '#00B14F' }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </Pressable>
        )}
      />
      <Pressable style={styles.back} onPress={() => router.replace('/(provider)')}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, paddingTop: 72 },
  h1: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', marginBottom: 12 },
  section: { color: '#7A7A7A', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  empty: { color: '#9AA0A6', marginTop: 20 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#ECECEC' },
  rowCat: { color: '#1C1C1C', fontSize: 16, fontWeight: '700' },
  rowAddr: { color: '#9AA0A6', fontSize: 12, marginTop: 2 },
  badge: { color: '#7A7A7A', fontWeight: '700', textTransform: 'capitalize' },
  back: { padding: 16, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
