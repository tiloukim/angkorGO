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
      <h1 className="mb-6 text-2xl font-bold text-white">Payout Queue</h1>
      {!rows?.length && <p className="text-[#8FA3BF]">No pending payouts.</p>}

      <div className="space-y-3">
        {(rows ?? []).map((w: any) => (
          <div key={w.id} className="flex items-center justify-between rounded-xl border border-[#1F2A40] bg-[#151E30] p-4">
            <div>
              <p className="font-bold text-white">${Number(w.amount).toFixed(2)}</p>
              <p className="text-sm text-[#8FA3BF]">
                {w.providers?.business_name ?? 'Provider'} · {w.method} · {w.destination}
              </p>
            </div>
            <div className="flex gap-2">
              <form action={processPayout.bind(null, w.id, 'paid')}>
                <button className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white">Mark paid</button>
              </form>
              <form action={processPayout.bind(null, w.id, 'rejected')}>
                <button className="rounded-lg bg-[#F04438] px-4 py-2 text-sm font-semibold text-white">Reject</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
