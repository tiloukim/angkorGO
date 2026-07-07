-- =============================================================
-- AngkorGo Rentals/Stays — server-side booking cancellation (parity with
-- cancel_trip / cancel_order). Guest or host may cancel before completion;
-- frees the dates (exclusion constraint only guards confirmed/in_progress)
-- and reverses any unreleased payment.
-- =============================================================

create or replace function public.cancel_booking(p_booking uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_b public.bookings%rowtype; v_host uuid; v_uid uuid := auth.uid();
begin
  select * into v_b from public.bookings where id = p_booking for update;
  if v_b.id is null then raise exception 'Booking not found'; end if;
  if v_b.status in ('completed','cancelled','declined') then
    raise exception 'Booking can no longer be cancelled';
  end if;

  select host_id into v_host from public.listings where id = v_b.listing_id;
  if v_uid <> v_b.guest_id and v_uid <> v_host and not public.is_admin() then
    raise exception 'Not allowed to cancel this booking';
  end if;

  update public.bookings set status = 'cancelled' where id = p_booking;
  update public.payments
    set status = case when status = 'held' then 'refunded' else 'failed' end
    where booking_id = p_booking and status in ('pending','held');
end;
$$;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
