// Edge Function: flight-refresh
// Re-polls the live flight status for upcoming SCHEDULED airport pickups and
// shifts each trip's scheduled_for to (revised arrival + buffer) if the flight
// moved. Run by a cron every ~15 min (see migration 0036). No-JWT: it only reads
// public flight data + updates its own scheduled trips via the service role.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const HOST = Deno.env.get('AERODATABOX_API_HOST') ?? 'aerodatabox.p.rapidapi.com';
const KEY = Deno.env.get('AERODATABOX_API_KEY');
const BUFFER_MIN = 25;          // deplane + immigration + baggage
const SHIFT_THRESHOLD_MS = 5 * 60 * 1000;   // only move if it changed > 5 min

Deno.serve(async () => {
  if (!KEY) return json({ error: 'not configured' }, 503);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const nowIso = new Date().toISOString();
  const soonIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const { data: trips } = await supabase
    .from('trips')
    .select('id, rider_id, flight_number, scheduled_for')
    .eq('status', 'requested')
    .not('flight_number', 'is', null)
    .not('scheduled_for', 'is', null)
    .gt('scheduled_for', nowIso)      // still upcoming
    .lt('scheduled_for', soonIso);    // within 24h

  let checked = 0, updated = 0;
  for (const t of trips ?? []) {
    checked++;
    try {
      const date = String(t.scheduled_for).slice(0, 10);   // YYYY-MM-DD
      const num = String(t.flight_number).replace(/\s+/g, '').toUpperCase();
      const res = await fetch(
        `https://${HOST}/flights/number/${encodeURIComponent(num)}/${date}?withAircraftImage=false&withLocation=false`,
        { headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST } },
      );
      if (!res.ok) continue;
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.flights ?? []);
      const a = list[0]?.arrival;
      // Prefer the most up-to-date arrival estimate available.
      const arrivalStr = a?.revisedTime?.utc ?? a?.predictedTime?.utc ?? a?.runwayTime?.utc ?? a?.scheduledTime?.utc;
      if (!arrivalStr) continue;

      const arrivalMs = new Date(String(arrivalStr).replace(' ', 'T')).getTime();
      if (!Number.isFinite(arrivalMs)) continue;
      const newSched = new Date(arrivalMs + BUFFER_MIN * 60000);
      const curMs = new Date(String(t.scheduled_for)).getTime();

      if (Math.abs(newSched.getTime() - curMs) > SHIFT_THRESHOLD_MS) {
        const { error } = await supabase
          .from('trips')
          .update({ scheduled_for: newSched.toISOString() })
          .eq('id', t.id)
          .eq('status', 'requested');   // don't touch it if it already dispatched
        if (!error) {
          updated++;
          const hhmm = newSched.toISOString().slice(11, 16);
          await supabase.rpc('notify_user', {
            p_user_id: t.rider_id,
            p_title: 'Airport pickup rescheduled',
            p_body: `Flight ${num} updated — your driver will now be dispatched around ${hhmm} UTC`,
            p_type: 'trip_rescheduled',
            p_data: { trip_id: t.id },
          }).catch(() => {});
        }
      }
    } catch (_) { /* skip this trip */ }
  }
  return json({ checked, updated });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
