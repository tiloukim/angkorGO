-- pgTAP: AngkorGo Ride (R1) schema — fare seed, trip defaults, status history.
begin;
select plan(4);

-- Fare config seeded for the three launch classes.
select is((select count(*)::int from public.fare_config), 3, 'three fare classes seeded');
select is((select base_fare from public.fare_config where class = 'moto'), 0.50, 'moto base fare = 0.50');

-- A trip defaults to 'requested' and logs its first status.
insert into auth.users (id, email, raw_user_meta_data) values
  ('40000000-0000-0000-0000-000000000001', 'rider@test.com', '{"role":"customer"}');

insert into public.trips (id, rider_id, class, pickup_location, dropoff_location, est_fare)
values ('40000000-0000-0000-0000-0000000000AA',
        '40000000-0000-0000-0000-000000000001', 'moto',
        st_point(104.9200, 11.5500)::geography,
        st_point(104.9500, 11.5700)::geography, 3.00);

select is((select status from public.trips where id = '40000000-0000-0000-0000-0000000000AA')::text,
          'requested', 'new trip defaults to requested');
select is((select count(*)::int from public.trip_status_history
           where trip_id = '40000000-0000-0000-0000-0000000000AA'),
          1, 'trip status history row auto-created');

select finish();
rollback;
