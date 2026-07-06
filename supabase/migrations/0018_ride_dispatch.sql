-- =============================================================
-- AngkorGo Ride — R4: Dispatch engine
-- Match a searching trip with the nearest online driver of the right class.
-- Mirrors the rescue engine (find_nearby_providers / accept_assignment).
-- =============================================================

-- Carry the matched vehicle on the offer.
alter table public.trip_offers add column if not exists vehicle_id uuid references public.driver_vehicles(id);

-- ---------- Nearest available drivers for a trip's class ----------
create or replace function public.find_nearby_drivers(
  p_trip_id uuid,
  p_radius_km numeric default 2
)
returns table (provider_id uuid, vehicle_id uuid, distance_km numeric, eta_minutes integer, rating numeric)
language sql stable security definer set search_path = public as $$
  with trip as (select pickup_location, class from public.trips where id = p_trip_id)
  select
    pr.id,
    (select dv.id from public.driver_vehicles dv
      where dv.provider_id = pr.id and dv.class = trip.class and dv.active and dv.verified
      order by dv.created_at limit 1),
    round((st_distance(pl.location, trip.pickup_location) / 1000.0)::numeric, 2) as distance_km,
    greatest(1, ceil((st_distance(pl.location, trip.pickup_location) / 1000.0) / 25.0 * 60.0) + 2)::int,
    pr.rating
  from trip
  join public.provider_locations pl on st_dwithin(pl.location, trip.pickup_location, p_radius_km * 1000)
  join public.providers pr on pr.id = pl.provider_id
  where pr.is_online = true and pr.status = 'approved'
    and exists (select 1 from public.driver_vehicles dv
                where dv.provider_id = pr.id and dv.class = trip.class and dv.active and dv.verified)
    and not exists (select 1 from public.trip_offers o where o.trip_id = p_trip_id and o.provider_id = pr.id)
    -- not already on an active trip or an active rescue job
    and not exists (select 1 from public.trips t
                    where t.driver_id = pr.id and t.status in ('matched','driver_arriving','driver_arrived','in_progress'))
    and not exists (select 1 from public.service_requests sr
                    where sr.assigned_provider_id = pr.id and sr.status in ('accepted','en_route','arrived','in_progress'))
  order by distance_km asc, pr.rating desc
  limit 15;
$$;

