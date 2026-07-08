-- =============================================================
-- AngkorGo — DEMO DRIVER seed (TEST/DEV ONLY)
-- Paste this whole file into the Supabase SQL Editor and Run once.
--
-- Creates one approved, online demo driver (moto + tuktuk + car) and two
-- DEMO-ONLY triggers so that ANY ride request — from anywhere in the world —
-- instantly matches this driver right next to the pickup:
--   1. trg_demo_driver_teleport  : on trip INSERT, moves the demo driver ~250m
--      from the pickup and frees it from any prior demo trip.
--   2. trg_demo_driver_autoaccept: on trip_offer INSERT for the demo driver,
--      calls accept_trip() so the trip goes straight to 'matched'.
--
-- Solo phone testing: Ride → Where to? → pick a destination → Request →
-- you'll be matched immediately and see the driver on the tracking map.
--
-- Teardown SQL is at the BOTTOM (commented). Do NOT ship these triggers to prod.
-- Demo driver id: d0000000-0000-4000-a000-000000000001
-- =============================================================

-- ---------- 1. Auth user (FK anchor for profiles/providers) ----------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'd0000000-0000-4000-a000-000000000001',
  'authenticated', 'authenticated',
  'demo.driver@angkorgo.app',
  extensions.crypt('DemoDriver!2026', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Demo Driver","role":"provider","preferred_language":"en"}',
  now(), now(), '', '', '', ''
) on conflict (id) do nothing;

-- ---------- 2. Profile + provider (explicit, in case triggers differ) ----------
insert into public.profiles (id, full_name, role, preferred_language, onboarded)
values ('d0000000-0000-4000-a000-000000000001', 'Demo Driver', 'provider', 'en', true)
on conflict (id) do update set role = 'provider', onboarded = true;

insert into public.providers (user_id, status, is_online, business_name, rating, approved_at)
values ('d0000000-0000-4000-a000-000000000001', 'approved', true, 'Demo Driver', 4.9, now())
on conflict (user_id) do update set status = 'approved', is_online = true, approved_at = now();

-- ---------- 3. Vehicles (one per class, verified + active) ----------
delete from public.driver_vehicles dv using public.providers p
 where dv.provider_id = p.id and p.user_id = 'd0000000-0000-4000-a000-000000000001';

insert into public.driver_vehicles (provider_id, class, make_model, color, plate_number, seats, verified, active)
select p.id, v.class, v.mm, 'White', v.plate, v.seats, true, true
from public.providers p
cross join (values
  ('moto'::vehicle_class,   'Honda Dream',  '2CA-1111', 2),
  ('tuktuk'::vehicle_class, 'Bajaj RE',     '2CA-2222', 4),
  ('car'::vehicle_class,    'Toyota Vios',  '2CA-3333', 4)
) as v(class, mm, plate, seats)
where p.user_id = 'd0000000-0000-4000-a000-000000000001';

-- ---------- 4. Initial location (Phnom Penh; teleported per-trip anyway) ----------
insert into public.provider_locations (provider_id, location, updated_at)
select p.id, st_point(104.9219, 11.5564)::geography, now()
from public.providers p where p.user_id = 'd0000000-0000-4000-a000-000000000001'
on conflict (provider_id) do update set location = excluded.location, updated_at = now();

-- ---------- 5. DEMO trigger: teleport driver next to each new pickup ----------
create or replace function public.demo_driver_teleport()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_demo uuid; v_lat double precision; v_lng double precision;
begin
  select id into v_demo from public.providers
    where user_id = 'd0000000-0000-4000-a000-000000000001';
  if v_demo is null then return new; end if;

  -- free the demo driver from any lingering demo trip so it can match again
  update public.trips set status = 'completed', completed_at = now()
    where driver_id = v_demo
      and status in ('matched','driver_arriving','driver_arrived','in_progress');

  v_lat := coalesce(new.pickup_lat, st_y(new.pickup_location::geometry));
  v_lng := coalesce(new.pickup_lng, st_x(new.pickup_location::geometry));

  update public.providers set is_online = true where id = v_demo;
  insert into public.provider_locations (provider_id, location, updated_at)
    values (v_demo, st_point(v_lng + 0.0018, v_lat + 0.0018)::geography, now())
    on conflict (provider_id) do update set location = excluded.location, updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_demo_driver_teleport on public.trips;
create trigger trg_demo_driver_teleport after insert on public.trips
  for each row execute function public.demo_driver_teleport();

-- ---------- 6. DEMO trigger: auto-accept the offer for the demo driver ----------
create or replace function public.demo_driver_autoaccept()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_demo uuid;
begin
  select id into v_demo from public.providers
    where user_id = 'd0000000-0000-4000-a000-000000000001';
  if new.provider_id = v_demo and new.status = 'offered' then
    perform public.accept_trip(new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_demo_driver_autoaccept on public.trip_offers;
create trigger trg_demo_driver_autoaccept after insert on public.trip_offers
  for each row execute function public.demo_driver_autoaccept();

-- =============================================================
-- OPTIONAL HELPERS (run individually while testing)
-- =============================================================
-- Advance your most recent matched trip one step (matched → arriving →
-- arrived → in_progress → completed) to exercise the full rider UI:
--
--   update public.trips set status = (case status
--     when 'matched'         then 'driver_arriving'
--     when 'driver_arriving' then 'driver_arrived'
--     when 'driver_arrived'  then 'in_progress'
--     when 'in_progress'     then 'completed' end)::trip_status,
--     started_at   = coalesce(started_at,  case when status='driver_arrived' then now() end),
--     completed_at = coalesce(completed_at, case when status='in_progress'   then now() end)
--   where id = (select id from public.trips
--               where status in ('matched','driver_arriving','driver_arrived','in_progress')
--               order by requested_at desc limit 1);

-- =============================================================
-- TEARDOWN (removes the demo driver + triggers)
-- =============================================================
--   drop trigger if exists trg_demo_driver_teleport   on public.trips;
--   drop trigger if exists trg_demo_driver_autoaccept on public.trip_offers;
--   drop function if exists public.demo_driver_teleport();
--   drop function if exists public.demo_driver_autoaccept();
--   delete from public.trips where driver_id in
--     (select id from public.providers where user_id = 'd0000000-0000-4000-a000-000000000001');
--   delete from auth.users where id = 'd0000000-0000-4000-a000-000000000001';  -- cascades to profile/provider/vehicles/location
