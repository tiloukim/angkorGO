-- =============================================================
-- AngkorGo Ride — R5: Live tracking
-- Let a trip's rider read their driver's live location, and expose driver +
-- vehicle details for the tracking card.
-- =============================================================

-- Rider can read the assigned driver's location while the trip is active.
-- (Adds to the existing provider_locations SELECT policies — they OR together.)
create policy "locations: trip rider read" on public.provider_locations
  for select using (
    exists (
      select 1 from public.trips t
      where t.driver_id = provider_locations.provider_id
        and t.rider_id = auth.uid()
        and t.status in ('matched', 'driver_arriving', 'driver_arrived', 'in_progress')
    )
  );

-- Driver + vehicle details for the rider's tracking card (RLS-guarded).
create or replace function public.get_trip_driver(p_trip_id uuid)
returns table (
  driver_name text, rating numeric, total_jobs integer,
  vehicle_class vehicle_class, plate_number text, color text, photo_url text
)
language sql stable security definer set search_path = public as $$
  select pf.full_name, pr.rating, pr.total_jobs, dv.class, dv.plate_number, dv.color, dv.photo_url
  from public.trips t
  join public.providers pr on pr.id = t.driver_id
  join public.profiles pf on pf.id = pr.user_id
  left join public.driver_vehicles dv on dv.id = t.vehicle_id
  where t.id = p_trip_id and public.can_access_trip(p_trip_id);
$$;

grant execute on function public.get_trip_driver(uuid) to authenticated;
