-- AngkorGo — apply migration 0022 (Vehicle Rental) to live (on 0021).
-- Safe to re-run.

drop policy if exists "listings img read" on storage.objects;
drop policy if exists "listings img write" on storage.objects;

-- =============================================================
-- AngkorGo Vehicle Rental (Turo) — booking flow on the booking core (0016).
-- Renter books date range → host confirms → payment (reuses the payments engine;
-- the host is provisioned a provider record so wallet/payout work like drivers).
-- =============================================================

-- Public bucket for listing photos.
insert into storage.buckets (id, name, public) values ('listings', 'listings', true)
  on conflict (id) do nothing;
create policy "listings img read" on storage.objects for select using (bucket_id = 'listings');
create policy "listings img write" on storage.objects for insert
  with check (bucket_id = 'listings' and auth.role() = 'authenticated');

-- Create a booking (server-authoritative totals + availability check).
create or replace function public.create_booking(
  p_listing uuid, p_start date, p_end date, p_guests integer default 1
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare l record; v_units integer; v_subtotal numeric; v_total numeric; v_status booking_status; v_id uuid;
begin
  select * into l from public.listings where id = p_listing and status = 'active';
  if l is null then raise exception 'Listing not available'; end if;
  v_units := (p_end - p_start);
  if v_units < 1 then raise exception 'Invalid dates'; end if;
  if not public.listing_available(p_listing, p_start, p_end) then
    raise exception 'Those dates are not available';
  end if;

  v_subtotal := l.price_per_unit * v_units;
  v_total := v_subtotal + l.cleaning_fee + l.deposit;
  v_status := case when l.instant_book then 'confirmed' else 'requested' end;

  insert into public.bookings (listing_id, guest_id, status, start_date, end_date, guests,
    price_per_unit, unit_count, subtotal, cleaning_fee, deposit, total_amount, currency)
  values (p_listing, auth.uid(), v_status, p_start, p_end, p_guests,
    l.price_per_unit, v_units, v_subtotal, l.cleaning_fee, l.deposit, v_total, l.currency)
  returning id into v_id;

  if v_status = 'confirmed' then perform public.create_booking_payment(v_id); end if;
  return v_id;
end;
$$;

-- Internal: create the pending payment for a booking (host earns via provider wallet).
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
  on conflict (booking_id) do nothing;
end;
$$;

create or replace function public.confirm_booking(p_booking uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_host uuid;
begin
  select l.host_id into v_host
  from public.bookings b join public.listings l on l.id = b.listing_id
  where b.id = p_booking and b.status = 'requested';
  if v_host is null then raise exception 'Booking not pending'; end if;
  if v_host <> auth.uid() and not public.is_admin() then raise exception 'Only the host can confirm'; end if;

  update public.bookings set status = 'confirmed' where id = p_booking;  -- exclusion guards overlap
  perform public.create_booking_payment(p_booking);
end;
$$;

create or replace function public.decline_booking(p_booking uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_host uuid;
begin
  select l.host_id into v_host
  from public.bookings b join public.listings l on l.id = b.listing_id
  where b.id = p_booking and b.status = 'requested';
  if v_host is null then raise exception 'Booking not pending'; end if;
  if v_host <> auth.uid() and not public.is_admin() then raise exception 'Only the host can decline'; end if;
  update public.bookings set status = 'declined' where id = p_booking;
end;
$$;

grant execute on function public.create_booking(uuid, date, date, integer) to authenticated;
grant execute on function public.confirm_booking(uuid) to authenticated;
grant execute on function public.decline_booking(uuid) to authenticated;
