-- =============================================================
-- AngkorGo — RENTAL + STAY demo seed (TEST/DEV ONLY)
-- Paste this whole file into the Supabase SQL Editor and Run once.
--
-- Creates a demo host + two active listings (one vehicle for Rentals, one place
-- for Stays), both with instant_book = true. Because create_booking auto-confirms
-- instant-book listings and creates the pending payment, you can test the whole
-- booking + payment flow SOLO — no host device or triggers needed:
--   Rent a vehicle / Stay → pick the demo listing → choose dates → Book →
--   auto-confirmed → pay on the booking screen (KHQR → Simulate → Confirm&release).
--
-- Tip: pick FUTURE dates. If you re-test with the same dates you'll get "those
-- dates are not available" (the confirmed booking blocks overlap) — just pick a
-- different range.
--
-- Teardown at the bottom. Host user: d0000000-0000-4000-a000-000000000004
-- =============================================================

-- ---------- 1. Auth user (host) ----------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000','d0000000-0000-4000-a000-000000000004','authenticated','authenticated',
  'demo.host@angkorgo.app', extensions.crypt('DemoHost!2026', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}','{"full_name":"Demo Host","role":"customer"}',
  now(), now(), '', '', '', ''
) on conflict (id) do nothing;

insert into public.profiles (id, full_name, role, preferred_language, onboarded)
values ('d0000000-0000-4000-a000-000000000004', 'Demo Host', 'customer', 'en', true)
on conflict (id) do update set onboarded = true;

-- ---------- 2. Vehicle listing (Rentals) ----------
insert into public.listings (id, host_id, type, title, description, price_per_unit, currency,
  deposit, cleaning_fee, location, lat, lng, address, attributes, photos, instant_book, status, rating)
values (
  'e0000000-0000-4000-a000-000000000010', 'd0000000-0000-4000-a000-000000000004', 'vehicle',
  'Toyota Vios 2022 (Automatic)', 'Clean, fuel-efficient sedan — demo listing for testing.',
  25.00, 'USD', 50.00, 0.00,
  st_point(104.9219, 11.5564)::geography, 11.5564, 104.9219, 'Phnom Penh',
  '{"make":"Toyota","model":"Vios","year":2022,"seats":4,"transmission":"Automatic","plate":"2CA-9999"}'::jsonb,
  '{}', true, 'active', 4.8)
on conflict (id) do update set status = 'active', instant_book = true;

-- ---------- 3. Place listing (Stays) ----------
insert into public.listings (id, host_id, type, title, description, price_per_unit, currency,
  deposit, cleaning_fee, location, lat, lng, address, attributes, photos, instant_book, status, rating)
values (
  'e0000000-0000-4000-a000-000000000011', 'd0000000-0000-4000-a000-000000000004', 'place',
  'Riverside Apartment · 2BR', 'Bright 2-bedroom apartment near the riverside — demo listing for testing.',
  40.00, 'USD', 20.00, 5.00,
  st_point(104.9282, 11.5645)::geography, 11.5645, 104.9282, 'Riverside, Phnom Penh',
  '{"beds":2,"baths":1,"max_guests":4,"amenities":["WiFi","Air-con","Kitchen","Parking"]}'::jsonb,
  '{}', true, 'active', 4.7)
on conflict (id) do update set status = 'active', instant_book = true;

-- =============================================================
-- TEARDOWN
-- =============================================================
--   delete from public.bookings where listing_id in
--     ('e0000000-0000-4000-a000-000000000010','e0000000-0000-4000-a000-000000000011');
--   delete from auth.users where id = 'd0000000-0000-4000-a000-000000000004';
--   -- (profile + listings cascade from the host delete)
