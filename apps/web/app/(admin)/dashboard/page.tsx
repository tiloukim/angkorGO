// Admin dashboard KPIs (Phase 8). Server component — RLS ensures only an
// admin profile can read the underlying rows.
import { createClient } from '@/lib/supabase-server';

async function kpi(fn: () => Promise<number>) {
  try { return await fn(); } catch { return 0; }
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  const count = (table: string, filter?: (q: any) => any) => async () => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count: c } = await q;
    return c ?? 0;
  };

  const [users, providers, pendingApprovals, activeRequests, completedRequests] = await Promise.all([
    kpi(count('profiles')),
    kpi(count('providers', (q) => q.eq('status', 'approved'))),
    kpi(count('providers', (q) => q.eq('status', 'pending'))),
    kpi(count('service_requests', (q) => q.in('status', ['dispatching', 'accepted', 'en_route', 'arrived', 'in_progress']))),
    kpi(count('service_requests', (q) => q.eq('status', 'completed'))),
  ]);

  const { data: rev } = await supabase.from('payments').select('amount, commission_amount').eq('status', 'released');
  const revenue = (rev ?? []).reduce((s, p: any) => s + Number(p.amount), 0);
  const commission = (rev ?? []).reduce((s, p: any) => s + Number(p.commission_amount), 0);

  const cards = [
    { label: 'Total Users', value: users },
    { label: 'Approved Providers', value: providers },
    { label: 'Pending Approvals', value: pendingApprovals },
    { label: 'Active Requests', value: activeRequests },
    { label: 'Completed Requests', value: completedRequests },
    { label: 'Revenue (USD)', value: `$${revenue.toFixed(2)}` },
    { label: 'Commission (USD)', value: `$${commission.toFixed(2)}` },
  ];

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">AngkorGo — Admin</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="text-3xl font-bold mt-2">{c.value}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
