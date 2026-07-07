'use client';
// Public marketing landing for www.angkorgo.app.
// Grab-inspired super-app concept with a trilingual (EN/KH/ZH) language picker.
import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Language } from '@angkorgo/shared';
import { COPY, LANGS, type LandingCopy } from '@/lib/landing-i18n';
import { Logo } from './components/Logo';
import { AngkorWat } from './components/AngkorWat';
import { Mascot } from './components/Mascot';
import { TukiTukTuk } from './components/TukiTukTuk';
import { PromoPoster, PROMOS } from './components/PromoPoster';

// Structural data (icons/tiles/keys); display text comes from COPY[lang].
const QUICK = [
  { icon: '💰', key: 'topUp' },
  { icon: '🎟️', key: 'coupons' },
  { icon: '👥', key: 'invite' },
  { icon: '🎁', key: 'rewards' },
] as const;

// Items with `href` open the real web page; the rest show an app-only info modal.
type GItem = { icon: string; key: string; href?: string };
const GROUPS: { titleKey: string; hero: string; tile: string; items: GItem[] }[] = [
  {
    titleKey: 'getAround', hero: '🛺', tile: '#E4F7EC',
    items: [
      { icon: '🛺', key: 'ride' }, { icon: '🚗', key: 'rent', href: '/rentals' }, { icon: '✈️', key: 'airport' },
      { icon: '🔧', key: 'repair' }, { icon: '🗓️', key: 'schedule' }, { icon: '🎡', key: 'spin' },
    ],
  },
  {
    titleKey: 'orderShop', hero: '🍜', tile: '#FFEEE0',
    items: [
      { icon: '🍜', key: 'food', href: '/food' }, { icon: '🏠', key: 'stay', href: '/stays' }, { icon: '🛒', key: 'mart' },
      { icon: '🥬', key: 'grocery' }, { icon: '🎟️', key: 'coupons' }, { icon: '🎁', key: 'rewards' },
    ],
  },
];

const SERVICES = [
  { icon: '🛺', key: 'ride', tile: '#E4F7EC' },
  { icon: '🍜', key: 'food', tile: '#FFEEE0' },
  { icon: '🚗', key: 'rent', tile: '#E6F0FF' },
  { icon: '🏠', key: 'stay', tile: '#EFEAFE' },
  { icon: '🔧', key: 'repair', tile: '#FFF6D8' },
  { icon: '🎁', key: 'rewards', tile: '#FDE7F1' },
  { icon: '👛', key: 'wallet', tile: '#E2F6F1' },
  { icon: '➕', key: 'more', tile: '#E8F7FF' },
] as const;

