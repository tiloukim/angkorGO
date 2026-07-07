'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Logo } from '../Logo';
import { AuthModal } from './AuthModal';

export function ShopHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const [auth, setAuth] = useState(false);

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
          <Link href="/food" className="hover:text-white">Food</Link>
          <Link href="/rentals" className="hover:text-white">Rentals</Link>
          <Link href="/stays" className="hover:text-white">Stays</Link>
        </nav>
        {email ? (
          <div className="flex items-center gap-3 text-sm text-white/85">
            <span className="hidden sm:inline">{email}</span>
            <button onClick={signOut} className="rounded-full bg-white/15 px-3 py-1.5 font-semibold hover:bg-white/25">Sign out</button>
          </div>
        ) : (
          <button onClick={() => setAuth(true)} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-grab-dark hover:bg-white/90">Sign in</button>
        )}
      </div>
      {auth && <AuthModal onClose={() => setAuth(false)} onSignedIn={() => setAuth(false)} />}
    </header>
  );
}
