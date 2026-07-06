// Vehicle approvals — verify driver vehicles so they can receive ride offers.
import { createClient } from '@/lib/supabase-server';
import { setVehicleVerified } from '../actions';

export default async function VehiclesPage() {
  const supabase = await createClient();
  const { data: vehicles } = await supabase
    .from('driver_vehicles')
    .select('id, class, make_model, color, plate_number, photo_url, verified, providers(business_name, profiles(full_name))')
    .order('created_at', { ascending: true });

  const signed: Record<string, string> = {};
  for (const v of vehicles ?? []) {
    if ((v as any).photo_url) {
      const { data } = await supabase.storage.from('provider-docs').createSignedUrl((v as any).photo_url, 3600);
      if (data?.signedUrl) signed[(v as any).photo_url] = data.signedUrl;
    }
  }

  const pending = (vehicles ?? []).filter((v: any) => !v.verified);
  const verified = (vehicles ?? []).filter((v: any) => v.verified);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Vehicle Approvals</h1>

      <h2 className="mb-3 text-sm font-semibold uppercase text-[#8FA3BF]">Pending ({pending.length})</h2>
      {!pending.length && <p className="text-[#8FA3BF]">No vehicles awaiting verification.</p>}
      <div className="space-y-3">
        {pending.map((v: any) => (
          <div key={v.id} className="flex items-center justify-between rounded-xl border border-[#1F2A40] bg-[#151E30] p-4">
            <div className="flex items-center gap-4">
              {v.photo_url && signed[v.photo_url] && (
                <a href={signed[v.photo_url]} target="_blank" className="text-xs text-[#F04438]">photo ↗</a>
              )}
              <div>
                <p className="font-bold text-white capitalize">{v.class} · {v.plate_number}</p>
                <p className="text-sm text-[#8FA3BF]">
                  {v.make_model ?? '—'}{v.color ? ` · ${v.color}` : ''} · {v.providers?.business_name ?? v.providers?.profiles?.full_name ?? 'Driver'}
                </p>
              </div>
            </div>
            <form action={setVehicleVerified.bind(null, v.id, true)}>
              <button className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white">Verify</button>
            </form>
          </div>
        ))}
      </div>

      {verified.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase text-[#8FA3BF]">Verified ({verified.length})</h2>
          <div className="space-y-2">
            {verified.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border border-[#1F2A40] bg-[#151E30] p-3 text-sm">
                <span className="text-white capitalize">{v.class} · {v.plate_number}</span>
                <form action={setVehicleVerified.bind(null, v.id, false)}>
                  <button className="text-xs text-[#8FA3BF] hover:text-[#F04438]">Unverify</button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