// Language-flag picker in the header (persists to localStorage).
function LangPicker({ lang, choose }: { lang: Language; choose: (l: Language) => void }) {
  const [open, setOpen] = useState(false);
  const cur = LANGS.find((l) => l.code === lang)!;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/25"
      >
        <span>{cur.flag}</span><span>{lang.toUpperCase()}</span><span className="text-xs">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => { choose(l.code); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-[#F5F6F7] ${l.code === lang ? 'font-bold text-grab-dark' : 'text-black/70'}`}
              >
                <span>{l.flag}</span> {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// A small app-home mockup that shows the mobile concept in the browser.
function PhoneMockup({ t }: { t: LandingCopy }) {
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="overflow-hidden rounded-[40px] border-[6px] border-black/80 bg-[#F5F6F7] shadow-2xl">
        <div className="rounded-b-3xl bg-grab-dark px-5 pb-6 pt-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-extrabold">{t.mockup.hi}</p>
              <p className="text-xs text-[#CFEAD9]">📍 Phnom Penh ▾</p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gold text-sm font-extrabold text-black">A</span>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm text-black/45">
            🔍 {t.mockup.search}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 px-4 pt-4">
          {SERVICES.map((s) => (
            <div key={s.key} className="flex flex-col items-center gap-1 py-1">
              <span className="grid h-12 w-12 place-items-center rounded-2xl text-xl" style={{ background: s.tile }}>{s.icon}</span>
              <span className="text-[10px] font-semibold text-black/70">{t.w[s.key]}</span>
            </div>
          ))}
        </div>
        <div className="m-4 rounded-2xl bg-gold-soft p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-[#5B4200]">{t.mockup.firstRide}</p>
              <p className="text-[11px] text-[#8A6D1F]">{t.mockup.welcome}</p>
            </div>
            <span className="text-3xl">🛕</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [lang, setLang] = useState<Language>('en');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ icon: string; label: string; key: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('angkorgo.lang');
    if (saved === 'en' || saved === 'km' || saved === 'zh') setLang(saved);
  }, []);

  const choose = (l: Language) => {
    setLang(l);
    try { localStorage.setItem('angkorgo.lang', l); } catch {}
  };

  const t = COPY[lang];

  // Live search — match on the key + the English and current-language labels,
  // so typing "food" works in any language.
  const q = query.trim().toLowerCase();
  const matches = (key: string) =>
    !q ||
    key.toLowerCase().includes(q) ||
    (COPY.en.w[key]?.toLowerCase().includes(q) ?? false) ||
    (t.w[key]?.toLowerCase().includes(q) ?? false);
  const filteredGroups = GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => matches(it.key)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div lang={lang} className="min-h-screen bg-white text-black">
      {/* Green header */}
      <header className="sticky top-0 z-30 bg-grab-dark">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo size={30} tone="white" />
          <div className="flex items-center gap-3 sm:gap-6">
            <nav className="hidden items-center gap-7 text-sm font-medium text-white/85 md:flex">
              <a href="#services" className="hover:text-white">{t.nav.services}</a>
              <a href="#how" className="hover:text-white">{t.nav.how}</a>
              <a href="#promos" className="hover:text-white">{t.nav.promos}</a>
              <a href="#providers" className="hover:text-white">{t.nav.providers}</a>
            </nav>
            <LangPicker lang={lang} choose={choose} />
            <Link href="/login" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-grab-dark hover:bg-white/90">
              {t.nav.admin}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-grab-dark text-white">
        <AngkorWat className="pointer-events-none absolute -bottom-4 left-0 w-[600px] max-w-none text-white/[0.06]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-10 md:grid-cols-2 md:pt-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-[#CFEAD9]">
              <Mascot size={22} /> {t.hero.badge}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              {t.hero.title1}<br />{t.hero.title2}
            </h1>
            <p className="mt-5 max-w-md text-lg text-white/70">{t.hero.sub}</p>
            <p className="mt-4 text-sm text-white/50">{t.hero.tagline}</p>
            <div id="download" className="mt-8 flex flex-wrap gap-3 scroll-mt-24">
              <span className="cursor-pointer rounded-xl bg-white px-6 py-3.5 text-base font-bold text-grab-dark transition hover:bg-white/90"> {t.hero.ios}</span>
              <span className="cursor-pointer rounded-xl bg-grab px-6 py-3.5 text-base font-bold text-white transition hover:brightness-110">▸ {t.hero.android}</span>
            </div>
          </div>
          <PhoneMockup t={t} />
        </div>
      </section>

      {/* Services grid — overlaps the green hero */}
      <section id="services" className="bg-white pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="-mt-10 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5 md:p-8">
            <div className="mb-5 flex items-center gap-2 rounded-full bg-[#F5F6F7] px-5 py-3.5">
              <span>🔍</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.mockup.search}
                aria-label={t.mockup.search}
                className="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/45"
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Clear" className="text-black/40 hover:text-black">✕</button>
              )}
            </div>
            {/* Quick actions */}
            <div className="mb-6 grid grid-cols-4 gap-3">
              {QUICK.map((qa) => (
                <button
                  key={qa.key}
                  onClick={() => setSelected({ icon: qa.icon, label: t.quick[qa.key as keyof LandingCopy['quick']], key: qa.key })}
                  className="flex items-center justify-center gap-2 rounded-xl bg-grab-soft px-3 py-2.5 text-sm font-semibold text-grab-dark hover:brightness-95"
                >
                  <span>{qa.icon}</span>
                  <span className="hidden sm:inline">{t.quick[qa.key as keyof LandingCopy['quick']]}</span>
                </button>
              ))}
            </div>
            {/* Grouped category cards (filtered by search) */}
            {filteredGroups.length === 0 ? (
              <div className="rounded-2xl border border-black/5 bg-[#F5F6F7] p-10 text-center text-black/50">{t.noResults}</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredGroups.map((g) => (
                  <div key={g.titleKey} className="rounded-2xl border border-black/5 bg-[#F5F6F7] p-5">
                    <h3 className="mb-4 text-lg font-extrabold tracking-tight">{t.groups[g.titleKey as keyof LandingCopy['groups']]}</h3>
                    <div className="flex gap-4">
                      <div className="grid w-20 shrink-0 place-items-center rounded-2xl text-4xl" style={{ background: g.tile }}>{g.hero}</div>
                      <div className="grid flex-1 grid-cols-3 gap-y-4">
                        {g.items.map((it) =>
                          it.href ? (
                            <Link key={it.key} href={it.href} className="group flex flex-col items-center gap-1.5">
                              <span className="text-2xl transition group-hover:scale-110">{it.icon}</span>
                              <span className="text-xs font-semibold text-grab-dark">{t.w[it.key]}</span>
                            </Link>
                          ) : (
                            <button
                              key={it.key}
                              onClick={() => setSelected({ icon: it.icon, label: t.w[it.key], key: it.key })}
                              className="group flex flex-col items-center gap-1.5"
                            >
                              <span className="text-2xl transition group-hover:scale-110">{it.icon}</span>
                              <span className="text-xs font-semibold text-black/70">{t.w[it.key]}</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works — green band */}
      <section id="how" className="bg-grab-soft py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-4xl font-extrabold tracking-tight">{t.how.title}</h2>
          <div className="grid gap-8 md:grid-cols-4">
            {t.how.steps.map((s, i) => (
              <div key={i}>
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-grab text-lg font-black text-white">{i + 1}</div>
                <h3 className="text-lg font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm text-black/60">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bold launch-deal banner */}
      <section className="bg-white pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-3xl p-8 md:p-10" style={{ backgroundImage: 'linear-gradient(90deg,#FF6D00,#FFC400)' }}>
            <span className="absolute right-[-38px] top-6 rotate-45 bg-grab px-12 py-1 text-xs font-black tracking-wider text-white shadow">{t.deal.badge}</span>
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="text-white">
                <p className="text-sm font-bold uppercase tracking-wider text-white/90">{t.deal.week}</p>
                <p className="mt-1 text-5xl font-black leading-none drop-shadow-sm md:text-7xl">{t.deal.title}</p>
                <p className="mt-3 max-w-md text-white/90">{t.deal.sub}</p>
                <span className="mt-6 inline-block cursor-pointer rounded-xl bg-white px-6 py-3 text-base font-bold text-[#FF6D00] hover:bg-white/90">{t.deal.cta}</span>
              </div>
              <div className="shrink-0 drop-shadow-lg"><TukiTukTuk size={240} /></div>
            </div>
          </div>
        </div>
      </section>

      {/* Promotions */}
      <section id="promos" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight">{t.promos.title}</h2>
              <p className="mt-2 text-lg text-black/55">{t.promos.sub}</p>
            </div>
            <Link href="/promos" className="rounded-full bg-grab px-6 py-3 text-sm font-bold text-white hover:brightness-110">{t.promos.cta}</Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROMOS.map((p) => (
              <PromoPoster key={p.eyebrow} promo={p} />
            ))}
          </div>
        </div>
      </section>

      {/* For providers */}
      <section id="providers" className="bg-[#F5F6F7]">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-6 py-20 md:grid-cols-2">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight">{t.prov.title}</h2>
            <p className="mt-4 max-w-lg text-lg text-black/60">{t.prov.sub}</p>
            <div className="mt-8">
              <span className="cursor-pointer rounded-xl bg-grab px-7 py-4 text-base font-bold text-white transition hover:brightness-110">{t.prov.cta}</span>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-grab-dark p-10 text-white">
            <AngkorWat className="pointer-events-none absolute -bottom-6 right-0 w-72 text-white/[0.07]" />
            <p className="relative text-6xl font-black tracking-tight">{t.prov.pct}</p>
            <p className="relative mt-1 text-white/60">{t.prov.pctSub}</p>
            <div className="relative mt-8 space-y-3 text-sm">
              <p className="flex items-center gap-2"><span className="text-gold">●</span> {t.prov.b1}</p>
              <p className="flex items-center gap-2"><span className="text-gold">●</span> {t.prov.b2}</p>
              <p className="flex items-center gap-2"><span className="text-gold">●</span> {t.prov.b3}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-grab-dark py-12 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 text-sm text-white/50 md:flex-row">
          <Logo size={28} tone="white" />
          <span className="text-center">{t.footer.rights}</span>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/promos" className="hover:text-white">{t.footer.promotions}</Link>
            <Link href="/privacy" className="hover:text-white">{t.footer.privacy}</Link>
            <Link href="/terms" className="hover:text-white">{t.footer.terms}</Link>
            <Link href="/login" className="hover:text-white">{t.footer.admin}</Link>
          </div>
        </div>
      </footer>

      {/* Service tap → info modal */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-6" onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl bg-grab-soft text-4xl">{selected.icon}</div>
            <h3 className="text-2xl font-extrabold tracking-tight">{selected.label}</h3>
            <p className="mt-2 text-black/60">{t.desc[selected.key] ?? ''}</p>
            <button
              onClick={() => setSelected(null)}
              className="mt-6 w-full rounded-xl bg-grab px-6 py-3.5 text-base font-bold text-white hover:brightness-110"
            >
              {t.service.cta}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
