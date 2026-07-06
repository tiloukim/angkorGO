// Public marketing landing page for www.angkorgo.app.
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
    <div className="min-h-screen bg-[#0B1220] text-white">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold">AngkorGo</span>
          <span className="rounded-full bg-[#151E30] px-2 py-0.5 text-xs text-[#8FA3BF]">Cambodia</span>
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#services" className="text-[#8FA3BF] hover:text-white">Services</a>
          <a href="#how" className="text-[#8FA3BF] hover:text-white">How it works</a>
          <a href="#providers" className="text-[#8FA3BF] hover:text-white">For providers</a>
          <Link href="/login" className="text-[#8FA3BF] hover:text-white">Admin</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 text-center">
        <p className="mb-4 inline-block rounded-full border border-[#1F2A40] bg-[#151E30] px-4 py-1 text-sm text-[#8FA3BF]">
          🇰🇭 Cambodia&apos;s everyday super-app
        </p>
        <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-tight md:text-6xl">
          Rides, repairs, rentals &amp; more — one app.
        </h1>
        {/* Trilingual tagline */}
        <p className="mx-auto mt-6 max-w-xl text-lg text-[#8FA3BF]">
          Help is on the way. · ជំនួយ​កំពុង​តែ​មក​ដល់។ · 帮助即将到达。
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-xl bg-white px-6 py-3 font-semibold text-black">Download for iOS</span>
          <span className="rounded-xl bg-white px-6 py-3 font-semibold text-black">Get it on Android</span>
        </div>
        <p className="mt-4 text-xs text-[#5B6B84]">Apps launching soon · English · ភាសាខ្មែរ · 中文</p>
      </section>

      {/* Services */}
      <section id="services" className="border-t border-[#1F2A40] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-3 text-center text-3xl font-bold">Everything you need, one AngkorGo</h2>
          <p className="mb-12 text-center text-[#8FA3BF]">Five services, one account, one wallet.</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.title} className="rounded-2xl border border-[#1F2A40] bg-[#151E30] p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-3xl">{s.icon}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    s.status === 'Available' ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#1F2A40] text-[#8FA3BF]'
                  }`}>
                    {s.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-[#8FA3BF]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-[#1F2A40] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold">How AngkorGo works</h2>
          <div className="grid gap-6 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-[#1F2A40] bg-[#151E30] p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#F04438] font-bold">
                  {s.n}
                </div>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-[#8FA3BF]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For providers */}
      <section id="providers" className="border-t border-[#1F2A40] py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold">Earn with AngkorGo</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#8FA3BF]">
            Drivers, mechanics, vehicle owners and hosts: join the network, accept jobs nearby,
            and get paid to your wallet. You keep 90%.
          </p>
          <div className="mt-8">
            <span className="rounded-xl bg-[#F04438] px-6 py-3 font-semibold">Become a provider</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1F2A40] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-[#5B6B84] md:flex-row">
          <span>© 2026 AngkorGo. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <Link href="/login" className="hover:text-white">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
