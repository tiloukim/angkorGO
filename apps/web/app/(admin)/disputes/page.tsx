// Dispute center — surfaces problem cases for manual follow-up: requests that
// expired (no provider) or were cancelled, and any failed payments.
// (A dedicated disputes table can replace this heuristic view post-MVP.)
import { createClient } from '@/lib/supabase-server';

export default async function DisputesPage() {
  const supabase = await createClient();

  const [{ data: requests }, { data: payments }] = await Promise.all([
    supabase.from('service_requests')
      .select('id, category, status, address, created_at')
      .in('status', ['expired', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('payments')
      .select('id, amount, currency, status, request_id, created_at')
      .in('status', ['failed', 'refunded'])
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Dispute Center</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase text-[#8FA3BF]">Failed / refunded payments</h2>
        {!payments?.length && <p className="text-sm text-[#8FA3BF]">None.</p>}
        <div className="space-y-2">
          {(payments ?? []).map((p) => (
            <div key={p.id} className="flex justify-between rounded-lg border border-[#1F2A40] bg-[#151E30] p-3 text-sm">
              <span className="text-white">${Number(p.amount).toFixed(2)} {p.currency}</span>
              <span className="text-[#F04438]">{p.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase text-[#8FA3BF]">Expired / cancelled requests</h2>
        {!requests?.length && <p className="text-sm text-[#8FA3BF]">None.</p>}
        <div className="space-y-2">
          {(requests ?? []).map((r) => (
            <div key={r.id} className="flex justify-between rounded-lg border border-[#1F2A40] bg-[#151E30] p-3 text-sm">
              <span className="text-white capitalize">{r.category.replace('_', ' ')}</span>
              <span className="text-[#C79A5B] capitalize">{r.status}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
