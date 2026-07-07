// Public marketing landing for www.angkorgo.app.
// Grab-inspired super-app concept: green header, colorful service grid,
// gold promo banners, an app-home phone mockup, and a local landmark motif.
import Link from 'next/link';
import { Logo } from './components/Logo';
import { AngkorWat } from './components/AngkorWat';
import { Mascot } from './components/Mascot';
import { PromoPoster, PROMOS } from './components/PromoPoster';

// Quick actions (WOWNOW-style) under the search bar.
const QUICK_ACTIONS = [
  { icon: '💰', label: 'Top up' },
  { icon: '🎟️', label: 'Coupons' },
  { icon: '👥', label: 'Invite' },
  { icon: '🎁', label: 'Rewards' },
];

// Super-app services (colorful pastel tiles, like Grab's icon grid).
const SERVICES = [
  { icon: '🛺', label: 'Ride', tile: '#E4F7EC', desc: 'Moto, tuk-tuk & car' },
  { icon: '🍜', label: 'Food', tile: '#FFEEE0', desc: 'Delivered hot' },
  { icon: '🚗', label: 'Rent', tile: '#E6F0FF', desc: 'Cars & vans' },
  { icon: '🏠', label: 'Stay', tile: '#EFEAFE', desc: 'Places to stay' },
  { icon: '🔧', label: 'Repair', tile: '#FFF6D8', desc: 'Mechanic to you' },
  { icon: '🎁', label: 'Rewards', tile: '#FDE7F1', desc: 'Earn points' },
  { icon: '👛', label: 'Wallet', tile: '#E2F6F1', desc: 'One balance' },
  { icon: '➕', label: 'More', tile: '#E8F7FF', desc: 'Coming soon' },
];

const STEPS = [
  { n: '1', title: 'Choose a service', body: 'Ride, food, rental, stay or repair — all in one app.' },
  { n: '2', title: 'We match you nearby', body: 'Your GPS connects you to the closest provider instantly.' },
  { n: '3', title: 'Track in real time', body: 'Watch your provider approach live, with an ETA.' },
  { n: '4', title: 'Pay your way', body: 'KHQR, ABA, Wing, ACLEDA, card or cash — one wallet.' },
];

