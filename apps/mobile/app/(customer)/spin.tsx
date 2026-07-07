// Spin & Win — a gamified prize wheel (WOWNOW-style).
// Wheel drawn with react-native-svg; spin animated with RN Animated (native
// driver). We pick the winning slice, then rotate so it lands under the pointer.
import { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { theme } from '@/lib/theme';

type Prize = { label: string; color: string; text: string; desc: string };

// 8 slices — adjacent colors differ; gold uses dark text for contrast.
const PRIZES: Prize[] = [
  { label: '50% ride', color: '#00B14F', text: '#fff', desc: '50% off your next ride 🛺' },
  { label: '$1 food', color: '#FFC400', text: '#1C1C1C', desc: '$1 off your next food order 🍜' },
  { label: 'Free ship', color: '#FF6D00', text: '#fff', desc: 'Free delivery on your next order 📦' },
  { label: '100 pts', color: '#06A0C7', text: '#fff', desc: '100 reward points added 🎁' },
  { label: '$2 off', color: '#7C5CFC', text: '#fff', desc: '$2 off any booking 🏠' },
  { label: '10% stay', color: '#E5484D', text: '#fff', desc: '10% off your next stay 🛏️' },
  { label: 'Try again', color: '#12B886', text: '#fff', desc: 'So close! One more spin? 🔁' },
  { label: 'JACKPOT', color: '#F06595', text: '#fff', desc: 'Free ride + free delivery! 🎉' },
];

const N = PRIZES.length;
const SEG = 360 / N;
const SIZE = 300;
const R = SIZE / 2;
const CX = R;
const CY = R;

// Point on the wheel edge at angle `a` (degrees, clockwise from top).
function edge(a: number) {
  const rad = (a * Math.PI) / 180;
  return { x: CX + R * Math.sin(rad), y: CY - R * Math.cos(rad) };
}

function slicePath(i: number) {
  const a = edge(i * SEG);
  const b = edge((i + 1) * SEG);
  return `M ${CX} ${CY} L ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;
}

export default function SpinScreen() {
  const router = useRouter();
  const rotation = useRef(new Animated.Value(0)).current;
  const total = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [spinsLeft, setSpinsLeft] = useState(3);
  const [result, setResult] = useState<Prize | null>(null);

  const spinDeg = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  function spin() {
    if (spinning || spinsLeft <= 0) return;
    setResult(null);
    setSpinning(true);

    const i = Math.floor(Math.random() * N);
    const mid = i * SEG + SEG / 2;
    const landing = (360 - mid + 360) % 360; // rotation that puts slice i under the top pointer
    const currentMod = ((total.current % 360) + 360) % 360;
    const delta = 360 * 5 + ((landing - currentMod + 360) % 360);
    const next = total.current + delta;
    total.current = next;

    Animated.timing(rotation, {
      toValue: next,
      duration: 3800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setSpinsLeft((n) => n - 1);
      setResult(PRIZES[i]);
    });
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.title}>Spin &amp; Win</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.sub}>🎡 {spinsLeft > 0 ? `${spinsLeft} free spin${spinsLeft > 1 ? 's' : ''} left today` : 'Come back tomorrow for more!'}</Text>

      {/* Wheel */}
      <View style={styles.wheelWrap}>
        <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
          <Svg width={SIZE} height={SIZE}>
            {PRIZES.map((p, i) => (
              <Path key={p.label} d={slicePath(i)} fill={p.color} stroke="#fff" strokeWidth={2} />
            ))}
            {PRIZES.map((p, i) => (
              <G key={`t${i}`} rotation={i * SEG + SEG / 2} originX={CX} originY={CY}>
                <SvgText x={CX} y={CY - R * 0.6} fill={p.text} fontSize={14} fontWeight="800" textAnchor="middle">
                  {p.label}
                </SvgText>
              </G>
            ))}
            <Circle cx={CX} cy={CY} r={46} fill="#fff" />
          </Svg>
        </Animated.View>

        {/* Pointer */}
        <View style={styles.pointer} />

        {/* Center spin button */}
        <Pressable style={[styles.hub, spinning && styles.hubDisabled]} onPress={spin} disabled={spinning || spinsLeft <= 0}>
          <Text style={styles.hubText}>{spinning ? '···' : 'SPIN'}</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.spinBtn, (spinning || spinsLeft <= 0) && styles.spinBtnDisabled]} onPress={spin} disabled={spinning || spinsLeft <= 0}>
        <Text style={styles.spinBtnText}>{spinning ? 'Spinning…' : spinsLeft > 0 ? 'Tap to spin' : 'No spins left'}</Text>
      </Pressable>

      {/* Result overlay */}
      {result && (
        <View style={styles.overlay}>
          <View style={styles.resultCard}>
            <Text style={styles.resultEmoji}>{result.label === 'Try again' ? '😅' : '🎉'}</Text>
            <Text style={styles.resultTitle}>{result.label === 'Try again' ? 'Almost!' : 'You won!'}</Text>
            <Text style={styles.resultDesc}>{result.desc}</Text>
            <Pressable style={styles.claim} onPress={() => { setResult(null); router.push('/(customer)/wallet'); }}>
              <Text style={styles.claimText}>{result.label === 'Try again' ? 'OK' : 'Claim reward'}</Text>
            </Pressable>
            {spinsLeft > 0 && (
              <Pressable onPress={() => setResult(null)} hitSlop={8}>
                <Text style={styles.again}>Spin again ({spinsLeft} left)</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.greenDark, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, paddingTop: 60 },
  back: { color: '#fff', fontSize: 26, fontWeight: '800' },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  sub: { color: '#CFEAD9', fontSize: 14, marginTop: 8, marginBottom: 24, fontWeight: '600' },

  wheelWrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  pointer: {
    position: 'absolute', top: -6, alignSelf: 'center',
    width: 0, height: 0, borderLeftWidth: 15, borderRightWidth: 15, borderTopWidth: 26,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: theme.gold, zIndex: 5,
  },
  hub: {
    position: 'absolute', width: 82, height: 82, borderRadius: 999, backgroundColor: theme.green,
    alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff',
  },
  hubDisabled: { backgroundColor: '#7A7A7A' },
  hubText: { color: '#fff', fontSize: 18, fontWeight: '900' },

  spinBtn: { marginTop: 32, backgroundColor: theme.gold, borderRadius: 999, paddingVertical: 16, paddingHorizontal: 48 },
  spinBtnDisabled: { opacity: 0.5 },
  spinBtnText: { color: '#1C1C1C', fontSize: 17, fontWeight: '900' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  resultCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%' },
  resultEmoji: { fontSize: 56 },
  resultTitle: { color: theme.ink, fontSize: 24, fontWeight: '900', marginTop: 8 },
  resultDesc: { color: theme.muted, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  claim: { backgroundColor: theme.green, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 40, marginTop: 20 },
  claimText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  again: { color: theme.muted, fontSize: 14, fontWeight: '600', marginTop: 14 },
});
