-- pgTAP: Booking core — availability + no-double-booking exclusion.
begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('50000000-0000-0000-0000-000000000001', 'host@test.com',  '{"role":"provider"}'),
  ('50000000-0000-0000-0000-000000000002', 'guest@test.com', '{"role":"customer"}');

insert into public.listings (id, host_id, type, title, price_per_unit, status)
values ('50000000-0000-0000-0000-0000000000AA',
        '50000000-0000-0000-0000-000000000001', 'place', 'Riverside apartment', 25.00, 'active');

select is(public.listing_available('50000000-0000-0000-0000-0000000000AA', '2026-08-01', '2026-08-05'),
          true, 'listing available before any booking');

insert into public.bookings
  (id, listing_id, guest_id, status, start_date, end_date, price_per_unit, unit_count, subtotal, total_amount)
values ('50000000-0000-0000-0000-0000000000BB',
        '50000000-0000-0000-0000-0000000000AA', '50000000-0000-0000-0000-000000000002',
        'confirmed', '2026-08-02', '2026-08-06', 25.00, 4, 100.00, 100.00);

select is(public.listing_available('50000000-0000-0000-0000-0000000000AA', '2026-08-03', '2026-08-07'),
          false, 'overlapping range is unavailable');
select is(public.listing_available('50000000-0000-0000-0000-0000000000AA', '2026-08-10', '2026-08-12'),
          true, 'non-overlapping range is available');

-- A second overlapping confirmed booking is rejected by the exclusion constraint.
select throws_ok(
  $$ insert into public.bookings
       (listing_id, guest_id, status, start_date, end_date, price_per_unit, unit_count, subtotal, total_amount)
     values ('50000000-0000-0000-0000-0000000000AA', '50000000-0000-0000-0000-000000000002',
             'confirmed', '2026-08-04', '2026-08-08', 25.00, 4, 100.00, 100.00) $$,
  '23P01', NULL::text, 'overlapping confirmed booking rejected');

select finish();
rollback;
