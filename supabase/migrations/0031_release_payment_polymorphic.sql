-- =============================================================
-- Fix: release_payment / release_payment_admin only handled rescue payments
-- (service_requests via request_id). Ride payments carry trip_id with a NULL
-- request_id, so release raised "Payment not in a releasable state" and the
-- customer's "Confirm & release" button failed silently.
--
-- Make both releases polymorphic: release the payment, then complete whichever
-- source it belongs to (service_request OR trip). Mirrors the payments
-- num_nonnulls(request_id, trip_id)=1 constraint from 0013.
-- =============================================================

-- Customer- (or admin-) initiated release.
create or replace function public.release_payment(p_payment_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_customer uuid; v_request uuid; v_trip uuid;
begin
  select customer_id, request_id, trip_id into v_customer, v_request, v_trip
  from public.payments where id = p_payment_id and status = 'held';
  if v_customer is null then
    raise exception 'Payment not in a releasable state';
  end if;
  if v_customer <> auth.uid() and not public.is_admin() then
    raise exception 'Only the customer or an admin may release payment';
  end if;

  update public.payments set status = 'released' where id = p_payment_id;
  if v_request is not null then
    update public.service_requests set status = 'completed' where id = v_request;
  elsif v_trip is not null then
    update public.trips set status = 'completed', completed_at = coalesce(completed_at, now())
      where id = v_trip;
  end if;
end;
$$;

-- Service-role release (payment webhook auto-release).
create or replace function public.release_payment_admin(p_payment_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_request uuid; v_trip uuid;
begin
  select request_id, trip_id into v_request, v_trip
  from public.payments where id = p_payment_id and status = 'held';
  if not found then return; end if;

  update public.payments set status = 'released' where id = p_payment_id;
  if v_request is not null then
    update public.service_requests set status = 'completed' where id = v_request;
  elsif v_trip is not null then
    update public.trips set status = 'completed', completed_at = coalesce(completed_at, now())
      where id = v_trip;
  end if;
end;
$$;

-- Preserve the 0011 grants (service-role only for the admin variant).
revoke execute on function public.release_payment_admin(uuid) from public, anon, authenticated;
grant execute on function public.release_payment_admin(uuid) to service_role;
