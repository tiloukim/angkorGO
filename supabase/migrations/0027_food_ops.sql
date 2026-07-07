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
