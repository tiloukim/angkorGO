// Tuki riding a tuk-tuk (React Native) — white elephant driving a green-and-
// gold Cambodian tuk-tuk. Ported from the web SVG; scales cleanly.
import Svg, { G, Path, Circle, Ellipse, Rect, Line } from 'react-native-svg';

export function TukiTukTuk({ width = 240 }: { width?: number }) {
  const height = Math.round((width * 300) / 420);
  return (
    <Svg width={width} height={height} viewBox="0 0 420 300">
      {/* motion lines */}
      <G stroke="#00B14F" strokeWidth={6} strokeLinecap="round" opacity={0.35}>
        <Line x1={6} y1={150} x2={52} y2={150} />
        <Line x1={14} y1={182} x2={70} y2={182} />
        <Line x1={6} y1={214} x2={44} y2={214} />
      </G>

      {/* ground shadow */}
      <Ellipse cx={216} cy={272} rx={176} ry={15} fill="#000000" opacity={0.08} />

      {/* chassis + front fork */}
      <Path d="M232 206 L300 206 Q322 206 322 222 L322 238 L296 238 L272 216 L232 216 Z" fill="#0E7A3A" />
      <Rect x={298} y={150} width={13} height={86} rx={6} fill="#0E7A3A" />

      {/* wheels */}
      <Circle cx={132} cy={230} r={44} fill="#1C1C1C" />
      <Circle cx={132} cy={230} r={21} fill="#F5F6F7" />
      <Circle cx={132} cy={230} r={8} fill="#00B14F" />
      <Circle cx={320} cy={238} r={34} fill="#1C1C1C" />
      <Circle cx={320} cy={238} r={16} fill="#F5F6F7" />
      <Circle cx={320} cy={238} r={6} fill="#00B14F" />

      {/* cabin body + skirt + interior */}
      <Path d="M58 170 Q58 128 100 128 L210 128 Q252 128 266 164 L276 198 Q278 216 258 216 L80 216 Q58 216 58 194 Z" fill="#00B14F" />
      <Path d="M66 198 L272 198 Q276 216 256 216 L82 216 Q64 216 64 200 Z" fill="#0E9A45" />
      <Path d="M96 152 L206 152 L214 196 L104 196 Z" fill="#0E7A3A" opacity={0.45} />

      {/* canopy roof + scalloped fringe */}
      <Path d="M52 132 Q50 96 94 94 L206 94 Q244 96 240 132 Z" fill="#FFC400" />
      {Array.from({ length: 9 }).map((_, i) => (
        <Circle key={i} cx={64 + i * 21} cy={132} r={7} fill="#FFC400" />
      ))}
      <Rect x={60} y={128} width={8} height={12} fill="#E0A800" />
      <Rect x={228} y={128} width={8} height={12} fill="#E0A800" />

      {/* AngkorGo pennant */}
      <Rect x={142} y={66} width={4} height={30} fill="#0E7A3A" />
      <Path d="M146 68 L182 75 L146 84 Z" fill="#E5484D" />

      {/* Tuki (white elephant, driving) */}
      <Ellipse cx={134} cy={182} rx={42} ry={32} fill="#FFFFFF" />
      <Ellipse cx={122} cy={152} rx={26} ry={32} fill="#FFFFFF" />
      <Ellipse cx={123} cy={154} rx={15} ry={20} fill="#CFEAD9" />
      <Ellipse cx={152} cy={152} rx={34} ry={32} fill="#FFFFFF" />
      <Path d="M176 140 C216 133 248 140 262 158 C267 165 259 174 252 168 C240 158 214 155 188 162 C181 164 173 151 176 140 Z" fill="#FFFFFF" />
      <Path d="M168 176 q-4 12 4 16 q4 -6 4 -14 z" fill="#FFF3C4" />
      <Circle cx={160} cy={146} r={6} fill="#0F5F3A" />
      <Circle cx={146} cy={164} r={6} fill="#FFC400" opacity={0.5} />
      <Path d="M124 130 Q152 104 182 128 L179 135 Q152 116 127 137 Z" fill="#E5484D" />
      <Rect x={176} y={128} width={18} height={7} rx={3} fill="#E5484D" />

      {/* handlebar + headlight */}
      <Path d="M262 150 Q284 142 292 160" stroke="#1C1C1C" strokeWidth={6} fill="none" strokeLinecap="round" />
      <Circle cx={284} cy={184} r={9} fill="#FFF3C4" stroke="#E0A800" strokeWidth={2} />
    </Svg>
  );
}
