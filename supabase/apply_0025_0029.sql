-- =============================================================
-- BUNDLE: migrations 0025-0029 — paste this whole file into the
-- Supabase SQL Editor and Run ONCE. Files are concatenated in order.
-- Prereq: pg_cron extension enabled (Database > Extensions) for the
-- cron.schedule calls in 0026/0027.
-- =============================================================


-- ================= migrations/0025_ride_reviews.sql =================

-- =============================================================
-- AngkorGo Ride — bidirectional trip ratings (rider ⇄ driver)
-- Mirrors the rescue `reviews` + `booking_reviews` pattern. A driver's
-- providers.rating is recomputed across BOTH rescue reviews and rider→driver
-- trip reviews, so one average reflects all their work.
-- =============================================================

create type trip_review_by as enum ('rider', 'driver');

create table public.trip_reviews (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  by_role    trip_review_by not null,                       -- who wrote it
  rider_id   uuid not null references public.profiles(id),   -- the trip's rider
  driver_id  uuid not null references public.providers(id),  -- the trip's driver
  rating     integer not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  unique (trip_id, by_role)                                  -- one per side per trip
);
create index idx_trip_reviews_driver on public.trip_reviews (driver_id);
create index idx_trip_reviews_rider  on public.trip_reviews (rider_id);

-- ---------- Unified provider-rating recompute (rescue + ride) ----------
create or replace function public.recompute_provider_rating_all(p_provider uuid)
returns void language sql security definer set search_path = public as $$
  update public.providers p
  set rating = coalesce((
    select round(avg(r)::numeric, 1) from (
      select rating as r from public.reviews      where provider_id = p_provider
      union all
      select rating as r from public.trip_reviews where driver_id = p_provider and by_role = 'rider'
    ) x
  ), 0)
  where p.id = p_provider;
$$;

-- Point the existing rescue-review trigger at the unified recompute.
create or replace function public.recompute_provider_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_provider_rating_all(new.provider_id);
  return new;
end;
$$;

-- Recompute when a rider rates a driver.
create or replace function public.recompute_provider_rating_from_trip()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.by_role = 'rider' then
    perform public.recompute_provider_rating_all(new.driver_id);
  end if;
  return new;
end;
$$;
create trigger trg_trip_review_rating
  after insert on public.trip_reviews
  for each row execute function public.recompute_provider_rating_from_trip();

