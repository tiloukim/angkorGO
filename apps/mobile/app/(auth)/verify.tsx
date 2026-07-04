// OTP code entry — verifies the 6-digit email code. On success, the root
// navigator routes to role selection (new user) or the app (returning user).
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
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
      Alert.alert('Invalid code', e.message);
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
        placeholder="000000"
        placeholderTextColor="#5B6B84"
        keyboardType="number-pad"
        maxLength={6}
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
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  sub: { color: '#8FA3BF', fontSize: 15, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  input: {
    backgroundColor: '#151E30', borderRadius: 12, padding: 18, color: '#fff', fontSize: 28,
    letterSpacing: 12, textAlign: 'center', borderWidth: 1, borderColor: '#1F2A40', marginBottom: 16,
  },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  resend: { color: '#F04438', textAlign: 'center', fontWeight: '600' },
});
