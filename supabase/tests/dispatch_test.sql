-- pgTAP: dispatch engine — radius search, widening, and atomic accept.
-- Run with: supabase test db
begin;
select plan(9);

-- ---- Fixtures (superuser context bypasses RLS) ----
-- Independence Monument, Phnom Penh ≈ (104.9219, 11.5564)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'cust@test.com',     '{"role":"customer"}'),
  ('00000000-0000-0000-0000-000000000002', 'near@test.com',     '{"role":"provider"}'),
  ('00000000-0000-0000-0000-000000000003', 'far@test.com',      '{"role":"provider"}'),
  ('00000000-0000-0000-0000-000000000004', 'offline@test.com',  '{"role":"provider"}');

-- The ensure_provider_row trigger created a providers row for each provider user.
-- Approve + bring online the two we want dispatchable.
update public.providers set status = 'approved', is_online = true
  where user_id in ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
-- provider 4 stays pending+offline (must be excluded).

-- All three offer flat_tire.
insert into public.provider_services (provider_id, category)
select id, 'flat_tire' from public.providers
where user_id in ('00000000-0000-0000-0000-000000000002',
                  '00000000-0000-0000-0000-000000000003',
                  '00000000-0000-0000-0000-000000000004');

-- Locations: near ≈ 1.5 km away, far ≈ 15 km away.
insert into public.provider_locations (provider_id, location, lat, lng)
select id, st_point(104.9350, 11.5600)::geography, 11.5600, 104.9350
  from public.providers where user_id = '00000000-0000-0000-0000-000000000002';
insert into public.provider_locations (provider_id, location, lat, lng)
select id, st_point(105.0500, 11.6500)::geography, 11.6500, 105.0500
  from public.providers where user_id = '00000000-0000-0000-0000-000000000003';

-- A flat_tire request at the monument.
insert into public.service_requests (id, customer_id, category, pickup_location)
values ('00000000-0000-0000-0000-0000000000AA',
        '00000000-0000-0000-0000-000000000001', 'flat_tire',
        st_point(104.9219, 11.5564)::geography);

-- ---- find_nearby_providers ----
select is(
  (select count(*)::int from public.find_nearby_providers('00000000-0000-0000-0000-0000000000AA', 5)),
  1, 'only the near provider is within 5 km');

select is(
  (select count(*)::int from public.find_nearby_providers('00000000-0000-0000-0000-0000000000AA', 20)),
  2, 'both approved providers are within 20 km');

-- offline/pending provider 4 never appears even at wide radius
select is(
  (select count(*)::int from public.find_nearby_providers('00000000-0000-0000-0000-0000000000AA', 50)
   where provider_id = (select id from public.providers where user_id = '00000000-0000-0000-0000-000000000004')),
  0, 'pending+offline provider is excluded');

-- ---- dispatch_request at 5 km ----
select is(public.dispatch_request('00000000-0000-0000-0000-0000000000AA'), 1, 'dispatch creates 1 offer at 5 km');
select is((select status from public.service_requests where id = '00000000-0000-0000-0000-0000000000AA'),
          'dispatching', 'request moved to dispatching');

-- ---- widen to 10, then 20 km reaches the far provider ----
select ok(public.widen_dispatch('00000000-0000-0000-0000-0000000000AA') >= 0, 'widen to 10 km runs');
select is((select current_radius_km from public.service_requests where id = '00000000-0000-0000-0000-0000000000AA'),
          10, 'radius widened to 10');
select ok(public.widen_dispatch('00000000-0000-0000-0000-0000000000AA') >= 0, 'widen to 20 km runs');

-- ---- Atomic accept: first wins, request is claimed ----
select lives_ok($$
  select public.accept_assignment((
    select id from public.service_assignments
    where request_id = '00000000-0000-0000-0000-0000000000AA'
      and provider_id = (select id from public.providers where user_id = '00000000-0000-0000-0000-000000000002')
    limit 1))
$$, 'first provider accepts successfully');

select finish();
rollback;
