-- =============================================================
-- Auto-shift scheduled airport pickups when the flight is delayed or early.
-- A cron pings the flight-refresh edge function every 15 min; the function
-- re-polls each upcoming scheduled trip's flight and moves scheduled_for to the
-- revised arrival + buffer (and notifies the rider). The function is deployed
-- --no-verify-jwt (it only reads public flight data + updates its own scheduled
-- trips via the service role), so no secret is embedded here.
-- =============================================================

create extension if not exists pg_net;

select cron.schedule('flight-refresh', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://vjvointiicklyylvqzdh.supabase.co/functions/v1/flight-refresh',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
