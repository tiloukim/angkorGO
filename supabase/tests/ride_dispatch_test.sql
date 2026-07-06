-- pgTAP: Ride dispatch — nearest-driver match, offers, atomic first-wins accept.
begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('60000000-0000-0000-0000-000000000001', 'rider@test.com',   '{"role":"customer"}'),
  ('60000000-0000-0000-0000-000000000002', 'driverA@test.com', '{"role":"provider"}'),
  ('60000000-0000-0000-0000-000000000003', 'driverB@test.com', '{"role":"provider"}');

update public.providers set status = 'approved', is_online = true
  where user_id in ('60000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003');

-- Both drivers have a verified moto near the pickup.
insert into public.driver_vehicles (provider_id, class, plate_number, verified)
select id, 'moto', 'PP-1', true from public.providers where user_id = '60000000-0000-0000-0000-000000000002';
insert into public.driver_vehicles (provider_id, class, plate_number, verified)
select id, 'moto', 'PP-2', true from public.providers where user_id = '60000000-0000-0000-0000-000000000003';

insert into public.provider_locations (provider_id, location, lat, lng)
select id, st_point(104.9250, 11.5580)::geography, 11.5580, 104.9250
  from public.providers where user_id = '60000000-0000-0000-0000-000000000002';
insert into public.provider_locations (provider_id, location, lat, lng)
select id, st_point(104.9260, 11.5585)::geography, 11.5585, 104.9260
  from public.providers where user_id = '60000000-0000-0000-0000-000000000003';

insert into public.trips (id, rider_id, class, pickup_location, dropoff_location, est_fare)
values ('60000000-0000-0000-0000-0000000000AA',
        '60000000-0000-0000-0000-000000000001', 'moto',
        st_point(104.9219, 11.5564)::geography, st_point(104.9500, 11.5700)::geography, 2.50);

select is(public.dispatch_trip('60000000-0000-0000-0000-0000000000AA'), 2, 'both nearby moto drivers offered');
select is((select status from public.trips where id = '60000000-0000-0000-0000-0000000000AA')::text,
          'searching', 'trip moved to searching');

-- Driver A accepts.
select lives_ok($$
  select public.accept_trip((select id from public.trip_offers
    where trip_id = '60000000-0000-0000-0000-0000000000AA'
      and provider_id = (select id from public.providers where user_id = '60000000-0000-0000-0000-000000000002')))
$$, 'driver A accepts');

select is((select driver_id from public.trips where id = '60000000-0000-0000-0000-0000000000AA'),
          (select id from public.providers where user_id = '60000000-0000-0000-0000-000000000002'),
          'trip assigned to driver A');

-- Driver B's stale offer is rejected.
select throws_ok($$
  select public.accept_trip((select id from public.trip_offers
    where trip_id = '60000000-0000-0000-0000-0000000000AA'
      and provider_id = (select id from public.providers where user_id = '60000000-0000-0000-0000-000000000003')))
$$, 'Trip no longer available', 'second driver blocked');

select finish();
rollback;
