// Tuki — AngkorGo's mascot: a friendly green elephant (a nod to Angkor and
// to the tuk-tuk). Pure SVG badge; drops onto any background.
export function Mascot({ size = 96, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" className={className} aria-label="Tuki, the AngkorGo mascot">
      <circle cx="120" cy="120" r="120" fill="#00B14F" />
      <g fill="#ffffff">
        {/* ears */}
        <ellipse cx="60" cy="122" rx="40" ry="52" />
        <ellipse cx="180" cy="122" rx="40" ry="52" />
        {/* head */}
        <rect x="76" y="72" width="88" height="104" rx="44" />
        {/* trunk */}
        <path d="M104 150 C100 196 108 214 120 214 C132 214 140 196 136 150 C132 168 124 172 120 172 C116 172 108 168 104 150 Z" />
        {/* tusks */}
        <path d="M104 170 q-6 14 2 20 q4 -8 6 -18 z" fill="#FFF3C4" />
        <path d="M136 170 q6 14 -2 20 q-4 -8 -6 -18 z" fill="#FFF3C4" />
      </g>
      {/* inner ears */}
      <ellipse cx="62" cy="124" rx="22" ry="30" fill="#CFEAD9" />
      <ellipse cx="178" cy="124" rx="22" ry="30" fill="#CFEAD9" />
      {/* eyes */}
      <g fill="#0F5F3A">
        <circle cx="102" cy="120" r="9" />
        <circle cx="138" cy="120" r="9" />
      </g>
      {/* cheeks */}
      <g fill="#FFC400" opacity="0.5">
        <circle cx="92" cy="140" r="7" />
        <circle cx="148" cy="140" r="7" />
      </g>
    </svg>
  );
}
