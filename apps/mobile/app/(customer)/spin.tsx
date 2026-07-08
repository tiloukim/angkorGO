// Spin & Win — a gamified prize wheel (WOWNOW-style).
// Wheel drawn with react-native-svg; spin animated with RN Animated (native
// driver). We pick the winning slice, then rotate so it lands under the pointer.
import { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { theme } from '@/lib/theme';
import { useLocale } from '@/lib/locale';
import { type Language } from '@angkorgo/shared';
import { BackButton } from '@/components/BackButton';

type Prize = { key: string; color: string; text: string };

// 8 slices — adjacent colors differ; gold uses dark text for contrast.
const PRIZES: Prize[] = [
  { key: 'ride50', color: '#00B14F', text: '#fff' },
  { key: 'food1', color: '#FFC400', text: '#1C1C1C' },
  { key: 'freeship', color: '#FF6D00', text: '#fff' },
  { key: 'pts100', color: '#06A0C7', text: '#fff' },
  { key: 'off2', color: '#7C5CFC', text: '#fff' },
  { key: 'stay10', color: '#E5484D', text: '#fff' },
  { key: 'tryagain', color: '#12B886', text: '#fff' },
  { key: 'jackpot', color: '#F06595', text: '#fff' },
];

const L: Record<Language, Record<string, string>> = {
  en: {
    title: 'Spin & Win',
    spinsLeft: '{n} free spins left today',
    comeBack: 'Come back tomorrow for more!',
    hubSpin: 'SPIN',
    spinning: 'Spinning…',
    tapToSpin: 'Tap to spin',
    noSpins: 'No spins left',
    won: 'You won!',
    almost: 'Almost!',
    claim: 'Claim reward',
    ok: 'OK',
    again: 'Spin again ({n} left)',
    lbl_ride50: '50% ride', lbl_food1: '$1 food', lbl_freeship: 'Free ship', lbl_pts100: '100 pts',
    lbl_off2: '$2 off', lbl_stay10: '10% stay', lbl_tryagain: 'Try again', lbl_jackpot: 'JACKPOT',
    desc_ride50: '50% off your next ride 🛺',
    desc_food1: '$1 off your next food order 🍜',
    desc_freeship: 'Free delivery on your next order 📦',
    desc_pts100: '100 reward points added 🎁',
    desc_off2: '$2 off any booking 🏠',
    desc_stay10: '10% off your next stay 🛏️',
    desc_tryagain: 'So close! One more spin? 🔁',
    desc_jackpot: 'Free ride + free delivery! 🎉',
  },
  km: {
    title: 'បង្វិល & ឈ្នះ',
    spinsLeft: 'នៅសល់ {n} ដងបង្វិលឥតគិតថ្លៃថ្ងៃនេះ',
    comeBack: 'ត្រឡប់មកវិញនៅថ្ងៃស្អែក!',
    hubSpin: 'បង្វិល',
    spinning: 'កំពុងបង្វិល…',
    tapToSpin: 'ចុចដើម្បីបង្វិល',
    noSpins: 'អស់ដងបង្វិលហើយ',
    won: 'អ្នកឈ្នះ!',
    almost: 'ជិតហើយ!',
    claim: 'ទទួលរង្វាន់',
    ok: 'យល់ព្រម',
    again: 'បង្វិលម្តងទៀត (នៅសល់ {n})',
    lbl_ride50: 'ជិះ 50%', lbl_food1: 'អាហារ $1', lbl_freeship: 'ដឹកឥតគិតថ្លៃ', lbl_pts100: '100 ពិន្ទុ',
    lbl_off2: 'បញ្ចុះ $2', lbl_stay10: 'ស្នាក់ 10%', lbl_tryagain: 'ព្យាយាមម្តងទៀត', lbl_jackpot: 'រង្វាន់ធំ',
    desc_ride50: 'បញ្ចុះ 50% សម្រាប់ការជិះបន្ទាប់ 🛺',
    desc_food1: 'បញ្ចុះ $1 សម្រាប់ការកម្ម៉ង់អាហារបន្ទាប់ 🍜',
    desc_freeship: 'ដឹកជញ្ជូនឥតគិតថ្លៃសម្រាប់ការកម្ម៉ង់បន្ទាប់ 📦',
    desc_pts100: 'បានបន្ថែម 100 ពិន្ទុរង្វាន់ 🎁',
    desc_off2: 'បញ្ចុះ $2 សម្រាប់ការកក់ណាមួយ 🏠',
    desc_stay10: 'បញ្ចុះ 10% សម្រាប់ការស្នាក់នៅបន្ទាប់ 🛏️',
    desc_tryagain: 'ជិតហើយ! បង្វិលម្តងទៀត? 🔁',
    desc_jackpot: 'ជិះឥតគិតថ្លៃ + ដឹកឥតគិតថ្លៃ! 🎉',
  },
  zh: {
    title: '转盘赢奖',
    spinsLeft: '今日剩余 {n} 次免费转盘',
    comeBack: '明天再来吧！',
    hubSpin: '转',
    spinning: '转动中…',
    tapToSpin: '点击转动',
    noSpins: '没有转盘次数了',
    won: '你赢了！',
    almost: '差一点！',
    claim: '领取奖励',
    ok: '好的',
    again: '再转一次（剩余 {n}）',
    lbl_ride50: '5折乘车', lbl_food1: '$1 美食', lbl_freeship: '免运费', lbl_pts100: '100 积分',
    lbl_off2: '$2 优惠', lbl_stay10: '住宿9折', lbl_tryagain: '再试一次', lbl_jackpot: '大奖',
    desc_ride50: '下次乘车5折优惠 🛺',
    desc_food1: '下次美食订单立减 $1 🍜',
    desc_freeship: '下次订单免配送费 📦',
    desc_pts100: '已添加 100 奖励积分 🎁',
    desc_off2: '任意预订立减 $2 🏠',
    desc_stay10: '下次住宿9折优惠 🛏️',
    desc_tryagain: '就差一点！再转一次？ 🔁',
    desc_jackpot: '免费乘车 + 免费配送！ 🎉',
  },
};

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
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
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
        <BackButton variant="onDark" />
        <Text style={styles.title}>{t.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.sub}>🎡 {spinsLeft > 0 ? t.spinsLeft.replace('{n}', String(spinsLeft)) : t.comeBack}</Text>

      {/* Wheel */}
      <View style={styles.wheelWrap}>
        <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
          <Svg width={SIZE} height={SIZE}>
            {PRIZES.map((p, i) => (
              <Path key={p.key} d={slicePath(i)} fill={p.color} stroke="#fff" strokeWidth={2} />
            ))}
            {PRIZES.map((p, i) => (
              <G key={`t${i}`} rotation={i * SEG + SEG / 2} originX={CX} originY={CY}>
                <SvgText x={CX} y={CY - R * 0.6} fill={p.text} fontSize={14} fontWeight="800" textAnchor="middle">
                  {t[`lbl_${p.key}`]}
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
          <Text style={styles.hubText}>{spinning ? '···' : t.hubSpin}</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.spinBtn, (spinning || spinsLeft <= 0) && styles.spinBtnDisabled]} onPress={spin} disabled={spinning || spinsLeft <= 0}>
        <Text style={styles.spinBtnText}>{spinning ? t.spinning : spinsLeft > 0 ? t.tapToSpin : t.noSpins}</Text>
      </Pressable>

      {/* Result overlay */}
      {result && (
        <View style={styles.overlay}>
          <View style={styles.resultCard}>
            <Text style={styles.resultEmoji}>{result.key === 'tryagain' ? '😅' : '🎉'}</Text>
            <Text style={styles.resultTitle}>{result.key === 'tryagain' ? t.almost : t.won}</Text>
            <Text style={styles.resultDesc}>{t[`desc_${result.key}`]}</Text>
            <Pressable style={styles.claim} onPress={() => { setResult(null); router.push('/(customer)/wallet'); }}>
              <Text style={styles.claimText}>{result.key === 'tryagain' ? t.ok : t.claim}</Text>
            </Pressable>
            {spinsLeft > 0 && (
              <Pressable onPress={() => setResult(null)} hitSlop={8}>
                <Text style={styles.again}>{t.again.replace('{n}', String(spinsLeft))}</Text>
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
