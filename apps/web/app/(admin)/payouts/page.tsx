// Payout queue — pending/processing provider withdrawals. Approving marks paid;
// rejecting refunds the wallet (handled atomically by process_withdrawal).
import { createClient } from '@/lib/supabase-server';
import { processPayout } from '../actions';

export default async function PayoutsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('withdrawals')
    .select('id, amount, status, method, destination, requested_at, providers(business_name)')
    .in('status', ['pending', 'processing'])
    .order('requested_at', { ascending: true });

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Payout Queue</h1>
      {!rows?.length && <p className="text-black/55">No pending payouts.</p>}

      <div className="space-y-3">
        {(rows ?? []).map((w: any) => (
          <div key={w.id} className="flex items-center justify-between rounded-2xl border border-black/10 bg-[#f6f6f6] p-4">
            <div>
              <p className="font-bold">${Number(w.amount).toFixed(2)}</p>
              <p className="text-sm text-black/55">
                {w.providers?.business_name ?? 'Provider'} · {w.method} · {w.destination}
              </p>
            </div>
            <div className="flex gap-2">
              <form action={processPayout.bind(null, w.id, 'paid')}>
                <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Mark paid</button>
              </form>
              <form action={processPayout.bind(null, w.id, 'rejected')}>
                <button className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white">Reject</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
