// Tap-to-pick date field with an in-app month calendar (pure JS — works in Expo
// Go, no native module). Emits YYYY-MM-DD. `min` (YYYY-MM-DD) disables earlier
// days; today is always the floor.
import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function iso(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function todayISO() { const n = new Date(); return iso(n.getFullYear(), n.getMonth(), n.getDate()); }

export function DateField({
  value, onChange, placeholder, min, style,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; min?: string; style?: any;
}) {
  const [open, setOpen] = useState(false);
  const init = value ? new Date(value + 'T00:00:00') : new Date();
  const [ym, setYm] = useState({ y: init.getFullYear(), m: init.getMonth() });

  const floor = min && min > todayISO() ? min : todayISO();
  const firstWeekday = new Date(ym.y, ym.m, 1).getDay();
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const monthLabel = new Date(ym.y, ym.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  function shift(delta: number) {
    let m = ym.m + delta, y = ym.y;
    if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
    setYm({ y, m });
  }

  return (
    <>
      <Pressable style={[styles.field, style]} onPress={() => setOpen(true)}>
        <Text style={styles.icon}>📅</Text>
        <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.calendar} onPress={(e) => e.stopPropagation()}>
            <View style={styles.calHeader}>
              <Pressable onPress={() => shift(-1)} hitSlop={12} style={styles.nav}><Text style={styles.navText}>‹</Text></Pressable>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              <Pressable onPress={() => shift(1)} hitSlop={12} style={styles.nav}><Text style={styles.navText}>›</Text></Pressable>
            </View>
            <View style={styles.weekRow}>
              {WEEK.map((w, i) => <Text key={i} style={styles.weekDay}>{w}</Text>)}
            </View>
            <View style={styles.grid}>
              {cells.map((d, i) => {
                if (d === null) return <View key={i} style={styles.cell} />;
                const cellIso = iso(ym.y, ym.m, d);
                const disabled = cellIso < floor;
                const selected = cellIso === value;
                return (
                  <Pressable
                    key={i}
                    style={styles.cell}
                    disabled={disabled}
                    onPress={() => { onChange(cellIso); setOpen(false); }}
                  >
                    <View style={[styles.day, selected && styles.daySelected]}>
                      <Text style={[styles.dayText, disabled && styles.dayDisabled, selected && styles.daySelectedText]}>{d}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#ECECEC' },
  icon: { fontSize: 15 },
  fieldText: { flex: 1, color: '#1C1C1C', fontSize: 14 },
  placeholder: { color: '#9AA0A6' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  calendar: { width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18 },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  nav: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6F7' },
  navText: { fontSize: 22, fontWeight: '800', color: '#1C1C1C', marginTop: -2 },
  monthLabel: { fontSize: 16, fontWeight: '800', color: '#1C1C1C' },
  weekRow: { flexDirection: 'row' },
  weekDay: { width: `${100 / 7}%`, textAlign: 'center', color: '#9AA0A6', fontSize: 12, fontWeight: '700', paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: '#00B14F' },
  dayText: { fontSize: 15, color: '#1C1C1C' },
  dayDisabled: { color: '#D0D3D6' },
  daySelectedText: { color: '#FFFFFF', fontWeight: '800' },
});
