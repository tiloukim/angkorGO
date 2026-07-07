// Welcome / language splash (WOWNOW-style) — branded first screen with the
// mascot and a trilingual chooser, then continues to sign in.
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LANGUAGES, type Language } from '@angkorgo/shared';
import { theme } from '@/lib/theme';

const FLAGS: Record<Language, string> = { en: '🇬🇧', km: '🇰🇭', zh: '🇨🇳' };

export default function WelcomeScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');

  return (
    <View style={styles.container}>
      {/* Branded hero */}
      <View style={styles.hero}>
        <View style={styles.mascot}>
          <Text style={styles.mascotEmoji}>🐘</Text>
        </View>
        <Text style={styles.brand}>AngkorGo</Text>
        <Text style={styles.tagline}>Cambodia&apos;s everyday super-app</Text>
      </View>

      {/* Language sheet */}
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>Choose language</Text>
        {LANGUAGES.map((l) => {
          const active = l.code === lang;
          return (
            <Pressable key={l.code} style={[styles.option, active && styles.optionActive]} onPress={() => setLang(l.code)}>
              <Text style={styles.flag}>{FLAGS[l.code]}</Text>
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{l.label}</Text>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}

        <Pressable style={styles.confirm} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.confirmText}>Confirm</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.greenDark },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  mascot: { width: 132, height: 132, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  mascotEmoji: { fontSize: 72 },
  brand: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  tagline: { color: '#CFEAD9', fontSize: 15 },

  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 12 },
  sheetTitle: { color: theme.ink, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.card,
  },
  optionActive: { borderColor: theme.green, backgroundColor: theme.greenSoft },
  flag: { fontSize: 22 },
  optionText: { flex: 1, color: theme.ink, fontSize: 16, fontWeight: '700' },
  optionTextActive: { color: theme.greenDark },
  radio: { width: 22, height: 22, borderRadius: 999, borderWidth: 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: theme.green },
  radioDot: { width: 11, height: 11, borderRadius: 999, backgroundColor: theme.green },

  confirm: { backgroundColor: theme.green, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8 },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
