// WOWNOW-style top bar: location selector on the left, language-flag selector
// on the right. Each opens a picker modal. Styled for a green header.
import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { LANGUAGES, type Language } from '@angkorgo/shared';
import { theme } from '@/lib/theme';
import { useLocale } from '@/lib/locale';

const FLAGS: Record<Language, string> = { en: '🇬🇧', km: '🇰🇭', zh: '🇨🇳' };
const CITIES = ['Phnom Penh', 'Siem Reap', 'Battambang', 'Sihanoukville', 'Kampot', 'Kep', 'Kampong Cham'];

export function LocationLangBar({ right }: { right?: React.ReactNode }) {
  const { lang, setLang, city, setCity } = useLocale();
  const [cityOpen, setCityOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  return (
    <View style={styles.row}>
      <Pressable style={styles.loc} onPress={() => setCityOpen(true)} hitSlop={8}>
        <Text style={styles.pin}>📍</Text>
        <View>
          <Text style={styles.locLabel}>Your location</Text>
          <Text style={styles.locCity}>{city} ▾</Text>
        </View>
      </Pressable>

      <View style={styles.rightWrap}>
        <Pressable style={styles.flagChip} onPress={() => setLangOpen(true)} hitSlop={8}>
          <Text style={styles.flag}>{FLAGS[lang]}</Text>
          <Text style={styles.flagCode}>{lang.toUpperCase()} ▾</Text>
        </Pressable>
        {right}
      </View>

      {/* City picker */}
      <Modal visible={cityOpen} transparent animationType="fade" onRequestClose={() => setCityOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCityOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Choose your city</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {CITIES.map((c) => (
                <Pressable key={c} style={styles.optRow} onPress={() => { setCity(c); setCityOpen(false); }}>
                  <Text style={[styles.optText, c === city && styles.optActive]}>📍 {c}</Text>
                  {c === city && <Text style={styles.check}>✓</Text>}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Language picker */}
      <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLangOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Language</Text>
            {LANGUAGES.map((l) => (
              <Pressable key={l.code} style={styles.optRow} onPress={() => { setLang(l.code); setLangOpen(false); }}>
                <Text style={[styles.optText, l.code === lang && styles.optActive]}>{FLAGS[l.code]}  {l.label}</Text>
                {l.code === lang && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  loc: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  pin: { fontSize: 18 },
  locLabel: { color: '#CFEAD9', fontSize: 11, fontWeight: '600' },
  locCity: { color: '#fff', fontSize: 15, fontWeight: '800' },
  rightWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flagChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  flag: { fontSize: 16 },
  flagCode: { color: '#fff', fontWeight: '700', fontSize: 13 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  sheet: { backgroundColor: '#fff', borderRadius: 22, padding: 20, width: '100%', maxWidth: 360 },
  sheetTitle: { color: theme.ink, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  optRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  optText: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  optActive: { color: theme.green, fontWeight: '800' },
  check: { color: theme.green, fontSize: 16, fontWeight: '900' },
});
