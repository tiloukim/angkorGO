'use client';
// Customer sign-in for the web shop — email one-time code (self-signup allowed).
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export function AuthModal({ onClose, onSignedIn }: { onClose: () => void; onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const { error } = await createClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setMsg(error.message);
    else setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const { error } = await createClient().auth.verifyOtp({ email, token: code, type: 'email' });
    setBusy(false);
    if (error) setMsg(error.message);
    else onSignedIn();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-8" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-extrabold tracking-tight">Sign in to continue</h3>
        <p className="mt-1 text-sm text-black/55">We&apos;ll email you a one-time code.</p>
        {!sent ? (
          <form onSubmit={sendOtp} className="mt-5 space-y-3">
            <input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-[#f6f6f6] p-4 outline-none focus:border-grab" />
            <button disabled={busy} className="w-full rounded-xl bg-grab p-4 font-bold text-white hover:brightness-110 disabled:opacity-60">
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-5 space-y-3">
            <input inputMode="numeric" maxLength={10} placeholder="Enter code" value={code} autoFocus
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              className="w-full rounded-xl border border-black/10 bg-[#f6f6f6] p-4 text-center text-2xl tracking-[0.3em] outline-none focus:border-grab" />
            <button disabled={busy} className="w-full rounded-xl bg-grab p-4 font-bold text-white hover:brightness-110 disabled:opacity-60">
              {busy ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}
        {msg && <p className="mt-3 text-sm text-danger">{msg}</p>}
        <button onClick={onClose} className="mt-4 w-full text-sm font-semibold text-black/50 hover:text-black">Cancel</button>
      </div>
    </div>
  );
}
