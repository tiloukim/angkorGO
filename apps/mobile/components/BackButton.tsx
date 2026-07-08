// Shared back button. The customer stack runs headerShown:false, so screens
// place this manually. Three variants for the different screen backdrops:
//   onDark  — translucent white circle for green headers
//   float   — white circle w/ shadow, floats over maps/images (absolute)
//   light   — bare dark chevron for plain light screens
import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

type Variant = 'onDark' | 'float' | 'light';

export function BackButton({ variant = 'light', style }: { variant?: Variant; style?: ViewStyle }) {
  const router = useRouter();
  return (
    <Pressable
      style={[styles.base, styles[variant], style]}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/(customer)'))}
      hitSlop={12}
    >
      <Text style={[styles.arrow, variant === 'onDark' || variant === 'float' ? null : styles.arrowDark,
        variant === 'onDark' ? styles.arrowLight : null]}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  onDark: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)' },
  float: {
    position: 'absolute', top: 56, left: 20, width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 4, zIndex: 10,
  },
  light: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECECEC' },
  arrow: { fontSize: 28, fontWeight: '800', lineHeight: 30, marginTop: -3 },
  arrowDark: { color: '#1C1C1C' },
  arrowLight: { color: '#FFFFFF', fontSize: 26, lineHeight: 28, marginTop: -2 },
});
