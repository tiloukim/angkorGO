-- pgTAP: payment split (90/10), escrow release, and wallet credit.
begin;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('20000000-0000-0000-0000-000000000001', 'c3@test.com', '{"role":"customer"}'),
  ('20000000-0000-0000-0000-000000000002', 'pc@test.com', '{"role":"provider"}');

update public.providers set status = 'approved' where user_id = '20000000-0000-0000-0000-000000000002';

-- In-progress request assigned to the provider (precondition for invoicing).
insert into public.service_requests (id, customer_id, category, pickup_location, status, assigned_provider_id)
values ('20000000-0000-0000-0000-0000000000AA',
        '20000000-0000-0000-0000-000000000001', 'engine_diagnosis',
        st_point(104.9219, 11.5564)::geography, 'in_progress',
        (select id from public.providers where user_id = '20000000-0000-0000-0000-000000000002'));

-- Insert a payment directly to test the split trigger (compute_payment_split).
insert into public.payments (id, request_id, customer_id, provider_id, amount, provider_rate, status)
values ('20000000-0000-0000-0000-0000000000BB',
        '20000000-0000-0000-0000-0000000000AA',
        '20000000-0000-0000-0000-000000000001',
        (select id from public.providers where user_id = '20000000-0000-0000-0000-000000000002'),
        50.00, 0.900, 'held');

select is((select provider_amount   from public.payments where id = '20000000-0000-0000-0000-0000000000BB'),
          45.00, 'provider gets 90% (45.00)');
select is((select commission_amount from public.payments where id = '20000000-0000-0000-0000-0000000000BB'),
          5.00,  'AngkorGo keeps 10% (5.00)');

-- Wallet starts empty.
select is((select count(*)::int from public.wallets
           where provider_id = (select id from public.providers where user_id = '20000000-0000-0000-0000-000000000002')),
          0, 'no wallet before release');

-- Release → trigger credits the wallet and completes the request.
select lives_ok($$ select public.release_payment_admin('20000000-0000-0000-0000-0000000000BB') $$,
                'release_payment_admin runs');

select is((select balance from public.wallets
           where provider_id = (select id from public.providers where user_id = '20000000-0000-0000-0000-000000000002')),
          45.00, 'wallet credited with provider share');

select is((select status from public.service_requests where id = '20000000-0000-0000-0000-0000000000AA'),
          'completed', 'request marked completed on release');

select finish();
rollback;
