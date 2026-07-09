// Active Emergency SOS alerts — ops queue. Newest active/acknowledged first,
// with the member, live location, nearest station, and acknowledge/resolve.
// NOTE: real police delivery (SMS/station channel) is a separate integration;
// this page is where ops sees and works alerts in the meantime.
import { createClient } from '@/lib/supabase-server';
import { acknowledgeAlert, resolveAlert } from '../actions';

export const dynamic = 'force-dynamic';

function since(ts: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
}

export default async function AlertsPage() {
  const supabase = await createClient();

  const { data: alerts } = await supabase
    .from('emergency_alerts')
    .select('id, status, lat, lng, note, created_at, member:profiles!emergency_alerts_member_id_fkey(full_name, phone), station:police_stations(name, phone, address)')
    .in('status', ['active', 'acknowledged'])
    .order('created_at', { ascending: false });

  const active = (alerts ?? []).filter((a: any) => a.status === 'active');

  return (
    <main className="p-5 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">🚨 Active Alerts</h1>
        {active.length > 0 && (
          <span className="rounded-full bg-danger px-3 py-1 text-sm font-bold text-white">{active.length} active</span>
        )}
      </div>

      <p className="mb-6 max-w-2xl text-sm text-black/55">
        Live Emergency SOS alerts from members. Contact the member and the nearest station.
        Real station delivery (SMS/dashboard) is a pending integration — acknowledge here so the member sees a response.
      </p>

      {!alerts?.length && <p className="text-black/55">No active alerts. ✅</p>}

      <div className="space-y-4">
        {(alerts ?? []).map((a: any) => (
          <div
            key={a.id}
            className={`rounded-2xl border p-5 ${a.status === 'active' ? 'border-danger/40 bg-danger/5' : 'border-black/10 bg-[#f6f6f6]'}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${a.status === 'active' ? 'bg-danger text-white' : 'bg-[#b26b00] text-white'}`}>
                    {a.status === 'active' ? 'ACTIVE' : 'ACKNOWLEDGED'}
                  </span>
                  <span className="text-xs text-black/55">{since(a.created_at)}</span>
                </div>
                <p className="mt-2 text-lg font-bold">{a.member?.full_name ?? 'Member'}</p>
                <p className="text-sm text-black/55">{a.member?.phone ?? 'no phone on file'}</p>
                {a.note && <p className="mt-1 text-sm text-black/70">“{a.note}”</p>}
                <p className="mt-2 text-xs text-black/55">
                  Nearest station: <span className="font-semibold text-black/80">{a.station?.name ?? 'unknown'}</span>
                  {a.station?.phone ? ` · ${a.station.phone}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href={`https://www.google.com/maps?q=${a.lat},${a.lng}`}
                    target="_blank"
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black"
                  >
                    📍 View location ↗
                  </a>
                  {a.member?.phone && (
                    <a href={`tel:${a.member.phone}`} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black">
                      📞 Call member
                    </a>
                  )}
                  {a.station?.phone && (
                    <a href={`tel:${a.station.phone}`} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:border-black">
                      🚔 Call station
                    </a>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {a.status === 'active' && (
                  <form action={acknowledgeAlert.bind(null, a.id)}>
                    <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Acknowledge</button>
                  </form>
                )}
                <form action={resolveAlert.bind(null, a.id)}>
                  <button className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black/70 hover:border-black">Resolve</button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
