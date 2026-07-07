'use client';
// Admin login — email OTP + Google. Role is enforced by middleware; a
// non-admin who authenticates is redirected back here with ?error=not_admin.
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

// useSearchParams() requires a Suspense boundary for static export.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState('');
  const [signedInAs, setSignedInAs] = useState<string | null>(null);

  const notAdmin = params.get('error') === 'not_admin';

  // Surface a stale (e.g. non-admin) session so the user can switch accounts.
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setSignedInAs(data.user?.email ?? null));
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = '/login';
  }

  // Create the client inside handlers (client-side only) so the page never
  // instantiates Supabase during the build-time prerender.
  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }, // admins are provisioned, not self-signup
    });
    if (error) {
      // Surface full detail (status/code) — a 500 with empty body renders as "{}".
      console.error('signInWithOtp error', error);
      setMsg(`${error.status ?? ''} ${error.code ?? error.name ?? ''}: ${error.message || '(no message)'}`.trim());
    } else setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await createClient().auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) setMsg(error.message);
    else window.location.href = '/dashboard';
  }

  async function google() {
    await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="min-h-screen grid place-items-center bg-white text-black p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-extrabold text-center tracking-tight">AngkorGo</h1>
        <p className="text-center text-black/50 mt-1 mb-8 font-medium">Admin Console</p>

        {notAdmin && (
          <p className="mb-4 rounded-xl bg-danger/8 border border-danger/25 p-3 text-sm font-medium text-danger">
            That account is not an administrator.
          </p>
        )}

        {!sent ? (
          <form onSubmit={sendOtp} className="space-y-3">
            <input
              type="email" required placeholder="admin@angkorgo.ai" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-[#f6f6f6] border border-black/10 p-4 outline-none focus:border-black"
            />
            <button className="w-full rounded-xl bg-black p-4 font-bold text-white hover:bg-black/85">Send code</button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <input
              inputMode="numeric" maxLength={10} placeholder="Enter code" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              autoFocus
              className="w-full rounded-xl bg-[#f6f6f6] border border-black/10 p-4 text-center text-2xl tracking-[0.3em] outline-none focus:border-black"
            />
            <button className="w-full rounded-xl bg-black p-4 font-bold text-white hover:bg-black/85">Verify</button>
          </form>
        )}

        <div className="my-5 flex items-center gap-3 text-xs font-medium text-black/40">
          <span className="h-px flex-1 bg-black/10" />or<span className="h-px flex-1 bg-black/10" />
        </div>
        <button onClick={google} className="w-full rounded-xl bg-white border border-black/15 p-4 font-semibold hover:bg-[#f6f6f6]">
          Continue with Google
        </button>

        {msg && <p className="mt-4 text-sm text-danger text-center">{msg}</p>}

        {signedInAs && (
          <p className="mt-6 text-center text-sm text-black/50">
            Signed in as {signedInAs} ·{' '}
            <button onClick={signOut} className="font-semibold text-danger hover:underline">Sign out</button>
          </p>
        )}
      </div>
    </main>
  );
}
