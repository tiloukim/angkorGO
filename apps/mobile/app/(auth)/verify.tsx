// OTP code entry — verifies the 6-digit email code. On success, the root
// navigator routes to role selection (new user) or the app (returning user).
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import type { Language } from '@angkorgo/shared';

const L: Record<Language, Record<string, string>> = {
  en: { invalidCode: 'Invalid code' },
  km: { invalidCode: 'កូដ​មិន​ត្រឹមត្រូវ' },
  zh: { invalidCode: '验证码无效' },
};

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const { verifyEmailOtp, sendEmailOtp } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function onVerify() {
    if (code.length < 6) return;
    setBusy(true);
    try {
      await verifyEmailOtp(email, code);
      // Navigation handled by RootNavigator once the session updates.
    } catch (e: any) {
      Alert.alert(t.invalidCode, e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter the code</Text>
      <Text style={styles.sub}>We sent a 6-digit code to{'\n'}{email}</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter code"
        placeholderTextColor="#9AA0A6"
        keyboardType="number-pad"
        maxLength={10}
        value={code}
        onChangeText={setCode}
        autoFocus
      />

      <Pressable style={[styles.primary, busy && styles.disabled]} onPress={onVerify} disabled={busy}>
        <Text style={styles.primaryText}>Verify</Text>
      </Pressable>

      <Pressable onPress={() => sendEmailOtp(email)} style={{ marginTop: 20 }}>
        <Text style={styles.resend}>Resend code</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, justifyContent: 'center' },
  title: { color: '#1C1C1C', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  sub: { color: '#7A7A7A', fontSize: 15, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 18, color: '#1C1C1C', fontSize: 28,
    letterSpacing: 12, textAlign: 'center', borderWidth: 1, borderColor: '#ECECEC', marginBottom: 16,
  },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  resend: { color: '#00B14F', textAlign: 'center', fontWeight: '600' },
});
