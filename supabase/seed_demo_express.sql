-- =============================================================
-- AngkorGo — EXPRESS (parcel) demo seed (TEST/DEV ONLY)
-- Paste into the Supabase SQL Editor and Run once (after migration 0033).
--
-- Creates a dedicated demo EXPRESS COURIER + two demo-only triggers so any
-- parcel you send is instantly matched to a courier next to the pickup, from
-- anywhere:
--   1. demo_parcel_teleport   : on parcel INSERT, moves the express courier
--      ~250m from the pickup (and frees it from any prior demo parcel).
--   2. demo_parcel_autoaccept : on parcel_offer INSERT for the express courier,
--      calls accept_parcel_offer() → status 'courier_assigned'.
--
-- Solo test: Home → Express → fill pickup/recipient/size → Send → instantly
-- assigned. Advance + deliver with the HELPERS below (the deliver helper uses
-- the parcel's own 4-digit code to satisfy proof-of-delivery). Then pay on the
-- tracking screen (if you chose KHQR).
--
-- Uses its OWN courier (separate from the food demo courier) so the two don't
-- interfere. Teardown at the bottom. Courier user: d0000000-0000-4000-a000-000000000005
-- =============================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000','d0000000-0000-4000-a000-000000000005','authenticated','authenticated',
  'demo.express@angkorgo.app', extensions.crypt('DemoExpress!2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}','{"full_name":"Demo Express Courier","role":"provider"}',
  now(), now(), '', '', '', ''
) on conflict (id) do nothing;

insert into public.profiles (id, full_name, role, preferred_language, onboarded)
values ('d0000000-0000-4000-a000-000000000005', 'Demo Express Courier', 'provider', 'en', true)
on conflict (id) do update set onboarded = true;

insert into public.providers (user_id, status, is_online, business_name, rating, approved_at)
values ('d0000000-0000-4000-a000-000000000005', 'approved', true, 'Demo Express Courier', 4.9, now())
on conflict (user_id) do update set status = 'approved', is_online = true, approved_at = now();

insert into public.provider_locations (provider_id, location, updated_at)
select p.id, st_point(104.9219, 11.5564)::geography, now()
from public.providers p where p.user_id = 'd0000000-0000-4000-a000-000000000005'
on conflict (provider_id) do update set location = excluded.location, updated_at = now();

-- teleport the express courier next to each new parcel pickup
create or replace function public.demo_parcel_teleport()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_courier uuid; v_lat double precision; v_lng double precision;
begin
  select id into v_courier from public.providers where user_id = 'd0000000-0000-4000-a000-000000000005';
  if v_courier is null then return new; end if;
  update public.parcels set status = 'delivered', delivered_at = now()
    where courier_id = v_courier and status in ('courier_assigned','picked_up','delivering');
  v_lat := coalesce(new.pickup_lat, st_y(new.pickup_location::geometry));
  v_lng := coalesce(new.pickup_lng, st_x(new.pickup_location::geometry));
  update public.providers set is_online = true where id = v_courier;
  insert into public.provider_locations (provider_id, location, updated_at)
    values (v_courier, st_point(v_lng + 0.0018, v_lat + 0.0018)::geography, now())
    on conflict (provider_id) do update set location = excluded.location, updated_at = now();
  return new;
end; $$;
drop trigger if exists trg_demo_parcel_teleport on public.parcels;
create trigger trg_demo_parcel_teleport after insert on public.parcels
  for each row execute function public.demo_parcel_teleport();

-- express courier auto-accepts its offer
create or replace function public.demo_parcel_autoaccept()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_courier uuid;
begin
  select id into v_courier from public.providers where user_id = 'd0000000-0000-4000-a000-000000000005';
  if new.provider_id = v_courier and new.status = 'offered' then
    perform public.accept_parcel_offer(new.id);
  end if;
  return new;
end; $$;
drop trigger if exists trg_demo_parcel_autoaccept on public.parcel_offers;
create trigger trg_demo_parcel_autoaccept after insert on public.parcel_offers
  for each row execute function public.demo_parcel_autoaccept();

-- =============================================================
-- HELPERS (run while testing)
-- =============================================================
-- Advance the latest parcel one step (courier_assigned → picked_up → delivering):
--   select public.advance_parcel(id, (case status
--     when 'courier_assigned' then 'picked_up'
--     when 'picked_up'        then 'delivering' end)::parcel_status)
--   from public.parcels where status in ('courier_assigned','picked_up')
--   order by requested_at desc limit 1;
--
-- Deliver with proof (uses the parcel's own 4-digit code):
--   select public.deliver_parcel(id, delivery_code, null)
--   from public.parcels where status = 'delivering' order by requested_at desc limit 1;

-- =============================================================
-- TEARDOWN
-- =============================================================
--   drop trigger if exists trg_demo_parcel_teleport   on public.parcels;
--   drop trigger if exists trg_demo_parcel_autoaccept on public.parcel_offers;
--   drop function if exists public.demo_parcel_teleport();
--   drop function if exists public.demo_parcel_autoaccept();
--   delete from public.parcels where courier_id in
--     (select id from public.providers where user_id = 'd0000000-0000-4000-a000-000000000005');
--   delete from auth.users where id = 'd0000000-0000-4000-a000-000000000005';
