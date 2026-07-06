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
    <main className="min-h-screen grid place-items-center bg-[#0B1220] text-white p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-extrabold text-center">AngkorGo</h1>
        <p className="text-center text-[#8FA3BF] mt-1 mb-8">Admin Console</p>

        {notAdmin && (
          <p className="mb-4 rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-300">
            That account is not an administrator.
          </p>
        )}

        {!sent ? (
          <form onSubmit={sendOtp} className="space-y-3">
            <input
              type="email" required placeholder="admin@angkorgo.ai" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-[#151E30] border border-[#1F2A40] p-4 outline-none"
            />
            <button className="w-full rounded-xl bg-[#F04438] p-4 font-bold">Send code</button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <input
              inputMode="numeric" maxLength={10} placeholder="Enter code" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              autoFocus
              className="w-full rounded-xl bg-[#151E30] border border-[#1F2A40] p-4 text-center text-2xl tracking-[0.3em] outline-none"
            />
            <button className="w-full rounded-xl bg-[#F04438] p-4 font-bold">Verify</button>
          </form>
        )}

        <div className="my-5 text-center text-[#5B6B84]">or</div>
        <button onClick={google} className="w-full rounded-xl bg-[#151E30] border border-[#1F2A40] p-4 font-semibold">
          Continue with Google
        </button>

        {msg && <p className="mt-4 text-sm text-red-400 text-center">{msg}</p>}

        {signedInAs && (
          <p className="mt-6 text-center text-sm text-[#5B6B84]">
            Signed in as {signedInAs} ·{' '}
            <button onClick={signOut} className="text-[#F04438] hover:underline">Sign out</button>
          </p>
        )}
      </div>
    </main>
  );
}
