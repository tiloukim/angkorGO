// Customer account screen — profile, sign out, and account deletion.
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { DeleteAccountButton } from '@/components/DeleteAccountButton';
import { TabBar, TAB_BAR_SPACE } from '@/components/TabBar';
import { LocationLangBar } from '@/components/LocationLangBar';
import { theme } from '@/lib/theme';
import { useLocale } from '@/lib/locale';
import { type Language } from '@angkorgo/shared';

const L: Record<Language, Record<string, string>> = {
  en: {
    title: 'Account',
    defaultName: 'AngkorGo user',
    host: 'Host a vehicle or place →',
    restaurant: 'Manage a restaurant →',
    signOut: 'Sign out',
  },
  km: {
    title: 'គណនី',
    defaultName: 'អ្នកប្រើ AngkorGo',
    host: 'ដាក់ជួលយានយន្ត ឬកន្លែង →',
    restaurant: 'គ្រប់គ្រងភោជនីយដ្ឋាន →',
    signOut: 'ចាកចេញ',
  },
  zh: {
    title: '账户',
    defaultName: 'AngkorGo 用户',
    host: '出租车辆或房源 →',
    restaurant: '管理餐厅 →',
    signOut: '退出登录',
  },
};

export default function AccountScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LocationLangBar />
      </View>
      <View style={styles.content}>
      <Text style={styles.h1}>{t.title}</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{profile?.full_name ?? t.defaultName}</Text>
        <Text style={styles.sub}>{profile?.phone ?? ''}</Text>
      </View>

      <Pressable style={styles.row} onPress={() => router.push('/(customer)/host')}>
        <Text style={styles.rowText}>{t.host}</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => router.push('/(customer)/restaurant')}>
        <Text style={styles.rowText}>{t.restaurant}</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={signOut}>
        <Text style={styles.rowText}>{t.signOut}</Text>
      </Pressable>

      <View style={{ marginTop: 'auto' }}>
        <DeleteAccountButton />
      </View>
      </View>

      <TabBar active="account" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  header: { backgroundColor: theme.greenDark, paddingTop: 60, paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  content: { flex: 1, padding: 24, paddingTop: 20, paddingBottom: TAB_BAR_SPACE },
  h1: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#ECECEC' },
  name: { color: '#1C1C1C', fontSize: 18, fontWeight: '700' },
  sub: { color: '#7A7A7A', marginTop: 4 },
  row: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#ECECEC' },
  rowText: { color: '#1C1C1C', fontWeight: '600' },
  back: { padding: 12, alignItems: 'center' },
  backText: { color: '#7A7A7A', fontWeight: '600' },
});