// A small app-home mockup that shows the mobile concept in the browser.
function PhoneMockup() {
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="overflow-hidden rounded-[40px] border-[6px] border-black/80 bg-[#F5F6F7] shadow-2xl">
        {/* Green header */}
        <div className="rounded-b-3xl bg-grab-dark px-5 pb-6 pt-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-extrabold">Hi there 👋</p>
              <p className="text-xs text-[#CFEAD9]">📍 Phnom Penh ▾</p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gold text-sm font-extrabold text-black">A</span>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm text-black/45">
            🔍 What do you need today?
          </div>
        </div>
        {/* Service grid */}
        <div className="grid grid-cols-4 gap-2 px-4 pt-4">
          {SERVICES.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 py-1">
              <span className="grid h-12 w-12 place-items-center rounded-2xl text-xl" style={{ background: s.tile }}>
                {s.icon}
              </span>
              <span className="text-[10px] font-semibold text-black/70">{s.label}</span>
            </div>
          ))}
        </div>
        {/* Gold promo */}
        <div className="m-4 rounded-2xl bg-gold-soft p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-[#5B4200]">First ride free</p>
              <p className="text-[11px] text-[#8A6D1F]">Welcome to AngkorGo</p>
            </div>
            <span className="text-3xl">🛕</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Green header */}
      <header className="sticky top-0 z-20 bg-grab-dark">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo size={30} tone="white" />
          <div className="flex items-center gap-4 sm:gap-7">
            <nav className="hidden items-center gap-7 text-sm font-medium text-white/85 md:flex">
              <a href="#services" className="hover:text-white">Services</a>
              <a href="#how" className="hover:text-white">How it works</a>
              <a href="#promos" className="hover:text-white">Promotions</a>
              <a href="#providers" className="hover:text-white">For providers</a>
            </nav>
            <Link href="/login" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-grab-dark hover:bg-white/90">
              Admin
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
              <Mascot size={22} /> Meet Tuki · Cambodia&apos;s super-app
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              One app.<br />Every way to go.
            </h1>
            <p className="mt-5 max-w-md text-lg text-white/70">
              Rides, food, rentals, stays &amp; roadside repair — matched nearby and paid with one wallet.
            </p>
            <p className="mt-4 text-sm text-white/50">Help is on the way · ជំនួយ​កំពុង​តែ​មក​ដល់ · 帮助即将到达</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="cursor-pointer rounded-xl bg-white px-6 py-3.5 text-base font-bold text-grab-dark transition hover:bg-white/90">
                 Download for iOS
              </span>
              <span className="cursor-pointer rounded-xl bg-grab px-6 py-3.5 text-base font-bold text-white transition hover:brightness-110">
                ▸ Get it on Android
              </span>
            </div>
          </div>
          <PhoneMockup />
        </div>
      </section>

      {/* Services grid — overlaps the green hero, Grab-style */}
      <section id="services" className="bg-white pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="-mt-10 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/5 md:p-8">
            <div className="mb-5 flex items-center gap-2 rounded-full bg-[#F5F6F7] px-5 py-3.5 text-black/45">
              🔍 <span className="text-sm">What do you need today?</span>
            </div>
            {/* Quick actions */}
            <div className="mb-6 grid grid-cols-4 gap-3">
              {QUICK_ACTIONS.map((q) => (
                <button key={q.label} className="flex items-center justify-center gap-2 rounded-xl bg-grab-soft px-3 py-2.5 text-sm font-semibold text-grab-dark hover:brightness-95">
                  <span>{q.icon}</span>
                  <span className="hidden sm:inline">{q.label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3 sm:gap-5 md:grid-cols-8">
              {SERVICES.map((s) => (
                <button key={s.label} className="group flex flex-col items-center gap-2">
                  <span
                    className="grid h-16 w-16 place-items-center rounded-2xl text-3xl transition group-hover:scale-105"
                    style={{ background: s.tile }}
                  >
                    {s.icon}
                  </span>
                  <span className="text-xs font-semibold text-black/70">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Feature tiles */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.slice(0, 6).map((s) => (
              <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-black/5 bg-[#F5F6F7] p-5">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: s.tile }}>
                  {s.icon}
                </span>
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight">{s.label}</h3>
                  <p className="text-sm text-black/55">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — green band */}
      <section id="how" className="bg-grab-soft py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-4xl font-extrabold tracking-tight">How AngkorGo works</h2>
          <div className="grid gap-8 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-grab text-lg font-black text-white">
                  {s.n}
                </div>
                <h3 className="text-lg font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm text-black/60">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WOWNOW-style bold launch-deal banner */}
      <section className="bg-white pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-3xl p-8 md:p-10" style={{ backgroundImage: 'linear-gradient(90deg,#FF6D00,#FFC400)' }}>
            {/* rotated NEW ribbon */}
            <span className="absolute right-[-38px] top-6 rotate-45 bg-grab px-12 py-1 text-xs font-black tracking-wider text-white shadow">
              NEW
            </span>
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="text-white">
                <p className="text-sm font-bold uppercase tracking-wider text-white/90">Launch week</p>
                <p className="mt-1 text-5xl font-black leading-none drop-shadow-sm md:text-7xl">
                  Up to 66% OFF
                </p>
                <p className="mt-3 max-w-md text-white/90">
                  Rides, food &amp; deliveries across Phnom Penh — plus a free first ride with Tuki.
                </p>
                <span className="mt-6 inline-block cursor-pointer rounded-xl bg-white px-6 py-3 text-base font-bold text-[#FF6D00] hover:bg-white/90">
                  Grab the deals
                </span>
              </div>
              <div className="shrink-0 rounded-full bg-white/15 p-3">
                <Mascot size={128} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promotions */}
      <section id="promos" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight">Launch promotions</h2>
              <p className="mt-2 text-lg text-black/55">Trilingual posters — share on social or print for the street.</p>
            </div>
            <Link href="/promos" className="rounded-full bg-grab px-6 py-3 text-sm font-bold text-white hover:brightness-110">
              See all posters
            </Link>
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
            <h2 className="text-4xl font-extrabold tracking-tight">Earn with AngkorGo</h2>
            <p className="mt-4 max-w-lg text-lg text-black/60">
              Drivers, mechanics, vehicle owners and hosts: join the network, accept jobs nearby,
              and get paid to your wallet. You keep 90%.
            </p>
            <div className="mt-8">
              <span className="cursor-pointer rounded-xl bg-grab px-7 py-4 text-base font-bold text-white transition hover:brightness-110">
                Become a provider
              </span>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-grab-dark p-10 text-white">
            <AngkorWat className="pointer-events-none absolute -bottom-6 right-0 w-72 text-white/[0.07]" />
            <p className="relative text-6xl font-black tracking-tight">90%</p>
            <p className="relative mt-1 text-white/60">of every fare goes to you</p>
            <div className="relative mt-8 space-y-3 text-sm">
              <p className="flex items-center gap-2"><span className="text-gold">●</span> Instant nearby job offers</p>
              <p className="flex items-center gap-2"><span className="text-gold">●</span> Same-day wallet payouts</p>
              <p className="flex items-center gap-2"><span className="text-gold">●</span> Work across all five services</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-grab-dark py-12 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 text-sm text-white/50 md:flex-row">
          <Logo size={28} tone="white" />
          <span className="text-center">© 2026 AngkorGo. All rights reserved.</span>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/promos" className="hover:text-white">Promotions</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/login" className="hover:text-white">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
