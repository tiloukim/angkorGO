// Ride operations — KPIs, fare-config editor, global surge, and live trips.
import { createClient } from '@/lib/supabase-server';
import { updateFareConfig, setSurge } from '../actions';

const ACTIVE = ['searching', 'matched', 'driver_arriving', 'driver_arrived', 'in_progress'];

export default async function RidesPage() {
  const supabase = await createClient();

  const [{ data: fares }, { data: surgeCfg }, { data: trips }] = await Promise.all([
    supabase.from('fare_config').select('*').order('base_fare'),
    supabase.from('platform_config').select('value').eq('key', 'surge_multiplier').maybeSingle(),
    supabase.from('trips').select('id, class, status, est_fare, final_fare, pickup_address, dropoff_address, requested_at')
      .order('requested_at', { ascending: false }).limit(40),
  ]);

  const surge = Number(surgeCfg?.value ?? 1);
  const all = trips ?? [];
  const active = all.filter((t: any) => ACTIVE.includes(t.status));
  const completed = all.filter((t: any) => t.status === 'completed');
  const gmv = completed.reduce((s: number, t: any) => s + Number(t.final_fare ?? t.est_fare ?? 0), 0);
  const avg = completed.length ? gmv / completed.length : 0;

  const kpis = [
    { label: 'Active trips', value: active.length },
    { label: 'Completed (recent)', value: completed.length },
    { label: 'GMV (recent)', value: `$${gmv.toFixed(2)}` },
    { label: 'Avg fare', value: `$${avg.toFixed(2)}` },
  ];

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Ride Operations</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-[#1F2A40] bg-[#151E30] p-5">
            <p className="text-sm text-[#8FA3BF]">{k.label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Surge */}
      <section className="mb-8 rounded-xl border border-[#1F2A40] bg-[#151E30] p-5">
        <h2 className="mb-3 font-bold text-white">Global surge</h2>
        <form action={setSurge} className="flex items-end gap-3">
          <label className="text-sm text-[#8FA3BF]">
            Multiplier
            <input name="surge" type="number" step="0.1" min="1" defaultValue={surge}
              className="mt-1 block w-28 rounded-lg border border-[#1F2A40] bg-[#0B1220] p-2 text-white" />
          </label>
          <button className="rounded-lg bg-[#F04438] px-4 py-2 text-sm font-semibold text-white">Save</button>
          <span className="text-xs text-[#5B6B84]">Applies to new fare quotes.</span>
        </form>
      </section>

      {/* Fare config */}
      <section className="mb-8">
        <h2 className="mb-3 font-bold text-white">Fare config (USD)</h2>
        <div className="space-y-3">
          {(fares ?? []).map((f: any) => (
            <form key={f.class} action={updateFareConfig}
              className="flex flex-wrap items-end gap-3 rounded-xl border border-[#1F2A40] bg-[#151E30] p-4">
              <input type="hidden" name="class" value={f.class} />
              <span className="w-16 font-bold capitalize text-white">{f.class}</span>
              {(['base_fare', 'per_km', 'per_min', 'minimum_fare', 'cancellation_fee'] as const).map((field) => (
                <label key={field} className="text-xs text-[#8FA3BF]">
                  {field.replace('_', ' ')}
                  <input name={field} type="number" step="0.01" defaultValue={f[field]}
                    className="mt-1 block w-24 rounded-lg border border-[#1F2A40] bg-[#0B1220] p-2 text-white" />
                </label>
              ))}
              <button className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white">Save</button>
            </form>
          ))}
        </div>
      </section>

      {/* Live / recent trips */}
      <section>
        <h2 className="mb-3 font-bold text-white">Recent trips</h2>
        <div className="overflow-hidden rounded-xl border border-[#1F2A40]">
          <table className="w-full text-sm">
            <thead className="bg-[#151E30] text-left text-[#8FA3BF]">
              <tr><th className="p-3">Class</th><th className="p-3">Status</th><th className="p-3">Fare</th><th className="p-3">Route</th></tr>
            </thead>
            <tbody>
              {all.map((t: any) => (
                <tr key={t.id} className="border-t border-[#1F2A40] text-white">
                  <td className="p-3 capitalize">{t.class}</td>
                  <td className="p-3">
                    <span className={ACTIVE.includes(t.status) ? 'text-[#F5A524]' : t.status === 'completed' ? 'text-[#10B981]' : 'text-[#8FA3BF]'}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3">${Number(t.final_fare ?? t.est_fare ?? 0).toFixed(2)}</td>
                  <td className="p-3 text-[#8FA3BF]" style={{ maxWidth: 360 }}>
                    <span className="line-clamp-1">{t.pickup_address} → {t.dropoff_address}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
