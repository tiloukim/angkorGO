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
    <main className="p-5 md:p-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Dispute Center</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase text-black/45">Failed / refunded payments</h2>
        {!payments?.length && <p className="text-sm text-black/55">None.</p>}
        <div className="space-y-2">
          {(payments ?? []).map((p) => (
            <div key={p.id} className="flex justify-between gap-3 rounded-lg border border-black/10 bg-[#f6f6f6] p-3 text-sm">
              <span>${Number(p.amount).toFixed(2)} {p.currency}</span>
              <span className="text-danger">{p.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase text-black/45">Expired / cancelled requests</h2>
        {!requests?.length && <p className="text-sm text-black/55">None.</p>}
        <div className="space-y-2">
          {(requests ?? []).map((r) => (
            <div key={r.id} className="flex justify-between gap-3 rounded-lg border border-black/10 bg-[#f6f6f6] p-3 text-sm">
              <span className="capitalize">{r.category.replace('_', ' ')}</span>
              <span className="text-[#b26b00] capitalize">{r.status}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
