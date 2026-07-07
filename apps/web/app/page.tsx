// Public marketing landing page for www.angkorgo.app.
// Uber / Uber Eats look: white canvas, black ink, green accents, bold type.
// The admin console lives under /login + /dashboard (gated by middleware).
import Link from 'next/link';

// The five AngkorGo verticals (Cambodia super-app).
const SERVICES = [
  { icon: '🛺', title: 'Ride', desc: 'Taxi, moto & tuk-tuk — book a ride in seconds.', status: 'Coming soon' },
  { icon: '🔧', title: 'Mobile Auto Repair', desc: 'A mechanic comes to you — flat tire, battery, tow, fuel & more.', status: 'Available' },
  { icon: '🚗', title: 'Car & Van Rental', desc: 'Rent a vehicle by the day from local owners.', status: 'Coming soon' },
  { icon: '🏠', title: 'Stay', desc: 'Short-term places to stay across Cambodia.', status: 'Coming soon' },
  { icon: '🍜', title: 'Food Delivery', desc: 'Your favourite restaurants, delivered.', status: 'Coming soon' },
];

const STEPS = [
  { n: '1', title: 'Choose a service', body: 'Ride, repair, rental, stay or food — all in one app.' },
  { n: '2', title: 'We match you nearby', body: 'Your GPS connects you to the closest available provider instantly.' },
  { n: '3', title: 'Track in real time', body: 'Watch your provider approach live, with an ETA.' },
  { n: '4', title: 'Pay in the app', body: 'KHQR, ABA, Wing, ACLEDA, card or cash — your choice.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight">AngkorGo</span>
            <span className="rounded-full bg-black px-2 py-0.5 text-xs font-semibold text-white">Cambodia</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <a href="#services" className="text-black/60 hover:text-black">Services</a>
            <a href="#how" className="text-black/60 hover:text-black">How it works</a>
            <a href="#providers" className="text-black/60 hover:text-black">For providers</a>
            <Link href="/login" className="rounded-full bg-black px-4 py-2 font-semibold text-white hover:bg-black/85">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
        <p className="mb-5 inline-block rounded-full bg-brand/10 px-4 py-1.5 text-sm font-semibold text-[#048a49]">
          🇰🇭 Cambodia&apos;s everyday super-app
        </p>
        <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-tight md:text-7xl">
          Rides, repairs, rentals &amp; more — one app.
        </h1>
        {/* Trilingual tagline */}
        <p className="mt-6 max-w-xl text-lg text-black/60">
          Help is on the way. · ជំនួយ​កំពុង​តែ​មក​ដល់។ · 帮助即将到达。
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <span className="cursor-pointer rounded-lg bg-black px-7 py-4 text-base font-semibold text-white transition hover:bg-black/85">
             Download for iOS
          </span>
          <span className="cursor-pointer rounded-lg border border-black px-7 py-4 text-base font-semibold text-black transition hover:bg-black hover:text-white">
            ▸ Get it on Android
          </span>
        </div>
        <p className="mt-4 text-xs font-medium text-black/45">Apps launching soon · English · ភាសាខ្មែរ · 中文</p>
      </section>

      {/* Services */}
      <section id="services" className="border-t border-black/10 bg-[#f6f6f6] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-3 text-4xl font-extrabold tracking-tight">Everything you need, one AngkorGo</h2>
          <p className="mb-12 text-lg text-black/55">Five services, one account, one wallet.</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.title} className="group rounded-2xl border border-black/10 bg-white p-6 transition hover:border-black">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-4xl">{s.icon}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    s.status === 'Available' ? 'bg-brand text-white' : 'bg-black/5 text-black/50'
                  }`}>
                    {s.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">{s.title}</h3>
                <p className="mt-1.5 text-sm text-black/55">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-black/10 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-4xl font-extrabold tracking-tight">How AngkorGo works</h2>
          <div className="grid gap-8 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-black text-lg font-bold text-white">
                  {s.n}
                </div>
                <h3 className="text-lg font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm text-black/55">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For providers */}
      <section id="providers" className="border-t border-black/10">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-6 py-20 md:grid-cols-2">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight">Earn with AngkorGo</h2>
            <p className="mt-4 max-w-lg text-lg text-black/60">
              Drivers, mechanics, vehicle owners and hosts: join the network, accept jobs nearby,
              and get paid to your wallet. You keep 90%.
            </p>
            <div className="mt-8">
              <span className="cursor-pointer rounded-lg bg-brand px-7 py-4 text-base font-semibold text-white transition hover:brightness-95">
                Become a provider
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-black p-10 text-white">
            <p className="text-5xl font-extrabold tracking-tight">90%</p>
            <p className="mt-1 text-white/60">of every fare goes to you</p>
            <div className="mt-8 space-y-3 text-sm">
              <p className="flex items-center gap-2"><span className="text-brand">●</span> Instant nearby job offers</p>
              <p className="flex items-center gap-2"><span className="text-brand">●</span> Same-day wallet payouts</p>
              <p className="flex items-center gap-2"><span className="text-brand">●</span> Work across all five services</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 bg-black py-12 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-white/50 md:flex-row">
          <span className="font-semibold text-white">AngkorGo</span>
          <span>© 2026 AngkorGo. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/login" className="hover:text-white">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
