// Tuki mascot badge (React Native) — a friendly white elephant on a green tile.
import Svg, { Circle, Ellipse, Rect, Path, G } from 'react-native-svg';

export function Mascot({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Circle cx={120} cy={120} r={120} fill="#00B14F" />
      <G fill="#ffffff">
        <Ellipse cx={60} cy={122} rx={40} ry={52} />
        <Ellipse cx={180} cy={122} rx={40} ry={52} />
        <Rect x={76} y={72} width={88} height={104} rx={44} />
        <Path d="M104 150 C100 196 108 214 120 214 C132 214 140 196 136 150 C132 168 124 172 120 172 C116 172 108 168 104 150 Z" />
        <Path d="M104 170 q-6 14 2 20 q4 -8 6 -18 z" fill="#FFF3C4" />
        <Path d="M136 170 q6 14 -2 20 q-4 -8 -6 -18 z" fill="#FFF3C4" />
      </G>
      <Ellipse cx={62} cy={124} rx={22} ry={30} fill="#CFEAD9" />
      <Ellipse cx={178} cy={124} rx={22} ry={30} fill="#CFEAD9" />
      <G fill="#0F5F3A">
        <Circle cx={102} cy={120} r={9} />
        <Circle cx={138} cy={120} r={9} />
      </G>
      <G fill="#FFC400" opacity={0.5}>
        <Circle cx={92} cy={140} r={7} />
        <Circle cx={148} cy={140} r={7} />
      </G>
    </Svg>
  );
}
