// Shared layout for the legal pages (privacy, terms).
import Link from 'next/link';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-extrabold">AngkorGo</Link>
        <nav className="flex gap-6 text-sm text-[#8FA3BF]">
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm text-[#5B6B84]">Last updated: {updated}</p>
        <div className="mt-8 space-y-6 text-[#C7D0DE] [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_a]:text-[#F04438] [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
          {children}
        </div>
        <p className="mt-12 text-sm text-[#5B6B84]">
          Questions? Contact <a className="text-[#F04438]" href="mailto:support@angkorgo.app">support@angkorgo.app</a>.
        </p>
      </main>
    </div>
  );
}
