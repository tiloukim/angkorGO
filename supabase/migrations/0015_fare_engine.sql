-- =============================================================
-- AngkorGo Ride — R2: Fare engine
-- Given a route's distance + duration (from Google Distance Matrix / Directions),
-- compute the fare per class from fare_config. Server-authoritative pricing.
-- =============================================================

-- Single-class estimate.
create or replace function public.estimate_fare(
  p_class        vehicle_class,
  p_distance_km  numeric,
  p_duration_min integer,
  p_surge        numeric default 1.0
)
returns numeric
language sql stable set search_path = public as $$
  select round(greatest(
    fc.minimum_fare,
    (fc.base_fare + fc.per_km * p_distance_km + fc.per_min * p_duration_min) * coalesce(p_surge, 1.0)
  ), 2)
  from public.fare_config fc
  where fc.class = p_class;
$$;

-- Estimate for every class at once (feeds the rider's class picker).
create or replace function public.estimate_all_fares(
  p_distance_km  numeric,
  p_duration_min integer,
  p_surge        numeric default 1.0
)
returns table (class vehicle_class, fare numeric, currency text)
language sql stable set search_path = public as $$
  select
    fc.class,
    round(greatest(
      fc.minimum_fare,
      (fc.base_fare + fc.per_km * p_distance_km + fc.per_min * p_duration_min) * coalesce(p_surge, 1.0)
    ), 2),
    fc.currency
  from public.fare_config fc
  order by fc.base_fare;
$$;

grant execute on function public.estimate_fare(vehicle_class, numeric, integer, numeric) to anon, authenticated;
grant execute on function public.estimate_all_fares(numeric, integer, numeric) to anon, authenticated;
