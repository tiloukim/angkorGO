// Shareable promotion posters — screenshot-ready for social / print.
import Link from 'next/link';
import { Logo } from '../components/Logo';
import { PromoPoster, PROMOS } from '../components/PromoPoster';

export const metadata = { title: 'Promotions — AngkorGo' };

export default function Promos() {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/"><Logo size={30} /></Link>
        <nav className="flex gap-6 text-sm font-medium text-black/60">
          <Link href="/#services" className="hover:text-black">Services</Link>
          <Link href="/#providers" className="hover:text-black">For providers</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Promotions</h1>
        <p className="mt-3 max-w-xl text-lg text-black/55">
          Launch campaign for Cambodia — trilingual posters ready to share. English · ភាសាខ្មែរ · 中文
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PROMOS.map((p) => (
            <PromoPoster key={p.eyebrow} promo={p} />
          ))}
        </div>

        <p className="mt-8 text-sm text-black/45">
          Tip: screenshot any poster for Instagram / Facebook / Telegram, or hand off to print.
        </p>
      </main>

      <footer className="border-t border-black/10 py-8">
        <div className="mx-auto max-w-6xl px-6 text-sm text-black/45">© 2026 AngkorGo</div>
      </footer>
    </div>
  );
}
