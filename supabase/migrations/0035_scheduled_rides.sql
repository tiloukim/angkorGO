-- =============================================================
-- AngkorGo Ride — scheduled pickups (airport transfers by flight arrival).
-- A scheduled trip is created but NOT dispatched immediately; it waits with
-- status 'requested' + a scheduled_for time, and a per-minute cron promotes it
-- to 'searching' + dispatches near the flight's arrival. Delay-aware refresh of
-- scheduled_for from live flight status is a follow-up (flight-refresh edge fn).
-- =============================================================

alter table public.trips add column if not exists scheduled_for timestamptz;
alter table public.trips add column if not exists flight_number text;
create index if not exists idx_trips_scheduled on public.trips (scheduled_for)
  where scheduled_for is not null and status = 'requested';

-- ---------- create_trip: add optional scheduling ----------
-- A future p_scheduled_for creates a 'requested' (undispatched) trip; the cron
-- dispatches it at that time. Null keeps the immediate-dispatch behaviour.
drop function if exists public.create_trip(vehicle_class, double precision, double precision, text,
  double precision, double precision, text, numeric, integer, numeric, numeric, payment_method, text);

create or replace function public.create_trip(
  p_class            vehicle_class,
  p_pickup_lng       double precision, p_pickup_lat double precision, p_pickup_address text,
  p_dropoff_lng      double precision, p_dropoff_lat double precision, p_dropoff_address text,
  p_est_distance_km  numeric, p_est_duration_min integer, p_est_fare numeric,
  p_surge            numeric        default 1.0,
  p_payment_method   payment_method default 'cash',
  p_polyline         text           default null,
  p_scheduled_for    timestamptz    default null,
  p_flight_number    text           default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_scheduled boolean := p_scheduled_for is not null and p_scheduled_for > now();
begin
  insert into public.trips (
    rider_id, class, status,
    pickup_location, pickup_lat, pickup_lng, pickup_address,
    dropoff_location, dropoff_lat, dropoff_lng, dropoff_address, route_polyline,
    est_distance_km, est_duration_min, est_fare, surge_multiplier, currency, payment_method,
    scheduled_for, flight_number
  ) values (
    auth.uid(), p_class, case when v_scheduled then 'requested' else 'searching' end,
    st_point(p_pickup_lng, p_pickup_lat)::geography, p_pickup_lat, p_pickup_lng, p_pickup_address,
    st_point(p_dropoff_lng, p_dropoff_lat)::geography, p_dropoff_lat, p_dropoff_lng, p_dropoff_address, p_polyline,
    p_est_distance_km, p_est_duration_min, p_est_fare, coalesce(p_surge, 1.0), 'USD', p_payment_method,
    case when v_scheduled then p_scheduled_for else null end, p_flight_number
  )
  returning id into v_id;
  return v_id;
end; $$;

grant execute on function public.create_trip(vehicle_class, double precision, double precision, text,
  double precision, double precision, text, numeric, integer, numeric, numeric, payment_method, text,
  timestamptz, text) to authenticated;

-- ---------- get_trip: expose scheduled_for + flight_number ----------
drop function if exists public.get_trip(uuid);
create or replace function public.get_trip(p_trip_id uuid)
returns table (
  id uuid, class vehicle_class, status trip_status,
  pickup_lat double precision, pickup_lng double precision, pickup_address text,
  dropoff_lat double precision, dropoff_lng double precision, dropoff_address text,
  driver_id uuid, est_fare numeric, currency text,
  scheduled_for timestamptz, flight_number text
)
language sql stable security invoker set search_path = public as $$
  select id, class, status, pickup_lat, pickup_lng, pickup_address,
         dropoff_lat, dropoff_lng, dropoff_address, driver_id, est_fare, currency,
         scheduled_for, flight_number
  from public.trips where id = p_trip_id;
$$;
grant execute on function public.get_trip(uuid) to authenticated;

-- ---------- Cron: dispatch scheduled trips when their time arrives ----------
create or replace function public.run_scheduled_dispatch()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in select id from public.trips
           where status = 'requested' and scheduled_for is not null and scheduled_for <= now()
  loop
    update public.trips set status = 'searching', last_dispatch_at = now() where id = r.id;
    perform public.dispatch_trip(r.id);
    n := n + 1;
  end loop;
  return n;
end; $$;

select cron.schedule('scheduled-ride-dispatch', '* * * * *', $$select public.run_scheduled_dispatch();$$);

grant execute on function public.run_scheduled_dispatch() to authenticated;
