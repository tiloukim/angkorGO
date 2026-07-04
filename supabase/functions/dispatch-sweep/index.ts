// Edge Function: dispatch-sweep
// Runs the TTL widen/expire pass. Invoke on a short external cron (~15s) or,
// preferably, schedule public.run_dispatch_sweep() directly with pg_cron.
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service role: bypasses RLS
  );

  const { data, error } = await supabase.rpc('run_dispatch_sweep');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true, ...data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
