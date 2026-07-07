// Shareable portrait promotion poster (3:4). Trilingual EN · KH · ZH.
// Three tones map to the brand palette; each carries the Angkor Wat skyline.
import { AngkorWat } from './AngkorWat';
import { Logo } from './Logo';

export type PromoTone = 'green' | 'black' | 'white';

const TONES: Record<PromoTone, { bg: string; ink: string; sub: string; chip: string; chipInk: string; wat: string }> = {
  green: { bg: '#06c167', ink: '#ffffff', sub: 'rgba(255,255,255,0.85)', chip: '#ffffff', chipInk: '#048a49', wat: 'rgba(255,255,255,0.16)' },
  black: { bg: '#000000', ink: '#ffffff', sub: 'rgba(255,255,255,0.72)', chip: '#06c167', chipInk: '#ffffff', wat: 'rgba(255,255,255,0.10)' },
  white: { bg: '#ffffff', ink: '#000000', sub: 'rgba(0,0,0,0.55)', chip: '#000000', chipInk: '#ffffff', wat: 'rgba(0,0,0,0.06)' },
};

export type Promo = {
  tone: PromoTone;
  eyebrow: string;
  titleEn: string;
  titleKm: string;
  titleZh: string;
  cta: string;
  foot: string;
};

export function PromoPoster({ promo }: { promo: Promo }) {
  const t = TONES[promo.tone];
  return (
    <div
      className="relative flex aspect-[3/4] flex-col overflow-hidden rounded-3xl p-6 shadow-lg sm:p-8"
      style={{ background: t.bg, color: t.ink }}
    >
      {/* Landmark backdrop */}
      <AngkorWat className="pointer-events-none absolute inset-x-0 bottom-0 w-full" />
      <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ color: t.wat }}>
        <AngkorWat className="w-full" />
      </div>

      <div className="relative flex items-center justify-between">
        <Logo size={28} tone={promo.tone === 'white' ? 'black' : 'white'} />
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{ background: t.chip, color: t.chipInk }}
        >
          {promo.eyebrow}
        </span>
      </div>

      <div className="relative mt-6 flex-1 sm:mt-8">
        <h3 className="text-2xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl">{promo.titleEn}</h3>
        <p className="mt-3 text-base font-semibold sm:text-lg" style={{ color: t.sub }}>{promo.titleKm}</p>
        <p className="text-base font-semibold sm:text-lg" style={{ color: t.sub }}>{promo.titleZh}</p>
      </div>

      <div className="relative">
        <span
          className="inline-block rounded-xl px-6 py-3 text-base font-bold"
          style={{ background: t.chip, color: t.chipInk }}
        >
          {promo.cta}
        </span>
        <p className="mt-4 text-xs font-medium" style={{ color: t.sub }}>{promo.foot}</p>
      </div>
    </div>
  );
}

// The launch campaign set.
export const PROMOS: Promo[] = [
  {
    tone: 'green',
    eyebrow: 'LAUNCH OFFER',
    titleEn: 'Your first ride is on us.',
    titleKm: 'ដំណើរ​ដំបូង​របស់​អ្នក​ឥត​គិត​ថ្លៃ។',
    titleZh: '首次乘车免费。',
    cta: 'Download AngkorGo',
    foot: 'New customers · Phnom Penh · launching soon',
  },
  {
    tone: 'black',
    eyebrow: 'EARN',
    titleEn: 'Drive. Fix. Host. Keep 90%.',
    titleKm: 'បើកបរ · ជួសជុល · ម្ចាស់ផ្ទះ · ទទួល​៩០%',
    titleZh: '开车 · 维修 · 房东 · 保留90%',
    cta: 'Become a provider',
    foot: 'Same-day wallet payouts across all five services',
  },
  {
    tone: 'white',
    eyebrow: 'COMING SOON',
    titleEn: 'Khmer food, delivered hot.',
    titleKm: 'ម្ហូប​ខ្មែរ​ដឹក​ជូន​ដល់​ផ្ទះ។',
    titleZh: '柬埔寨美食，热腾腾送达。',
    cta: 'Order on AngkorGo',
    foot: 'Angkor Kitchen & more · food delivery in beta',
  },
];
