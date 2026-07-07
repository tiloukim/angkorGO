'use client';
// Customer sign-in for the web shop — email one-time code (self-signup allowed).
import { useState } from 'react';
import type { Language } from '@angkorgo/shared';
import { createClient } from '@/lib/supabase-browser';
import { useShopLocale } from '@/lib/shop-i18n';

const L: Record<Language, Record<string, string>> = {
  en: { title: 'Sign in to continue', sub: "We'll email you a one-time code.", email: 'you@email.com', send: 'Send code', sending: 'Sending…', enterCode: 'Enter code', verify: 'Verify', verifying: 'Verifying…', cancel: 'Cancel' },
  km: { title: 'ចូលដើម្បីបន្ត', sub: 'យើងនឹងផ្ញើកូដម្តងទៅអ៊ីមែលរបស់អ្នក។', email: 'you@email.com', send: 'ផ្ញើកូដ', sending: 'កំពុងផ្ញើ…', enterCode: 'បញ្ចូលកូដ', verify: 'ផ្ទៀងផ្ទាត់', verifying: 'កំពុងផ្ទៀងផ្ទាត់…', cancel: 'បោះបង់' },
  zh: { title: '登录以继续', sub: '我们会向您的邮箱发送一次性验证码。', email: 'you@email.com', send: '发送验证码', sending: '发送中…', enterCode: '输入验证码', verify: '验证', verifying: '验证中…', cancel: '取消' },
};

export function AuthModal({ onClose, onSignedIn }: { onClose: () => void; onSignedIn: () => void }) {
  const { lang } = useShopLocale();
  const t = L[lang] ?? L.en;
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
        <h3 className="text-2xl font-extrabold tracking-tight">{t.title}</h3>
        <p className="mt-1 text-sm text-black/55">{t.sub}</p>
        {!sent ? (
          <form onSubmit={sendOtp} className="mt-5 space-y-3">
            <input type="email" required placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-[#f6f6f6] p-4 outline-none focus:border-grab" />
            <button disabled={busy} className="w-full rounded-xl bg-grab p-4 font-bold text-white hover:brightness-110 disabled:opacity-60">
              {busy ? t.sending : t.send}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-5 space-y-3">
            <input inputMode="numeric" maxLength={10} placeholder={t.enterCode} value={code} autoFocus
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              className="w-full rounded-xl border border-black/10 bg-[#f6f6f6] p-4 text-center text-2xl tracking-[0.3em] outline-none focus:border-grab" />
            <button disabled={busy} className="w-full rounded-xl bg-grab p-4 font-bold text-white hover:brightness-110 disabled:opacity-60">
              {busy ? t.verifying : t.verify}
            </button>
          </form>
        )}
        {msg && <p className="mt-3 text-sm text-danger">{msg}</p>}
        <button onClick={onClose} className="mt-4 w-full text-sm font-semibold text-black/50 hover:text-black">{t.cancel}</button>
      </div>
    </div>
  );
}
