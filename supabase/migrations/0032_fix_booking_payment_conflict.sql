-- =============================================================
-- Fix: create_booking failed with "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification".
--
-- create_booking_payment (0022) does `insert ... on conflict (booking_id)`, but
-- the booking uniqueness is a PARTIAL index (idx_payments_booking, 0016:
-- `... where booking_id is not null`). Postgres won't infer a partial index from
-- a bare column list, so ON CONFLICT must repeat the predicate. Every instant-book
-- booking (and every host-confirmed one) hit this. Add the `where` clause.
-- Function body otherwise unchanged from 0022.
-- =============================================================

create or replace function public.create_booking_payment(p_booking uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_host uuid; v_guest uuid; v_total numeric; v_provider uuid; v_rate numeric;
begin
  select b.guest_id, b.total_amount, l.host_id into v_guest, v_total, v_host
  from public.bookings b join public.listings l on l.id = b.listing_id where b.id = p_booking;

  -- Hosts earn on the platform → ensure they have a provider record + wallet.
  insert into public.providers (user_id, status) values (v_host, 'approved')
    on conflict (user_id) do nothing;
  select id, 1 - commission_rate into v_provider, v_rate from public.providers where user_id = v_host;

  insert into public.payments (booking_id, customer_id, provider_id, amount, provider_rate, status)
  values (p_booking, v_guest, v_provider, v_total, coalesce(v_rate, 0.9), 'pending')
  on conflict (booking_id) where booking_id is not null do nothing;
end;
$$;
