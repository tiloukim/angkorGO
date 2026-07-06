-- =============================================================
-- AngkorGo — Demo seed for App Store / Play review
-- Creates demo accounts + a populated environment so reviewers see a working app.
-- Run ONCE in the Supabase SQL Editor. Idempotent (on conflict do nothing).
--
-- Emails use your Gmail +alias so every OTP code arrives in tiloukim@gmail.com.
-- To use different emails, find/replace below before running.
--   customer : tiloukim+customer@gmail.com   (reviewers log in here)
--   driver   : tiloukim+driver@gmail.com      (approved provider, online)
--   host     : tiloukim+host@gmail.com        (vehicle + place listings)
--   merchant : tiloukim+merchant@gmail.com    (restaurant + menu)
-- Admin is your existing tiloukim@gmail.com.
-- =============================================================

-- ---------- Auth users (confirmed; OTP login works) ----------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('00000000-0000-0000-0000-000000000000','a1111111-0000-4000-8000-000000000001','authenticated','authenticated','tiloukim+customer@gmail.com', crypt('AngkorGo-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"role":"customer","full_name":"Demo Customer"}'),
 ('00000000-0000-0000-0000-000000000000','a1111111-0000-4000-8000-000000000002','authenticated','authenticated','tiloukim+driver@gmail.com',   crypt('AngkorGo-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"role":"provider","full_name":"Demo Driver"}'),
 ('00000000-0000-0000-0000-000000000000','a1111111-0000-4000-8000-000000000003','authenticated','authenticated','tiloukim+host@gmail.com',     crypt('AngkorGo-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"role":"customer","full_name":"Demo Host"}'),
 ('00000000-0000-0000-0000-000000000000','a1111111-0000-4000-8000-000000000004','authenticated','authenticated','tiloukim+merchant@gmail.com', crypt('AngkorGo-demo', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{"role":"customer","full_name":"Demo Merchant"}')
on conflict (id) do nothing;

-- Email identities (so GoTrue recognizes the email login).
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.id in ('a1111111-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000002',
               'a1111111-0000-4000-8000-000000000003','a1111111-0000-4000-8000-000000000004')
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

-- Profiles get created by the handle_new_user trigger; ensure onboarded.
update public.profiles set onboarded = true
where id in ('a1111111-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000002',
             'a1111111-0000-4000-8000-000000000003','a1111111-0000-4000-8000-000000000004');

-- ---------- Driver: approved, online, with a verified moto + rescue services ----------
update public.providers set status = 'approved', is_online = true, business_name = 'Demo Driver'
where user_id = 'a1111111-0000-4000-8000-000000000002';

insert into public.driver_vehicles (provider_id, class, make_model, plate_number, color, verified)
select id, 'moto', 'Honda Dream', 'PP-1234', 'Black', true
from public.providers where user_id = 'a1111111-0000-4000-8000-000000000002'
on conflict do nothing;

insert into public.provider_services (provider_id, category)
select id, c from public.providers p
cross join (values ('flat_tire'::service_category), ('tow_truck'::service_category), ('battery_jump_start'::service_category)) as x(c)
where p.user_id = 'a1111111-0000-4000-8000-000000000002'
on conflict (provider_id, category) do nothing;

-- Driver location near Independence Monument, Phnom Penh.
insert into public.provider_locations (provider_id, location, lat, lng)
select id, st_point(104.9235, 11.5575)::geography, 11.5575, 104.9235
from public.providers where user_id = 'a1111111-0000-4000-8000-000000000002'
on conflict (provider_id) do update set location = excluded.location, lat = excluded.lat, lng = excluded.lng;

-- ---------- Host: a vehicle listing + a place listing ----------
insert into public.listings (id, host_id, type, title, description, price_per_unit, deposit, currency, address, lat, lng, status, instant_book, attributes)
values
 ('b2222222-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000003','vehicle','Toyota Camry 2020','Comfortable sedan, great for city trips.', 35.00, 100.00, 'USD', 'Phnom Penh', 11.556, 104.928, 'active', true,  '{"seats":5,"transmission":"auto","year":2020}'),
 ('b2222222-0000-4000-8000-000000000002','a1111111-0000-4000-8000-000000000003','place','Riverside Studio Apartment','Cozy studio near the riverside with fast wifi.', 28.00, 50.00, 'USD', 'Daun Penh, Phnom Penh', 11.571, 104.931, 'active', true, '{"beds":1,"baths":1,"max_guests":2,"amenities":["Wifi","A/C","Kitchen"]}')
on conflict (id) do nothing;

-- ---------- Merchant: a restaurant + menu ----------
insert into public.restaurants (id, owner_id, name, description, cuisine, address, location, lat, lng, is_open, status)
values ('c3333333-0000-4000-8000-000000000001','a1111111-0000-4000-8000-000000000004','Angkor Kitchen','Authentic Khmer food.', 'Khmer', 'Phnom Penh', st_point(104.9200, 11.5540)::geography, 11.5540, 104.9200, true, 'active')
on conflict (id) do nothing;

insert into public.menu_items (restaurant_id, name, description, price, category)
select 'c3333333-0000-4000-8000-000000000001', n, d, p, cat
from (values
  ('Fish Amok', 'Steamed curried fish in banana leaf', 4.50, 'Mains'),
  ('Lok Lak', 'Stir-fried beef with lime-pepper sauce', 5.00, 'Mains'),
  ('Num Banh Chok', 'Khmer rice noodles with green curry', 3.00, 'Mains'),
  ('Iced Coffee', 'Cambodian iced coffee', 1.50, 'Drinks')
) as m(n, d, p, cat)
where not exists (select 1 from public.menu_items where restaurant_id = 'c3333333-0000-4000-8000-000000000001');
