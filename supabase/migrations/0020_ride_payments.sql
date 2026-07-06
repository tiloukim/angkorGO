-- =============================================================
-- AngkorGo Ride — R6: Fare settlement
-- On trip end, settle the fare. Cash: rider pays driver directly; the platform's
-- commission is a debit in driver_ledger. Cashless (KHQR/card): a pending payment
-- is created → escrow → release credits the driver 90% (reuses the payments engine).
-- =============================================================

create or replace function public.settle_trip(p_trip_id uuid)
returns uuid   -- payment id for cashless, null for cash
language plpgsql security definer set search_path = public as $$
declare
  v_driver uuid; v_rider uuid; v_fare numeric; v_rate numeric; v_method payment_method;
  v_commission numeric; v_pay uuid;
begin
  select driver_id, rider_id, coalesce(final_fare, est_fare), coalesce(payment_method, 'cash')
    into v_driver, v_rider, v_fare, v_method
  from public.trips
  where id = p_trip_id and status in ('matched','driver_arriving','driver_arrived','in_progress');
  if v_driver is null then raise exception 'Trip not in a completable state'; end if;
  if v_driver <> public.my_provider_id() and not public.is_admin() then
    raise exception 'Only the driver can end the trip';
  end if;

  select 1 - commission_rate into v_rate from public.providers where id = v_driver;
  v_rate := coalesce(v_rate, 0.9);

  update public.trips
    set status = 'completed', completed_at = now(), final_fare = v_fare
    where id = p_trip_id;

  if v_method = 'cash' then
    -- Driver collected the full fare in cash; owes the platform its commission.
    v_commission := round(v_fare * (1 - v_rate), 2);
    insert into public.driver_ledger (provider_id, trip_id, amount, reason)
    values (v_driver, p_trip_id, -v_commission, 'cash trip commission');
    return null;
  else
    -- Cashless: rider pays via gateway; release credits the driver wallet 90%.
    insert into public.payments (trip_id, customer_id, provider_id, amount, provider_rate, method, status)
    values (p_trip_id, v_rider, v_driver, v_fare, v_rate, v_method, 'pending')
    returning id into v_pay;
    return v_pay;
  end if;
end;
$$;

grant execute on function public.settle_trip(uuid) to authenticated;

-- Driver's net cash-commission owed (negative = owes platform).
create or replace function public.driver_ledger_balance()
returns numeric
language sql stable security invoker set search_path = public as $$
  select coalesce(sum(amount), 0) from public.driver_ledger where provider_id = public.my_provider_id();
$$;
grant execute on function public.driver_ledger_balance() to authenticated;
