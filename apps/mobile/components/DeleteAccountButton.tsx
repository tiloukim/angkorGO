// Reusable "Delete account" action with a double confirmation. Required by the
// App Store and Google Play for any app with accounts.
import { useState } from 'react';
import { Pressable, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { type Language } from '@angkorgo/shared';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';

const L: Record<Language, Record<string, string>> = {
  en: {
    deleteAccount: 'Delete account',
    confirmTitle: 'Delete account?',
    confirmBody: 'This permanently deletes your account and all your data. This cannot be undone.',
    cancel: 'Cancel',
    delete: 'Delete',
    couldNotDelete: 'Could not delete',
    tryAgain: 'Please try again',
  },
  km: {
    deleteAccount: 'លុបគណនី',
    confirmTitle: 'លុបគណនី?',
    confirmBody: 'នេះនឹងលុបគណនី និងទិន្នន័យរបស់អ្នកទាំងអស់ជាអចិន្ត្រៃយ៍។ មិនអាចត្រឡប់វិញបានទេ។',
    cancel: 'បោះបង់',
    delete: 'លុប',
    couldNotDelete: 'មិនអាចលុបបានទេ',
    tryAgain: 'សូមព្យាយាមម្តងទៀត',
  },
  zh: {
    deleteAccount: '删除账户',
    confirmTitle: '删除账户？',
    confirmBody: '这将永久删除您的账户和所有数据。此操作无法撤销。',
    cancel: '取消',
    delete: '删除',
    couldNotDelete: '无法删除',
    tryAgain: '请重试',
  },
};

export function DeleteAccountButton() {
  const { deleteAccount } = useAuth();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const [busy, setBusy] = useState(false);

  function confirm() {
    Alert.alert(
      t.confirmTitle,
      t.confirmBody,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteAccount();
              // AuthProvider signs out → RootNavigator routes to login.
            } catch (e: any) {
              Alert.alert(t.couldNotDelete, e.message ?? t.tryAgain);
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <Pressable style={styles.btn} onPress={confirm} disabled={busy}>
      {busy ? <ActivityIndicator color="#E5484D" /> : <Text style={styles.text}>{t.deleteAccount}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 14, alignItems: 'center' },
  text: { color: '#E5484D', fontWeight: '600' },
});
