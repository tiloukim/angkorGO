-- pgTAP: two providers offered the same request — only the first accept wins.
-- Guards against the double-assignment race (SELECT … FOR UPDATE in accept_assignment).
begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-0000-0000-000000000001', 'c2@test.com',  '{"role":"customer"}'),
  ('10000000-0000-0000-0000-000000000002', 'pa@test.com',  '{"role":"provider"}'),
  ('10000000-0000-0000-0000-000000000003', 'pb@test.com',  '{"role":"provider"}');

update public.providers set status = 'approved', is_online = true
  where user_id in ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003');

insert into public.provider_services (provider_id, category)
select id, 'tow_truck' from public.providers
where user_id in ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003');

-- Both providers ~same spot, both within 5 km of the request.
insert into public.provider_locations (provider_id, location, lat, lng)
select id, st_point(104.9250, 11.5580)::geography, 11.5580, 104.9250
  from public.providers where user_id = '10000000-0000-0000-0000-000000000002';
insert into public.provider_locations (provider_id, location, lat, lng)
select id, st_point(104.9260, 11.5585)::geography, 11.5585, 104.9260
  from public.providers where user_id = '10000000-0000-0000-0000-000000000003';

insert into public.service_requests (id, customer_id, category, pickup_location)
values ('10000000-0000-0000-0000-0000000000AA',
        '10000000-0000-0000-0000-000000000001', 'tow_truck',
        st_point(104.9219, 11.5564)::geography);

select is(public.dispatch_request('10000000-0000-0000-0000-0000000000AA'), 2, 'both providers offered');

-- Provider A accepts.
select lives_ok($$
  select public.accept_assignment((
    select id from public.service_assignments
    where request_id = '10000000-0000-0000-0000-0000000000AA'
      and provider_id = (select id from public.providers where user_id = '10000000-0000-0000-0000-000000000002')))
$$, 'provider A accepts');

-- Provider B's now-stale offer must be rejected by the guard.
select throws_ok($$
  select public.accept_assignment((
    select id from public.service_assignments
    where request_id = '10000000-0000-0000-0000-0000000000AA'
      and provider_id = (select id from public.providers where user_id = '10000000-0000-0000-0000-000000000003')))
$$, 'Request no longer available', 'second accept is blocked');

-- The other outstanding offer was auto-expired.
select is(
  (select status from public.service_assignments
   where request_id = '10000000-0000-0000-0000-0000000000AA'
     and provider_id = (select id from public.providers where user_id = '10000000-0000-0000-0000-000000000003')),
  'expired', 'losing offer is expired');

select finish();
rollback;
