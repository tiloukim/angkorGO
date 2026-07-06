-- =============================================================
-- AngkorGo Ride — R3: rider trip RPCs
-- create_trip builds pickup/dropoff geography server-side (supabase-js can't
-- emit geography literals). get_trip returns readable coords for the map.
-- Dispatch (find_nearby_drivers / accept_trip) is R4.
-- =============================================================

create or replace function public.create_trip(
  p_class           vehicle_class,
  p_pickup_lng      double precision,
  p_pickup_lat      double precision,
  p_pickup_address  text,
  p_dropoff_lng     double precision,
  p_dropoff_lat     double precision,
  p_dropoff_address text,
  p_est_distance_km numeric,
  p_est_duration_min integer,
  p_est_fare        numeric,
  p_surge           numeric        default 1.0,
  p_payment_method  payment_method default 'cash',
  p_polyline        text           default null
)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.trips (
    rider_id, class, status,
    pickup_location, pickup_lat, pickup_lng, pickup_address,
    dropoff_location, dropoff_lat, dropoff_lng, dropoff_address, route_polyline,
    est_distance_km, est_duration_min, est_fare, surge_multiplier, currency, payment_method
  ) values (
    auth.uid(), p_class, 'searching',
    st_point(p_pickup_lng, p_pickup_lat)::geography, p_pickup_lat, p_pickup_lng, p_pickup_address,
    st_point(p_dropoff_lng, p_dropoff_lat)::geography, p_dropoff_lat, p_dropoff_lng, p_dropoff_address, p_polyline,
    p_est_distance_km, p_est_duration_min, p_est_fare, coalesce(p_surge, 1.0), 'USD', p_payment_method
  )
  returning id into v_id;   -- RLS "trips: rider create" enforces rider_id = auth.uid()
  return v_id;
end;
$$;

create or replace function public.get_trip(p_trip_id uuid)
returns table (
  id uuid, class vehicle_class, status trip_status,
  pickup_lat double precision, pickup_lng double precision, pickup_address text,
  dropoff_lat double precision, dropoff_lng double precision, dropoff_address text,
  driver_id uuid, est_fare numeric, currency text
)
language sql stable security invoker set search_path = public as $$
  select id, class, status, pickup_lat, pickup_lng, pickup_address,
         dropoff_lat, dropoff_lng, dropoff_address, driver_id, est_fare, currency
  from public.trips where id = p_trip_id;   -- RLS restricts to participants/admin
$$;

grant execute on function public.create_trip(vehicle_class, double precision, double precision, text,
  double precision, double precision, text, numeric, integer, numeric, numeric, payment_method, text)
  to authenticated;
grant execute on function public.get_trip(uuid) to authenticated;
