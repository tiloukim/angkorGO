// Language-flag picker chip + modal, backed by the shared LocaleProvider.
// tone: 'green' for green headers, 'light' for light screens.
import { useState } from 'react';
import { Text, Pressable, Modal, StyleSheet } from 'react-native';
import { LANGUAGES, type Language } from '@angkorgo/shared';
import { theme } from '@/lib/theme';
import { useLocale } from '@/lib/locale';

const FLAGS: Record<Language, string> = { en: '🇬🇧', km: '🇰🇭', zh: '🇨🇳' };

export function LanguagePicker({ tone = 'green' }: { tone?: 'green' | 'light' }) {
  const { lang, setLang } = useLocale();
  const [open, setOpen] = useState(false);
  const green = tone === 'green';

  return (
    <>
      <Pressable
        style={[styles.chip, green ? styles.chipGreen : styles.chipLight]}
        onPress={() => setOpen(true)}
        hitSlop={8}
      >
        <Text style={styles.flag}>{FLAGS[lang]}</Text>
        <Text style={[styles.code, green ? styles.codeGreen : styles.codeLight]}>{lang.toUpperCase()} ▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Language</Text>
            {LANGUAGES.map((l) => (
              <Pressable key={l.code} style={styles.optRow} onPress={() => { setLang(l.code); setOpen(false); }}>
                <Text style={[styles.optText, l.code === lang && styles.optActive]}>{FLAGS[l.code]}  {l.label}</Text>
                {l.code === lang && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipGreen: { backgroundColor: 'rgba(255,255,255,0.18)' },
  chipLight: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.border },
  flag: { fontSize: 16 },
  code: { fontWeight: '700', fontSize: 13 },
  codeGreen: { color: '#fff' },
  codeLight: { color: theme.ink },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  sheet: { backgroundColor: '#fff', borderRadius: 22, padding: 20, width: '100%', maxWidth: 360 },
  sheetTitle: { color: theme.ink, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  optRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  optText: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  optActive: { color: theme.green, fontWeight: '800' },
  check: { color: theme.green, fontSize: 16, fontWeight: '900' },
});
