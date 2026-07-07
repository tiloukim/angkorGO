// AngkorGo logo: a lotus-tower mark in a rounded tile + wordmark.
// `tone` sets the wordmark color; the mark is a black tile with white towers
// and an Uber-Eats-green base, echoing the brand palette.
import { towerPath } from './AngkorWat';

export function LogoMark({ size = 32 }: { size?: number }) {
  // Three towers inside a 100x100 tile, sitting on a green base bar.
  const baseY = 74;
  const towers = [
    towerPath(50, baseY, 12, 46), // center
    towerPath(28, baseY, 8, 30),
    towerPath(72, baseY, 8, 30),
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="24" fill="#000000" />
      <g fill="#ffffff">
        {towers.map((d, i) => (
          <path key={i} d={d} />
        ))}
        <rect x="18" y="74" width="64" height="7" rx="2" />
      </g>
      <rect x="14" y="83" width="72" height="6" rx="3" fill="#06c167" />
    </svg>
  );
}

export function Logo({
  size = 30,
  tone = 'black',
  showText = true,
}: {
  size?: number;
  tone?: 'black' | 'white';
  showText?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {showText && (
        <span
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: tone === 'white' ? '#ffffff' : '#000000' }}
        >
          Angkor<span style={{ color: '#06c167' }}>Go</span>
        </span>
      )}
    </span>
  );
}
