// Edge Function: flight-status
// Looks up a flight by number via AeroDataBox and returns a normalized status +
// arrival/departure times. The API key stays server-side as a Supabase secret,
// so it's never shipped in the app.
//
// Setup (free to start):
//   1. Sign up at RapidAPI, subscribe to "AeroDataBox" (Basic tier is free/$0.99).
//   2. supabase secrets set AERODATABOX_API_KEY=<your X-RapidAPI-Key>
//      (optional) AERODATABOX_API_HOST=aerodatabox.p.rapidapi.com   [default]
//   3. supabase functions deploy flight-status
//
// Request body: { flight_number: "AK123", date?: "YYYY-MM-DD" }  (date → today if omitted)

const HOST = Deno.env.get('AERODATABOX_API_HOST') ?? 'aerodatabox.p.rapidapi.com';
const KEY = Deno.env.get('AERODATABOX_API_KEY');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!KEY) return json({ error: 'Flight lookup not configured' }, 503);

    const { flight_number, date } = await req.json().catch(() => ({}));
    if (!flight_number) return json({ error: 'flight_number required' }, 400);

    const num = String(flight_number).replace(/\s+/g, '').toUpperCase();
    const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);

    const url = `https://${HOST}/flights/number/${encodeURIComponent(num)}/${d}` +
      `?withAircraftImage=false&withLocation=false`;
    const res = await fetch(url, {
      headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST },
    });

    if (res.status === 204 || res.status === 404) return json({ found: false });
    if (!res.ok) return json({ error: `Flight API ${res.status}` }, 502);

    const data = await res.json();
    const list = Array.isArray(data) ? data : (data?.flights ?? []);
    if (!list.length) return json({ found: false });

    // Prefer a flight that's still upcoming/active; else take the first.
    const f = list.find((x: any) => x?.status && !/arrived|landed|canceled|cancelled/i.test(x.status)) ?? list[0];

    return json({
      found: true,
      number: f.number ?? num,
      status: f.status ?? null,
      departure: leg(f.departure),
      arrival: leg(f.arrival),
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function leg(x: any) {
  if (!x) return null;
  return {
    airport: x.airport?.name ?? x.airport?.iata ?? null,
    iata: x.airport?.iata ?? null,
    scheduled: x.scheduledTime?.local ?? x.scheduledTime?.utc ?? null,
    estimated: x.revisedTime?.local ?? x.predictedTime?.local ?? x.runwayTime?.local ?? null,
    terminal: x.terminal ?? null,
    gate: x.gate ?? null,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