-- ---------- Submit a trip review (rider→driver or driver→rider) ----------
create or replace function public.submit_trip_review(
  p_trip uuid, p_rating integer, p_comment text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_trip     public.trips%rowtype;
  v_uid      uuid := auth.uid();
  v_provider uuid;
  v_role     trip_review_by;
begin
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be 1-5'; end if;

  select * into v_trip from public.trips where id = p_trip;
  if v_trip.id is null then raise exception 'Trip not found'; end if;
  if v_trip.status <> 'completed' then raise exception 'Trip is not completed'; end if;
  if v_trip.driver_id is null then raise exception 'Trip has no driver'; end if;

  select id into v_provider from public.providers where user_id = v_uid;

  if v_uid = v_trip.rider_id then
    v_role := 'rider';
  elsif v_provider is not null and v_provider = v_trip.driver_id then
    v_role := 'driver';
  else
    raise exception 'Not a participant of this trip';
  end if;

  insert into public.trip_reviews (trip_id, by_role, rider_id, driver_id, rating, comment)
  values (p_trip, v_role, v_trip.rider_id, v_trip.driver_id, p_rating, p_comment)
  on conflict (trip_id, by_role) do update
    set rating = excluded.rating, comment = excluded.comment;
end;
$$;
grant execute on function public.submit_trip_review(uuid, integer, text) to authenticated;

-- ---------- RLS + grants ----------
alter table public.trip_reviews enable row level security;
create policy "trip reviews: public read" on public.trip_reviews for select using (true);
-- Writes go exclusively through submit_trip_review() (security definer).
grant select on public.trip_reviews to anon, authenticated;


-- ================= migrations/0026_ride_ops.sql =================

-- =============================================================
-- AngkorGo Ride — ops hardening
--   #4 cancel_trip() so cancellation runs server-side (offer cleanup + audit)
--   #3 schedule run_dispatch_sweep() so stale trips auto-widen/expire
--   #5 block drivers from going online while they owe too much cash commission
-- =============================================================

-- ---------- #4 Server-side trip cancellation ----------
create or replace function public.cancel_trip(p_trip uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_trip     public.trips%rowtype;
  v_uid      uuid := auth.uid();
  v_provider uuid;
begin
  select * into v_trip from public.trips where id = p_trip for update;
  if v_trip.id is null then raise exception 'Trip not found'; end if;
  if v_trip.status in ('completed','cancelled','expired','no_drivers') then
    raise exception 'Trip can no longer be cancelled';
  end if;

  select id into v_provider from public.providers where user_id = v_uid;
  if v_uid <> v_trip.rider_id and (v_provider is null or v_provider <> v_trip.driver_id) then
    raise exception 'Not a participant of this trip';
  end if;

  update public.trips
    set status = 'cancelled', cancelled_at = now(),
        cancel_reason = coalesce(p_reason,
          case when v_uid = v_trip.rider_id then 'rider_cancelled' else 'driver_cancelled' end)
    where id = p_trip;

  -- Free any drivers still holding an offer for this trip.
  update public.trip_offers set status = 'expired'
    where trip_id = p_trip and status = 'offered';
end;
$$;
grant execute on function public.cancel_trip(uuid, text) to authenticated;

-- ---------- #3 Auto-run the dispatch sweep ----------
-- run_dispatch_sweep() widens the search radius for stale trips and expires
-- offers/trips past their TTL. Schedule it so it doesn't depend on the app.
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('ride-dispatch-sweep');
exception when others then null;  -- not scheduled yet
end $$;

-- Every minute (universally-supported cron syntax). If your pg_cron supports
-- sub-minute intervals you can change this to '30 seconds' for faster widening.
select cron.schedule('ride-dispatch-sweep', '* * * * *', $$ select public.run_dispatch_sweep(); $$);

-- ---------- #5 Cash-commission cap: block going online while over-owed ----------
create or replace function public.enforce_commission_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owed numeric;
  v_cap  numeric := coalesce((select (value)::text::numeric from public.platform_config
                              where key = 'cash_commission_cap'), 20);  -- default $20
begin
  if new.is_online = true and coalesce(old.is_online, false) = false then
    select coalesce(sum(amount), 0) into v_owed from public.driver_ledger where provider_id = new.id;
    if v_owed <= -v_cap then
      raise exception 'You owe $% in cash commission. Please settle up before going online.', abs(v_owed);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_commission_cap on public.providers;
create trigger trg_enforce_commission_cap
  before update on public.providers
  for each row execute function public.enforce_commission_cap();


-- ================= migrations/0027_food_ops.sql =================

-- =============================================================
-- AngkorGo Food — parity with Ride:
--   ratings (customer → restaurant + courier), server-side order cancel,
--   and an auto courier-dispatch sweep (widen radius on stale orders).
-- Payments (sandbox → ABA/Bakong) and the cash-commission cap are already
-- shared with Ride via the polymorphic payments table + providers trigger.
-- =============================================================

-- ---------- Ratings ----------
create type order_review_target as enum ('restaurant', 'courier');

create table public.order_reviews (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  target        order_review_target not null,
  customer_id   uuid not null references public.profiles(id),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  courier_id    uuid references public.providers(id) on delete cascade,
  rating        integer not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  unique (order_id, target)
);
create index idx_order_reviews_restaurant on public.order_reviews (restaurant_id);
create index idx_order_reviews_courier    on public.order_reviews (courier_id);

create or replace function public.recompute_restaurant_rating(p_restaurant uuid)
returns void language sql security definer set search_path = public as $$
  update public.restaurants r
  set rating = coalesce((select round(avg(rating)::numeric, 1) from public.order_reviews
                         where restaurant_id = p_restaurant and target = 'restaurant'), 0)
  where r.id = p_restaurant;
$$;

-- Fold food-courier reviews into the unified provider rating (rescue + ride + food).
create or replace function public.recompute_provider_rating_all(p_provider uuid)
returns void language sql security definer set search_path = public as $$
  update public.providers p
  set rating = coalesce((
    select round(avg(r)::numeric, 1) from (
      select rating as r from public.reviews       where provider_id = p_provider
      union all
      select rating as r from public.trip_reviews  where driver_id  = p_provider and by_role = 'rider'
      union all
      select rating as r from public.order_reviews where courier_id = p_provider and target = 'courier'
    ) x
  ), 0)
  where p.id = p_provider;
$$;

create or replace function public.recompute_rating_from_order_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.target = 'restaurant' then
    perform public.recompute_restaurant_rating(new.restaurant_id);
  else
    perform public.recompute_provider_rating_all(new.courier_id);
  end if;
  return new;
end;
$$;
create trigger trg_order_review_rating
  after insert on public.order_reviews
  for each row execute function public.recompute_rating_from_order_review();

create or replace function public.submit_order_review(
  p_order uuid, p_target order_review_target, p_rating integer, p_comment text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_uid uuid := auth.uid();
begin
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be 1-5'; end if;
  select * into v_order from public.orders where id = p_order;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.customer_id <> v_uid then raise exception 'Not your order'; end if;
  if v_order.status <> 'delivered' then raise exception 'Order is not delivered'; end if;
  if p_target = 'courier' and v_order.courier_id is null then raise exception 'Order has no courier'; end if;

  insert into public.order_reviews (order_id, target, customer_id, restaurant_id, courier_id, rating, comment)
  values (p_order, p_target, v_uid,
          case when p_target = 'restaurant' then v_order.restaurant_id end,
          case when p_target = 'courier'    then v_order.courier_id    end,
          p_rating, p_comment)
  on conflict (order_id, target) do update set rating = excluded.rating, comment = excluded.comment;
end;
$$;
grant execute on function public.submit_order_review(uuid, order_review_target, integer, text) to authenticated;

alter table public.order_reviews enable row level security;
create policy "order reviews: public read" on public.order_reviews for select using (true);
grant select on public.order_reviews to anon, authenticated;

-- ---------- Server-side order cancellation ----------
create or replace function public.cancel_order(p_order uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_uid uuid := auth.uid();
begin
  select * into v_order from public.orders where id = p_order for update;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.status in ('delivered','cancelled') then raise exception 'Order can no longer be cancelled'; end if;

  -- Customer, restaurant owner, or admin may cancel. Customer can't cancel once en route.
  if v_order.customer_id <> v_uid and not public.owns_restaurant(v_order.restaurant_id) and not public.is_admin() then
    raise exception 'Not allowed to cancel this order';
  end if;
  if v_order.customer_id = v_uid and v_order.status in ('picked_up','delivering') then
    raise exception 'Order is already on the way and cannot be cancelled';
  end if;

  update public.orders set status = 'cancelled', cancelled_at = now() where id = p_order;
  update public.courier_offers set status = 'expired' where order_id = p_order and status = 'offered';
  -- Reverse any not-yet-released payment.
  update public.payments
    set status = case when status = 'held' then 'refunded' else 'failed' end
    where order_id = p_order and status in ('pending','held');
end;
$$;
grant execute on function public.cancel_order(uuid, text) to authenticated;

-- ---------- Courier dispatch sweep (widen radius on stale 'ready' orders) ----------
create or replace function public.widen_dispatch_order(p_order uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_radius numeric; v_created integer := 0;
begin
  update public.orders set current_radius_km = least(current_radius_km + 2, 8), last_dispatch_at = now()
    where id = p_order and status = 'ready'
    returning current_radius_km into v_radius;
  if v_radius is null then return 0; end if;
  insert into public.courier_offers (order_id, provider_id, distance_km, eta_minutes)
  select p_order, nc.provider_id, nc.distance_km, nc.eta_minutes
  from public.find_nearby_couriers(p_order, v_radius) nc
  on conflict (order_id, provider_id) do nothing;
  get diagnostics v_created = row_count;
  return v_created;
end;
$$;

create or replace function public.run_food_dispatch_sweep()
returns integer language plpgsql security definer set search_path = public as $$
declare v_ttl integer; v_widened integer := 0; r record;
begin
  select coalesce((value)::text::integer, 45) into v_ttl from public.platform_config where key = 'offer_ttl_seconds';
  v_ttl := coalesce(v_ttl, 45);
  for r in select id from public.orders
           where status = 'ready' and current_radius_km < 8 and last_dispatch_at < now() - make_interval(secs => v_ttl)
  loop perform public.widen_dispatch_order(r.id); v_widened := v_widened + 1; end loop;
  return v_widened;
end;
$$;

create extension if not exists pg_cron;
do $$ begin perform cron.unschedule('food-dispatch-sweep'); exception when others then null; end $$;
select cron.schedule('food-dispatch-sweep', '* * * * *', $$ select public.run_food_dispatch_sweep(); $$);


-- ================= migrations/0028_booking_cancel.sql =================

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


-- ================= migrations/0029_request_cancel.sql =================

-- =============================================================
-- AngkorGo Repair (roadside) — server-side request cancellation, completing
-- cancellation parity across all verticals (trip/order/booking/request).
-- Customer or assigned provider may cancel; expires open offers and reverses
-- any unreleased payment.
-- =============================================================

create or replace function public.cancel_request(p_request uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_req public.service_requests%rowtype; v_uid uuid := auth.uid(); v_provider uuid;
begin
  select * into v_req from public.service_requests where id = p_request for update;
  if v_req.id is null then raise exception 'Request not found'; end if;
  if v_req.status in ('completed','cancelled','expired') then
    raise exception 'Request can no longer be cancelled';
  end if;

  select id into v_provider from public.providers where user_id = v_uid;
  if v_uid <> v_req.customer_id
     and (v_provider is null or v_req.assigned_provider_id is null or v_provider <> v_req.assigned_provider_id)
     and not public.is_admin() then
    raise exception 'Not allowed to cancel this request';
  end if;

  update public.service_requests set status = 'cancelled' where id = p_request;
  update public.service_assignments set status = 'expired' where request_id = p_request and status = 'offered';
  update public.payments
    set status = case when status = 'held' then 'refunded' else 'failed' end
    where request_id = p_request and status in ('pending','held');
end;
$$;
grant execute on function public.cancel_request(uuid, text) to authenticated;

