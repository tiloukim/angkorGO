// Tuki riding a tuk-tuk — AngkorGo's hero illustration.
// Tuki is a white elephant (auspicious in Khmer culture) driving a green-and-
// gold Cambodian tuk-tuk. Pure SVG; scales cleanly on any background.
export function TukiTukTuk({ size = 320, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={Math.round((size * 300) / 420)}
      viewBox="0 0 420 300"
      className={className}
      aria-label="Tuki the elephant riding a tuk-tuk"
    >
      {/* motion lines */}
      <g stroke="#00B14F" strokeWidth="6" strokeLinecap="round" opacity="0.35">
        <line x1="6" y1="150" x2="52" y2="150" />
        <line x1="14" y1="182" x2="70" y2="182" />
        <line x1="6" y1="214" x2="44" y2="214" />
      </g>

      {/* ground shadow */}
      <ellipse cx="216" cy="272" rx="176" ry="15" fill="#000000" opacity="0.08" />

      {/* chassis + front fork */}
      <path d="M232 206 L300 206 Q322 206 322 222 L322 238 L296 238 L272 216 L232 216 Z" fill="#0E7A3A" />
      <rect x="298" y="150" width="13" height="86" rx="6" fill="#0E7A3A" />

      {/* wheels */}
      <g>
        <circle cx="132" cy="230" r="44" fill="#1C1C1C" />
        <circle cx="132" cy="230" r="21" fill="#F5F6F7" />
        <circle cx="132" cy="230" r="8" fill="#00B14F" />
        <circle cx="320" cy="238" r="34" fill="#1C1C1C" />
        <circle cx="320" cy="238" r="16" fill="#F5F6F7" />
        <circle cx="320" cy="238" r="6" fill="#00B14F" />
      </g>

      {/* cabin body */}
      <path
        d="M58 170 Q58 128 100 128 L210 128 Q252 128 266 164 L276 198 Q278 216 258 216 L80 216 Q58 216 58 194 Z"
        fill="#00B14F"
      />
      {/* lower skirt */}
      <path d="M66 198 L272 198 Q276 216 256 216 L82 216 Q64 216 64 200 Z" fill="#0E9A45" />
      {/* open-side interior shadow */}
      <path d="M96 152 L206 152 L214 196 L104 196 Z" fill="#0E7A3A" opacity="0.45" />

      {/* canopy roof */}
      <path d="M52 132 Q50 96 94 94 L206 94 Q244 96 240 132 Z" fill="#FFC400" />
      {/* scalloped fringe */}
      <g fill="#FFC400">
        {Array.from({ length: 9 }).map((_, i) => (
          <circle key={i} cx={64 + i * 21} cy="132" r="7" />
        ))}
      </g>
      {/* roof poles */}
      <rect x="60" y="128" width="8" height="12" fill="#E0A800" />
      <rect x="228" y="128" width="8" height="12" fill="#E0A800" />

      {/* AngkorGo pennant */}
      <rect x="142" y="66" width="4" height="30" fill="#0E7A3A" />
      <path d="M146 68 L182 75 L146 84 Z" fill="#E5484D" />

      {/* ---- Tuki (white elephant, driving) ---- */}
      {/* body */}
      <ellipse cx="134" cy="182" rx="42" ry="32" fill="#FFFFFF" />
      {/* ear */}
      <ellipse cx="122" cy="152" rx="26" ry="32" fill="#FFFFFF" />
      <ellipse cx="123" cy="154" rx="15" ry="20" fill="#CFEAD9" />
      {/* head */}
      <ellipse cx="152" cy="152" rx="34" ry="32" fill="#FFFFFF" />
      {/* trunk to handlebar */}
      <path
        d="M176 140 C216 133 248 140 262 158 C267 165 259 174 252 168 C240 158 214 155 188 162 C181 164 173 151 176 140 Z"
        fill="#FFFFFF"
      />
      {/* tusk */}
      <path d="M168 176 q-4 12 4 16 q4 -6 4 -14 z" fill="#FFF3C4" />
      {/* eye + cheek */}
      <circle cx="160" cy="146" r="6" fill="#0F5F3A" />
      <circle cx="146" cy="164" r="6" fill="#FFC400" opacity="0.5" />
      {/* red safety cap */}
      <path d="M124 130 Q152 104 182 128 L179 135 Q152 116 127 137 Z" fill="#E5484D" />
      <rect x="176" y="128" width="18" height="7" rx="3" fill="#E5484D" />

      {/* handlebar + headlight */}
      <path d="M262 150 Q284 142 292 160" stroke="#1C1C1C" strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="284" cy="184" r="9" fill="#FFF3C4" stroke="#E0A800" strokeWidth="2" />
    </svg>
  );
}
