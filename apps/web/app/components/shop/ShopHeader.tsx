'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Language } from '@angkorgo/shared';
import { createClient } from '@/lib/supabase-browser';
import { useShopLocale, SHOP_LANGS } from '@/lib/shop-i18n';
import { Logo } from '../Logo';
import { AuthModal } from './AuthModal';

const L: Record<Language, Record<string, string>> = {
  en: { food: 'Food', rentals: 'Rentals', stays: 'Stays', signIn: 'Sign in', signOut: 'Sign out' },
  km: { food: 'អាហារ', rentals: 'ជួល', stays: 'ស្នាក់នៅ', signIn: 'ចូល', signOut: 'ចាកចេញ' },
  zh: { food: '美食', rentals: '租赁', stays: '住宿', signIn: '登录', signOut: '退出' },
};

export function ShopHeader() {
  const { lang, setLang } = useShopLocale();
  const t = L[lang] ?? L.en;
  const [email, setEmail] = useState<string | null>(null);
  const [auth, setAuth] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const cur = SHOP_LANGS.find((l) => l.code === lang)!;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setEmail(session?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    setEmail(null);
  }

  return (
    <header className="sticky top-0 z-30 bg-grab-dark">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/"><Logo size={28} tone="white" /></Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-white/85 md:flex">
          <Link href="/food" className="hover:text-white">{t.food}</Link>
          <Link href="/rentals" className="hover:text-white">{t.rentals}</Link>
          <Link href="/stays" className="hover:text-white">{t.stays}</Link>
        </nav>
        <div className="flex items-center gap-3">
          {/* Language picker */}
          <div className="relative">
            <button onClick={() => setLangOpen((o) => !o)} className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/25">
              <span>{cur.flag}</span><span>{lang.toUpperCase()}</span><span className="text-xs">▾</span>
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5">
                  {SHOP_LANGS.map((l) => (
                    <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-[#f6f6f6] ${l.code === lang ? 'font-bold text-grab-dark' : 'text-black/70'}`}>
                      <span>{l.flag}</span> {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {email ? (
            <button onClick={signOut} className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white/85 hover:bg-white/25">{t.signOut}</button>
          ) : (
            <button onClick={() => setAuth(true)} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-grab-dark hover:bg-white/90">{t.signIn}</button>
          )}
        </div>
      </div>
      {auth && <AuthModal onClose={() => setAuth(false)} onSignedIn={() => setAuth(false)} />}
    </header>
  );
}
