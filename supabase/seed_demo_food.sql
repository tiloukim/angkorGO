-- =============================================================
-- AngkorGo — FOOD demo seed (TEST/DEV ONLY)
-- Paste this whole file into the Supabase SQL Editor and Run once.
--
-- Creates a demo restaurant (with menu) + a demo courier, both fixed at Phnom
-- Penh, plus two demo-only triggers so any order to the demo restaurant is
-- auto-accepted, dispatched, and auto-taken by the courier — no second device.
--   1. demo_food_autoflow      : on order INSERT for the demo restaurant, mark
--      ready + dispatch couriers (and free the courier from any prior demo order).
--   2. demo_courier_autoaccept : on courier_offer INSERT for the demo courier,
--      call accept_order_offer() → order goes to 'courier_assigned'.
--
-- Solo test: Food → "Demo Angkor Kitchen" → add items → checkout (KHQR or cash)
-- → order jumps to courier_assigned. Use the "Advance order" helper below to step
-- picked_up → delivering → delivered, then pay on the order screen.
--
-- Couriers match near the RESTAURANT (fixed PP), so this works from anywhere.
-- Teardown SQL at the bottom. Remove before prod.
-- Restaurant id: e0000000-0000-4000-a000-000000000001
-- Owner  user:   d0000000-0000-4000-a000-000000000003
-- Courier user:  d0000000-0000-4000-a000-000000000002
-- =============================================================

-- ---------- 1. Auth users (restaurant owner + courier) ----------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000','d0000000-0000-4000-a000-000000000003','authenticated','authenticated',
   'demo.restaurant@angkorgo.app', extensions.crypt('DemoResto!2026', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}','{"full_name":"Demo Restaurant","role":"customer"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','d0000000-0000-4000-a000-000000000002','authenticated','authenticated',
   'demo.courier@angkorgo.app', extensions.crypt('DemoCourier!2026', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}','{"full_name":"Demo Courier","role":"provider"}',
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- ---------- 2. Profiles ----------
insert into public.profiles (id, full_name, role, preferred_language, onboarded) values
  ('d0000000-0000-4000-a000-000000000003', 'Demo Restaurant', 'customer', 'en', true),
  ('d0000000-0000-4000-a000-000000000002', 'Demo Courier',    'provider', 'en', true)
on conflict (id) do update set onboarded = true;

-- ---------- 3. Demo restaurant + menu ----------
insert into public.restaurants (id, owner_id, name, description, cuisine, address, location, lat, lng, is_open, status, rating)
values (
  'e0000000-0000-4000-a000-000000000001',
  'd0000000-0000-4000-a000-000000000003',
  'Demo Angkor Kitchen', 'Authentic Khmer favourites — demo restaurant for testing.',
  'Khmer', 'St 240, Phnom Penh',
  st_point(104.9219, 11.5564)::geography, 11.5564, 104.9219, true, 'active', 4.8)
on conflict (id) do update set is_open = true, status = 'active', location = excluded.location;

delete from public.menu_items where restaurant_id = 'e0000000-0000-4000-a000-000000000001';
insert into public.menu_items (restaurant_id, name, description, price, category, available)
select 'e0000000-0000-4000-a000-000000000001', m.name, m.descr, m.price, m.cat, true
from (values
  ('Beef Lok Lak',        'Wok-tossed beef, tomato, onion, pepper-lime dip', 4.50, 'Mains'),
  ('Fish Amok',           'Steamed fish curry mousse in banana leaf',        5.00, 'Mains'),
  ('Chicken Fried Rice',  'Khmer-style fried rice with chicken',             3.50, 'Mains'),
  ('Num Banh Chok',       'Rice noodles, green fish curry, fresh herbs',     3.00, 'Noodles'),
  ('Iced Coffee',         'Cambodian iced coffee with condensed milk',       1.50, 'Drinks')
) as m(name, descr, price, cat);

-- ---------- 4. Demo courier (approved, online, at the restaurant) ----------
insert into public.providers (user_id, status, is_online, business_name, rating, approved_at)
values ('d0000000-0000-4000-a000-000000000002', 'approved', true, 'Demo Courier', 4.9, now())
on conflict (user_id) do update set status = 'approved', is_online = true, approved_at = now();

insert into public.provider_locations (provider_id, location, updated_at)
select p.id, st_point(104.9219, 11.5564)::geography, now()
from public.providers p where p.user_id = 'd0000000-0000-4000-a000-000000000002'
on conflict (provider_id) do update set location = excluded.location, updated_at = now();

-- ---------- 5. DEMO trigger: auto-accept + dispatch demo orders ----------
create or replace function public.demo_food_autoflow()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_courier uuid;
begin
  if new.restaurant_id <> 'e0000000-0000-4000-a000-000000000001' then return new; end if;
  select id into v_courier from public.providers where user_id = 'd0000000-0000-4000-a000-000000000002';

  -- free the demo courier from any lingering demo order
  update public.orders set status = 'delivered', delivered_at = now()
    where courier_id = v_courier and status in ('courier_assigned','picked_up','delivering');

  -- restaurant accepts + marks ready + dispatch couriers
  update public.orders set status = 'ready', accepted_at = now(), ready_at = now(), last_dispatch_at = now()
    where id = new.id;
  insert into public.courier_offers (order_id, provider_id, distance_km, eta_minutes)
    select new.id, nc.provider_id, nc.distance_km, nc.eta_minutes
    from public.find_nearby_couriers(new.id, 5) nc
    on conflict (order_id, provider_id) do nothing;
  return new;
end; $$;
drop trigger if exists trg_demo_food_autoflow on public.orders;
create trigger trg_demo_food_autoflow after insert on public.orders
  for each row execute function public.demo_food_autoflow();

-- ---------- 6. DEMO trigger: courier auto-accepts its offer ----------
create or replace function public.demo_courier_autoaccept()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_courier uuid;
begin
  select id into v_courier from public.providers where user_id = 'd0000000-0000-4000-a000-000000000002';
  if new.provider_id = v_courier and new.status = 'offered' then
    perform public.accept_order_offer(new.id);
  end if;
  return new;
end; $$;
drop trigger if exists trg_demo_courier_autoaccept on public.courier_offers;
create trigger trg_demo_courier_autoaccept after insert on public.courier_offers
  for each row execute function public.demo_courier_autoaccept();

-- =============================================================
-- OPTIONAL HELPER — advance your latest active order one step
-- (courier_assigned → picked_up → delivering → delivered). Uses advance_order so
-- the courier's delivery fee is credited on 'delivered'. Run once per step.
-- =============================================================
--   select public.advance_order(id, (case status
--     when 'courier_assigned' then 'picked_up'
--     when 'picked_up'        then 'delivering'
--     when 'delivering'       then 'delivered' end)::order_status)
--   from public.orders
--   where status in ('courier_assigned','picked_up','delivering')
--   order by placed_at desc limit 1;

-- =============================================================
-- TEARDOWN
-- =============================================================
--   drop trigger if exists trg_demo_food_autoflow      on public.orders;
--   drop trigger if exists trg_demo_courier_autoaccept on public.courier_offers;
--   drop function if exists public.demo_food_autoflow();
--   drop function if exists public.demo_courier_autoaccept();
--   delete from public.orders where restaurant_id = 'e0000000-0000-4000-a000-000000000001';
--   delete from auth.users where id in
--     ('d0000000-0000-4000-a000-000000000003','d0000000-0000-4000-a000-000000000002');
--   -- (restaurant/menu/profile/provider cascade from the owner/courier deletes)