-- ---------- Dispatch fan-out ----------
create or replace function public.dispatch_trip(p_trip_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_radius numeric; v_created integer := 0;
begin
  select current_radius_km into v_radius from public.trips where id = p_trip_id;

  insert into public.trip_offers (trip_id, provider_id, vehicle_id, distance_km, eta_minutes)
  select p_trip_id, nd.provider_id, nd.vehicle_id, nd.distance_km, nd.eta_minutes
  from public.find_nearby_drivers(p_trip_id, v_radius) nd
  on conflict (trip_id, provider_id) do nothing;

  get diagnostics v_created = row_count;

  update public.trips set status = 'searching', last_dispatch_at = now()
    where id = p_trip_id and status in ('requested','searching');
  return v_created;
end;
$$;

-- ---------- Widen radius (2 → 3 → 5 km) ----------
create or replace function public.widen_dispatch_trip(p_trip_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
begin
  update public.trips
    set current_radius_km = case current_radius_km when 2 then 3 when 3 then 5 else 5 end
    where id = p_trip_id;
  return public.dispatch_trip(p_trip_id);
end;
$$;

-- ---------- Driver accepts (atomic, first-wins) ----------
create or replace function public.accept_trip(p_offer_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_trip uuid; v_provider uuid; v_vehicle uuid;
begin
  select trip_id, provider_id, vehicle_id into v_trip, v_provider, v_vehicle
  from public.trip_offers where id = p_offer_id for update;

  update public.trips
    set status = 'matched', driver_id = v_provider,
        vehicle_id = coalesce(v_vehicle, vehicle_id), matched_at = now()
    where id = v_trip and status in ('requested','searching');
  if not found then raise exception 'Trip no longer available'; end if;

  update public.trip_offers set status = 'accepted', responded_at = now() where id = p_offer_id;
  update public.trip_offers set status = 'expired'
    where trip_id = v_trip and id <> p_offer_id and status = 'offered';
end;
$$;

create or replace function public.reject_trip_offer(p_offer_id uuid)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.trip_offers set status = 'rejected', responded_at = now()
  where id = p_offer_id and provider_id = public.my_provider_id() and status = 'offered';
end;
$$;

-- ---------- Notifications ----------
create or replace function public.on_trip_offer_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_cls vehicle_class;
begin
  select user_id into v_user from public.providers where id = new.provider_id;
  select class into v_cls from public.trips where id = new.trip_id;
  perform public.notify_user(
    v_user, 'New ride request', concat(v_cls, ' · ', new.distance_km, ' km away'),
    'trip_offer', jsonb_build_object('trip_id', new.trip_id, 'offer_id', new.id));
  return new;
end;
$$;
create trigger trg_trip_offer_notify
  after insert on public.trip_offers
  for each row execute function public.on_trip_offer_created();

create or replace function public.on_trip_matched()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'matched' and old.status is distinct from 'matched' then
    perform public.notify_user(new.rider_id, 'Driver found!', 'Your driver is on the way',
      'trip_matched', jsonb_build_object('trip_id', new.id));
  end if;
  return new;
end;
$$;
create trigger trg_trip_matched_notify
  after update on public.trips
  for each row execute function public.on_trip_matched();

-- ---------- Extend the TTL sweep to also widen/expire trips ----------
create or replace function public.run_dispatch_sweep()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_ttl integer;
  v_expired integer := 0; v_widened integer := 0;
  v_trip_widened integer := 0; v_trip_expired integer := 0;
  r record;
begin
  select coalesce((value)::text::integer, 45) into v_ttl from public.platform_config where key = 'offer_ttl_seconds';
  v_ttl := coalesce(v_ttl, 45);

  -- Rescue: expire past-deadline requests, widen stale ones.
  with e as (
    update public.service_requests set status = 'expired'
      where status in ('pending','dispatching') and expires_at < now() returning id)
  select count(*) into v_expired from e;
  update public.service_assignments set status = 'expired'
    where status = 'offered' and request_id in (select id from public.service_requests where status = 'expired');
  for r in select id from public.service_requests
           where status = 'dispatching' and current_radius_km < 20 and last_dispatch_at < now() - make_interval(secs => v_ttl)
  loop perform public.widen_dispatch(r.id); v_widened := v_widened + 1; end loop;

  -- Ride: widen stale searching trips (2→3→5), then give up if still stale at max radius.
  for r in select id from public.trips
           where status = 'searching' and current_radius_km < 5 and last_dispatch_at < now() - make_interval(secs => v_ttl)
  loop perform public.widen_dispatch_trip(r.id); v_trip_widened := v_trip_widened + 1; end loop;

  with te as (
    update public.trips set status = 'no_drivers'
      where status = 'searching' and current_radius_km >= 5 and last_dispatch_at < now() - make_interval(secs => v_ttl * 2)
      returning id)
  select count(*) into v_trip_expired from te;
  update public.trip_offers set status = 'expired'
    where status = 'offered' and trip_id in (select id from public.trips where status = 'no_drivers');

  return jsonb_build_object('expired', v_expired, 'widened', v_widened,
                            'trip_widened', v_trip_widened, 'trip_expired', v_trip_expired);
end;
$$;

grant execute on function public.dispatch_trip(uuid)       to authenticated;
grant execute on function public.accept_trip(uuid)         to authenticated;
grant execute on function public.reject_trip_offer(uuid)   to authenticated;
grant execute on function public.widen_dispatch_trip(uuid) to authenticated;
