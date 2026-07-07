'use client';
// Web payment — same sandbox gateway as the app. Pick a method → create-payment
// returns a KHQR payload → "Simulate payment" fires payment-webhook (what ABA
// PayWay/Bakong will POST when live) → confirm + release + wallet credit.
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

const SANDBOX = process.env.NEXT_PUBLIC_PAYMENTS_SANDBOX !== 'false';
const METHODS = [
  { key: 'khqr', label: '📱 KHQR' },
  { key: 'aba_payway', label: '🏦 ABA PayWay' },
  { key: 'stripe', label: '💳 Card' },
];

export function WebPayment({ column, value, onPaid }: { column: 'order_id' | 'booking_id'; value: string; onPaid?: () => void }) {
  const [payment, setPayment] = useState<any>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const load = () =>
      supabase.from('payments').select('*').eq(column, value).maybeSingle().then(({ data }) => setPayment(data));
    load();
    const ch = supabase
      .channel(`pay:${column}:${value}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `${column}=eq.${value}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [column, value]);

  async function pay(m: string) {
    setBusy(true); setMethod(m);
    const { data } = await createClient().functions.invoke('create-payment', { body: { payment_id: payment.id, method: m } });
    setBusy(false);
    if ((data as any)?.qr) setQr((data as any).qr);
  }

  async function simulate() {
    setBusy(true);
    await createClient().functions.invoke('payment-webhook', { body: { payment_id: payment.id, method: method ?? 'khqr', status: 'paid' } });
    setBusy(false);
  }

  if (!payment) return null;

  if (payment.status === 'released' || payment.status === 'held') {
    onPaid?.();
    return (
      <div className="rounded-2xl bg-grab-soft p-6 text-center">
        <p className="text-lg font-extrabold text-grab-dark">Paid ✓</p>
        <p className="text-sm text-black/55">${Number(payment.amount).toFixed(2)} {payment.currency}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 p-6">
      <p className="text-sm font-semibold text-black/55">Total</p>
      <p className="text-3xl font-black text-grab">${Number(payment.amount).toFixed(2)} {payment.currency}</p>

      {qr ? (
        <div className="mt-4 rounded-xl bg-[#f6f6f6] p-5 text-center">
          <p className="break-all text-xs text-black/60">{qr}</p>
          <p className="mt-2 text-sm text-black/55">Scan with {METHODS.find((m) => m.key === method)?.label} to pay</p>
          {SANDBOX && (
            <button onClick={simulate} disabled={busy} className="mt-4 w-full rounded-xl bg-grab px-6 py-3 font-bold text-white hover:brightness-110 disabled:opacity-60">
              ✓ Simulate payment (sandbox)
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-2">
          {METHODS.map((m) => (
            <button key={m.key} onClick={() => pay(m.key)} disabled={busy}
              className="rounded-xl border border-black/10 px-4 py-3 text-left font-semibold hover:border-grab disabled:opacity-60">
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
