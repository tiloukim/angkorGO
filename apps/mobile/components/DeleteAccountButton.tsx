// Reusable "Delete account" action with a double confirmation. Required by the
// App Store and Google Play for any app with accounts.
import { useState } from 'react';
import { Pressable, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/lib/auth';

export function DeleteAccountButton() {
  const { deleteAccount } = useAuth();
  const [busy, setBusy] = useState(false);

  function confirm() {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteAccount();
              // AuthProvider signs out → RootNavigator routes to login.
            } catch (e: any) {
              Alert.alert('Could not delete', e.message ?? 'Please try again');
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  return (
    <Pressable style={styles.btn} onPress={confirm} disabled={busy}>
      {busy ? <ActivityIndicator color="#F04438" /> : <Text style={styles.text}>Delete account</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 14, alignItems: 'center' },
  text: { color: '#F04438', fontWeight: '600' },
});
