// Public marketing landing page for www.angkorgo.app.
// The admin console lives under /login + /dashboard (gated by middleware).
import Link from 'next/link';
import { SERVICE_CATEGORIES, CATEGORY_LABELS } from '@angkorgo/shared';

const STEPS = [
  { n: '1', title: 'Tell us what happened', body: 'Flat tire, dead battery, out of fuel, lockout, tow — tap your problem.' },
  { n: '2', title: 'We find help nearby', body: 'Your GPS location goes to the closest available providers instantly.' },
  { n: '3', title: 'Track them to you', body: 'Watch your provider approach in real time with a live ETA.' },
  { n: '4', title: 'Pay in the app', body: 'KHQR, ABA, Wing, ACLEDA or card. No cash fumbling on the roadside.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold">AngkorGo</span>
          <span className="rounded-full bg-[#151E30] px-2 py-0.5 text-xs text-[#8FA3BF]">Rescue</span>
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#how" className="text-[#8FA3BF] hover:text-white">How it works</a>
          <a href="#providers" className="text-[#8FA3BF] hover:text-white">For providers</a>
          <Link href="/login" className="text-[#8FA3BF] hover:text-white">Admin</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center">
        <p className="mb-4 inline-block rounded-full border border-[#1F2A40] bg-[#151E30] px-4 py-1 text-sm text-[#8FA3BF]">
          🇰🇭 Cambodia&apos;s roadside rescue network
        </p>
        <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-tight md:text-6xl">
          Help is on the way.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-[#8FA3BF]">
          Broken down on the road? Get a nearby mechanic, tow truck, tire, battery
          or fuel provider to your exact location — track them live and pay in-app.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-xl bg-white px-6 py-3 font-semibold text-black">Download for iOS</span>
          <span className="rounded-xl bg-white px-6 py-3 font-semibold text-black">Get it on Android</span>
        </div>
        <p className="mt-4 text-xs text-[#5B6B84]">Apps launching soon.</p>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-[#1F2A40] bg-[#0B1220] py-20">
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

      {/* Services */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-3 text-center text-3xl font-bold">Every roadside emergency</h2>
          <p className="mb-12 text-center text-[#8FA3BF]">One app for cars, motorcycles, vans and trucks.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {SERVICE_CATEGORIES.map((c) => (
              <span key={c} className="rounded-full border border-[#1F2A40] bg-[#151E30] px-4 py-2 text-sm">
                {CATEGORY_LABELS.en[c]}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* For providers */}
      <section id="providers" className="border-t border-[#1F2A40] py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold">Earn as a provider</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#8FA3BF]">
            Mechanics, tow operators and roadside pros: go online, accept nearby jobs,
            navigate to customers, and get paid directly to your wallet. You keep 90%.
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
