// Login / signup entry — email OTP + Google + Apple. Bilingual (EN/KH).
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { sendEmailOtp, signInWithGoogle, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function onEmail() {
    if (!email.includes('@')) return Alert.alert('Enter a valid email');
    setBusy(true);
    try {
      await sendEmailOtp(email.trim());
      router.push({ pathname: '/(auth)/verify', params: { email: email.trim() } });
    } catch (e: any) {
      Alert.alert('Could not send code', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function wrap(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } catch (e: any) { Alert.alert('Sign in failed', e.message); }
    finally { setBusy(false); }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>AngkorGo Rescue</Text>
      <Text style={styles.tagline}>Help is on the way.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor="#5B6B84"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <Pressable style={[styles.primary, busy && styles.disabled]} onPress={onEmail} disabled={busy}>
        <Text style={styles.primaryText}>Continue with email</Text>
      </Pressable>

      <View style={styles.divider}><Text style={styles.dividerText}>or</Text></View>

      <Pressable style={styles.oauth} onPress={() => wrap(signInWithGoogle)} disabled={busy}>
        <Text style={styles.oauthText}>Continue with Google</Text>
      </Pressable>

      {Platform.OS === 'ios' && (
        <Pressable style={[styles.oauth, styles.apple]} onPress={() => wrap(signInWithApple)} disabled={busy}>
          <Text style={[styles.oauthText, { color: '#fff' }]}>Continue with Apple</Text>
        </Pressable>
      )}

      <Text style={styles.legal}>By continuing you agree to the Terms & Privacy Policy.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', padding: 24, justifyContent: 'center' },
  brand: { color: '#fff', fontSize: 30, fontWeight: '800', textAlign: 'center' },
  tagline: { color: '#8FA3BF', fontSize: 15, textAlign: 'center', marginTop: 6, marginBottom: 40 },
  input: {
    backgroundColor: '#151E30', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16,
    borderWidth: 1, borderColor: '#1F2A40', marginBottom: 12,
  },
  primary: { backgroundColor: '#F04438', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  divider: { alignItems: 'center', marginVertical: 20 },
  dividerText: { color: '#5B6B84' },
  oauth: {
    backgroundColor: '#151E30', borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#1F2A40', marginBottom: 12,
  },
  apple: { backgroundColor: '#000', borderColor: '#000' },
  oauthText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  legal: { color: '#5B6B84', fontSize: 12, textAlign: 'center', marginTop: 24 },
});
