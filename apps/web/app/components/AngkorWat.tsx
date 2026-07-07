// Stylized Angkor Wat silhouette (five lotus-bud towers on a tiered gallery).
// Pure SVG, inherits color via `currentColor` — use text-* utilities to tint.

// Builds one lotus-bud tower path centered at cx, rising `h` from `baseY`.
export function towerPath(cx: number, baseY: number, w: number, h: number) {
  const tip = baseY - h;
  return [
    `M ${cx - w} ${baseY}`,
    `L ${cx - w} ${baseY - h * 0.4}`,
    `Q ${cx - w} ${baseY - h * 0.55} ${cx - w * 0.55} ${baseY - h * 0.62}`,
    `L ${cx - w * 0.4} ${baseY - h * 0.78}`,
    `Q ${cx - w * 0.42} ${baseY - h * 0.93} ${cx} ${tip}`,
    `Q ${cx + w * 0.42} ${baseY - h * 0.93} ${cx + w * 0.4} ${baseY - h * 0.78}`,
    `L ${cx + w * 0.55} ${baseY - h * 0.62}`,
    `Q ${cx + w} ${baseY - h * 0.55} ${cx + w} ${baseY - h * 0.4}`,
    `L ${cx + w} ${baseY}`,
    'Z',
  ].join(' ');
}

export function AngkorWat({ className = '' }: { className?: string }) {
  const baseY = 132;
  const towers = [
    towerPath(160, baseY, 22, 98), // central spire
    towerPath(108, baseY, 17, 70),
    towerPath(212, baseY, 17, 70),
    towerPath(66, baseY, 14, 52),
    towerPath(254, baseY, 14, 52),
  ];
  return (
    <svg viewBox="0 0 320 172" className={className} fill="currentColor" aria-hidden="true">
      {towers.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {/* Tiered temple gallery + causeway */}
      <rect x="34" y="132" width="252" height="14" rx="2" />
      <rect x="20" y="146" width="280" height="12" rx="2" />
      <rect x="8" y="158" width="304" height="8" rx="2" />
      {/* Gallery window rhythm */}
      <g opacity="0.85">
        {Array.from({ length: 11 }).map((_, i) => (
          <rect key={i} x={44 + i * 22} y="135" width="6" height="8" rx="1" fill="#ffffff" opacity="0.18" />
        ))}
      </g>
    </svg>
  );
}
