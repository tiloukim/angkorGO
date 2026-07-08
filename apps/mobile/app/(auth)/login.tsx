// Login / signup entry — email OTP + Google + Apple. Bilingual (EN/KH).
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/locale';
import { IS_DRIVER_APP } from '@/lib/variant';
import type { Language } from '@angkorgo/shared';

const L: Record<Language, Record<string, string>> = {
  en: {
    enterValidEmail: 'Enter a valid email',
    couldNotSendCode: 'Could not send code',
    signInFailed: 'Sign in failed',
    tagline: 'Help is on the way.',
    driverTagline: 'Drive & earn on your schedule.',
    emailPlaceholder: 'Email address',
    continueWithEmail: 'Continue with email',
    or: 'or',
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
    legal: 'By continuing you agree to the Terms & Privacy Policy.',
  },
  km: {
    enterValidEmail: 'បញ្ចូល​អ៊ីមែល​ត្រឹមត្រូវ',
    couldNotSendCode: 'មិន​អាច​ផ្ញើ​កូដ',
    signInFailed: 'ចូល​បរាជ័យ',
    tagline: 'ជំនួយ​កំពុង​មក​ដល់។',
    driverTagline: 'បើកបរ និងរកចំណូលតាមពេលវេលារបស់អ្នក។',
    emailPlaceholder: 'អាសយដ្ឋាន​អ៊ីមែល',
    continueWithEmail: 'បន្ត​ដោយ​អ៊ីមែល',
    or: 'ឬ',
    continueWithGoogle: 'បន្ត​ដោយ Google',
    continueWithApple: 'បន្ត​ដោយ Apple',
    legal: 'ដោយ​បន្ត អ្នក​យល់ព្រម​តាម​លក្ខខណ្ឌ និង​គោលការណ៍​ឯកជនភាព។',
  },
  zh: {
    enterValidEmail: '请输入有效邮箱',
    couldNotSendCode: '无法发送验证码',
    signInFailed: '登录失败',
    tagline: '救援即将到达。',
    driverTagline: '按你的时间开车赚钱。',
    emailPlaceholder: '电子邮箱地址',
    continueWithEmail: '使用邮箱继续',
    or: '或',
    continueWithGoogle: '使用 Google 继续',
    continueWithApple: '使用 Apple 继续',
    legal: '继续即表示您同意条款和隐私政策。',
  },
};

export default function LoginScreen() {
  const router = useRouter();
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const { sendEmailOtp, signInWithGoogle, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function onEmail() {
    if (!email.includes('@')) return Alert.alert(t.enterValidEmail);
    setBusy(true);
    try {
      await sendEmailOtp(email.trim());
      router.push({ pathname: '/(auth)/verify', params: { email: email.trim() } });
    } catch (e: any) {
      Alert.alert(t.couldNotSendCode, e.message);
    } finally {
      setBusy(false);
    }
  }

  async function wrap(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } catch (e: any) { Alert.alert(t.signInFailed, e.message); }
    finally { setBusy(false); }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>{IS_DRIVER_APP ? 'AngkorGo Driver' : 'AngkorGo'}</Text>
      <Text style={styles.tagline}>{IS_DRIVER_APP ? t.driverTagline : t.tagline}</Text>

      <TextInput
        style={styles.input}
        placeholder={t.emailPlaceholder}
        placeholderTextColor="#9AA0A6"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <Pressable style={[styles.primary, busy && styles.disabled]} onPress={onEmail} disabled={busy}>
        <Text style={styles.primaryText}>{t.continueWithEmail}</Text>
      </Pressable>

      <View style={styles.divider}><Text style={styles.dividerText}>{t.or}</Text></View>

      <Pressable style={styles.oauth} onPress={() => wrap(signInWithGoogle)} disabled={busy}>
        <Text style={styles.oauthText}>{t.continueWithGoogle}</Text>
      </Pressable>

      {Platform.OS === 'ios' && (
        <Pressable style={[styles.oauth, styles.apple]} onPress={() => wrap(signInWithApple)} disabled={busy}>
          <Text style={[styles.oauthText, { color: '#fff' }]}>{t.continueWithApple}</Text>
        </Pressable>
      )}

      <Text style={styles.legal}>{t.legal}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7', padding: 24, justifyContent: 'center' },
  brand: { color: '#1C1C1C', fontSize: 30, fontWeight: '800', textAlign: 'center' },
  tagline: { color: '#7A7A7A', fontSize: 15, textAlign: 'center', marginTop: 6, marginBottom: 40 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, color: '#1C1C1C', fontSize: 16,
    borderWidth: 1, borderColor: '#ECECEC', marginBottom: 12,
  },
  primary: { backgroundColor: '#00B14F', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  divider: { alignItems: 'center', marginVertical: 20 },
  dividerText: { color: '#9AA0A6' },
  oauth: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#ECECEC', marginBottom: 12,
  },
  apple: { backgroundColor: '#000', borderColor: '#000' },
  oauthText: { color: '#1C1C1C', fontSize: 16, fontWeight: '600' },
  legal: { color: '#9AA0A6', fontSize: 12, textAlign: 'center', marginTop: 24 },
});
