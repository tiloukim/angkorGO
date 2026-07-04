-- =============================================================
-- AngkorGo — 0010 GPS Tracking
-- Phase 5: provider heartbeat upsert (validated) + realtime-friendly coords
-- =============================================================

-- Keep plain lat/lng alongside the geography so Realtime payloads carry
-- readable coordinates (geography streams as opaque WKB otherwise).
alter table public.provider_locations
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- ---------- Validated location heartbeat ----------
-- Called by the provider app every ~5s. Runs as invoker so the
-- "locations: owner write" RLS policy applies (provider_id = my_provider_id()).
-- Rejects out-of-range coordinates and implausible GPS jumps (>300 km/h).
create or replace function public.update_provider_location(
  p_lng     double precision,
  p_lat     double precision,
  p_heading numeric default null,
  p_speed   numeric default null
)
returns boolean
language plpgsql security invoker set search_path = public as $$
declare
  v_provider uuid := public.my_provider_id();
  v_prev     public.provider_locations%rowtype;
  v_dist_m   double precision;
  v_dt       double precision;
begin
  if v_provider is null then
    return false;                         -- not a provider
  end if;
  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    return false;                         -- invalid coordinates
  end if;

  select * into v_prev from public.provider_locations where provider_id = v_provider;

  -- Reject teleports: if the implied speed since the last fix is absurd, drop it.
  if found then
    v_dist_m := st_distance(v_prev.location, st_point(p_lng, p_lat)::geography);
    v_dt     := greatest(extract(epoch from (now() - v_prev.updated_at)), 1);
    if v_dist_m / v_dt > 83 then          -- ~300 km/h
      return false;
    end if;
  end if;

  insert into public.provider_locations (provider_id, location, lat, lng, heading, speed, updated_at)
  values (v_provider, st_point(p_lng, p_lat)::geography, p_lat, p_lng, p_heading, p_speed, now())
  on conflict (provider_id) do update
    set location = excluded.location, lat = excluded.lat, lng = excluded.lng,
        heading = excluded.heading, speed = excluded.speed, updated_at = now();

  return true;
end;
$$;
