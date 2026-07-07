// Role selection for new signups — choose Customer or Service Provider.
// Writes profiles.role + auth metadata, then RootNavigator routes onward.
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import type { UserRole, Language } from '@angkorgo/shared';

const L: Record<Language, Record<string, string>> = {
  en: {
    couldNotSave: 'Could not save',
    title: 'How will you use AngkorGo?',
    needHelpTitle: 'I need help',
    needHelpSub: 'Request roadside assistance when I break down',
    provideHelpTitle: 'I provide help',
    provideHelpSub: 'Mechanic, tow, tire, battery or fuel service provider',
    note: 'Providers must upload documents and be approved before going online.',
  },
  km: {
    couldNotSave: 'មិន​អាច​រក្សា​ទុក',
    title: 'តើ​អ្នក​នឹង​ប្រើ AngkorGo យ៉ាង​ដូចម្ដេច?',
    needHelpTitle: 'ខ្ញុំ​ត្រូវការ​ជំនួយ',
    needHelpSub: 'ស្នើ​ជំនួយ​តាម​ផ្លូវ​នៅ​ពេល​រថយន្ត​ខូច',
    provideHelpTitle: 'ខ្ញុំ​ផ្ដល់​ជំនួយ',
    provideHelpSub: 'អ្នក​ផ្ដល់​សេវា​ជាង​ម៉ាស៊ីន សណ្ដោង កង់ ថ្ម ឬ​ប្រេង',
    note: 'អ្នក​ផ្ដល់​សេវា​ត្រូវ​បញ្ចូល​ឯកសារ និង​ត្រូវ​បាន​អនុម័ត​មុន​ពេល​ចូល​ដំណើរការ។',
  },
  zh: {
    couldNotSave: '无法保存',
    title: '您将如何使用 AngkorGo？',
    needHelpTitle: '我需要帮助',
    needHelpSub: '车辆抛锚时请求道路救援',
    provideHelpTitle: '我提供帮助',
    provideHelpSub: '机修、拖车、轮胎、电瓶或燃油服务提供者',
    note: '服务提供者须上传文件并通过审核后方可上线。',
  },
};

export default function RoleScreen() {
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const { setRole } = useAuth();
  const [busy, setBusy] = useState<UserRole | null>(null);

  async function pick(role: UserRole) {
    setBusy(role);
    try {
      await setRole(role);
    } catch (e: any) {
      Alert.alert(t.couldNotSave, e.message);
      setBusy(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.title}</Text>

      <Pressable style={styles.card} onPress={() => pick('customer')} disabled={!!busy}>
        <Text style={styles.emoji}>🚗</Text>
        <Text style={styles.cardTitle}>{t.needHelpTitle}</Text>
        <Text style={styles.cardSub}>{t.needHelpSub}</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => pick('provider')} disabled={!!busy}>
        <Text style={styles.emoji}>🔧</Text>
        <Text style={styles.cardTitle}>{t.provideHelpTitle}</Text>
        <Text style={styles.cardSub}>{t.provideHelpSub}</Text>
      </Pressable>

      <Text style={styles.note}>{t.note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, justifyContent: 'center' },
  title: { color: '#1C1C1C', fontSize: 24, fontWeight: '800', marginBottom: 28, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: '#ECECEC',
  },
  emoji: { fontSize: 34, marginBottom: 8 },
  cardTitle: { color: '#1C1C1C', fontSize: 20, fontWeight: '700' },
  cardSub: { color: '#7A7A7A', fontSize: 14, marginTop: 4 },
  note: { color: '#9AA0A6', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
