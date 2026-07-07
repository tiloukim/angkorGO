// AngkorGo design tokens — Grab-inspired super-app look.
// Vibrant green primary, gold promos, pastel service tiles, light canvas.
export const theme = {
  // Brand
  green: '#00B14F',
  greenDark: '#00693C',
  greenSoft: '#E4F7EC',
  gold: '#FFC400',
  goldSoft: '#FFF3C4',
  orange: '#FF6D00',

  // Neutrals
  bg: '#F5F6F7',
  card: '#FFFFFF',
  border: '#ECECEC',
  ink: '#1C1C1C',
  muted: '#7A7A7A',
  onGreen: '#FFFFFF',

  // Radii
  r: { sm: 10, md: 16, lg: 20, xl: 28, pill: 999 },
} as const;

// Pastel backgrounds for the service-icon grid (cycles for a lively grid).
export const tileColors = {
  blue: '#E6F0FF',
  green: '#E4F7EC',
  lavender: '#EFEAFE',
  peach: '#FFEEE0',
  pink: '#FDE7F1',
  gold: '#FFF6D8',
  mint: '#E2F6F1',
  sky: '#E8F7FF',
} as const;
