-- pgTAP: RLS isolation — a customer can only see their own requests.
-- Impersonates authenticated users by setting the JWT claims RLS reads.
begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('30000000-0000-0000-0000-000000000001', 'a@test.com', '{"role":"customer"}'),
  ('30000000-0000-0000-0000-000000000002', 'b@test.com', '{"role":"customer"}');

insert into public.service_requests (id, customer_id, category, pickup_location) values
  ('30000000-0000-0000-0000-0000000000A1', '30000000-0000-0000-0000-000000000001', 'flat_tire',
   st_point(104.92, 11.55)::geography),
  ('30000000-0000-0000-0000-0000000000B1', '30000000-0000-0000-0000-000000000002', 'lockout_service',
   st_point(104.93, 11.56)::geography);

-- Impersonate customer A.
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub','30000000-0000-0000-0000-000000000001','role','authenticated')::text, true);

select is((select count(*)::int from public.service_requests), 1,
          'customer A sees exactly one request (their own)');
select is((select count(*)::int from public.service_requests
           where id = '30000000-0000-0000-0000-0000000000A1'), 1,
          'customer A can read their own request');
select is((select count(*)::int from public.service_requests
           where id = '30000000-0000-0000-0000-0000000000B1'), 0,
          'customer A cannot read customer B''s request');

-- A customer cannot insert a request on behalf of someone else (WITH CHECK).
select throws_ok($$
  insert into public.service_requests (customer_id, category, pickup_location)
  values ('30000000-0000-0000-0000-000000000002', 'tow_truck', st_point(104.9,11.5)::geography)
$$, '42501', NULL::text, 'customer A cannot create a request as customer B');

reset role;
select finish();
rollback;
