-- AngkorGo — apply ALL remaining migrations (0022, 0023, 0024) to a live DB.
-- = Vehicle Rental + Food Delivery. Fully RE-RUNNABLE (resets partial Food objects first).

-- ---- reset any partially-applied objects (Food tables are new / hold no data) ----
drop policy  if exists "listings img read"  on storage.objects;
drop policy  if exists "listings img write" on storage.objects;
alter table if exists public.payments drop constraint if exists payments_one_source;
alter table if exists public.payments drop column if exists order_id;
drop table if exists public.courier_offers, public.order_items, public.orders, public.menu_items, public.restaurants cascade;
drop type  if exists order_status;

-- ============================================================
-- 0022_rental_bookings
-- ============================================================
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

-- ============================================================
-- 0023_food
-- ============================================================
-- =============================================================
-- AngkorGo Food Delivery (foodpanda) — 3-sided: restaurant + courier + customer.
-- Reuses the dispatch engine for the courier leg and the payments engine for the
-- bill (restaurant earns; the platform's cut funds the courier's delivery fee).
-- =============================================================

create type order_status as enum (
  'placed',           -- customer placed, awaiting restaurant
  'accepted',         -- restaurant accepted / preparing
  'ready',            -- food ready → dispatch a courier
  'courier_assigned', -- a courier accepted
  'picked_up',        -- courier has the food
  'delivering',       -- en route to customer
  'delivered',
  'cancelled'
);

-- ---------- Restaurants ----------
create table public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  cuisine     text,
  address     text,
  location    geography(Point, 4326),
  lat         double precision,
  lng         double precision,
  photo_url   text,
  is_open     boolean not null default true,
  status      text not null default 'active',   -- active | paused
  rating      numeric(2,1) not null default 0,
  created_at  timestamptz not null default now()
);
create index idx_restaurants_geo on public.restaurants using gist (location);
create index idx_restaurants_status on public.restaurants (status, is_open);

create table public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  description   text,
  price         numeric(10,2) not null,
  photo_url     text,
  category      text,
  available     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index idx_menu_items_restaurant on public.menu_items (restaurant_id, available);

-- ---------- Orders ----------
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.profiles(id) on delete cascade,
  restaurant_id     uuid not null references public.restaurants(id),
  courier_id        uuid references public.providers(id),
  status            order_status not null default 'placed',
  delivery_location geography(Point, 4326),
  delivery_lat      double precision,
  delivery_lng      double precision,
  delivery_address  text,
  subtotal          numeric(10,2) not null,
  delivery_fee      numeric(10,2) not null default 0,
  total             numeric(10,2) not null,
  currency          text not null default 'USD',
  payment_method    payment_method,
  current_radius_km numeric not null default 3,
  last_dispatch_at  timestamptz,
  placed_at         timestamptz not null default now(),
  accepted_at       timestamptz,
  ready_at          timestamptz,
  picked_up_at      timestamptz,
  delivered_at      timestamptz,
  cancelled_at      timestamptz,
  updated_at        timestamptz not null default now()
);
create index idx_orders_customer on public.orders (customer_id);
create index idx_orders_restaurant on public.orders (restaurant_id, status);
create index idx_orders_courier on public.orders (courier_id);
create index idx_orders_deliver_geo on public.orders using gist (delivery_location);

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id),
  name         text not null,
  price        numeric(10,2) not null,
  qty          integer not null default 1
);
create index idx_order_items_order on public.order_items (order_id);

-- Courier dispatch offers (mirrors trip_offers).
create table public.courier_offers (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  provider_id  uuid not null references public.providers(id) on delete cascade,
  status       assignment_status not null default 'offered',
  distance_km  numeric(6,2),
  eta_minutes  integer,
  offered_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (order_id, provider_id)
);
create index idx_courier_offers_order on public.courier_offers (order_id);
create index idx_courier_offers_provider on public.courier_offers (provider_id, status);

-- Payments: add order as a fourth source.
alter table public.payments add column if not exists order_id uuid references public.orders(id) on delete cascade;
create unique index if not exists idx_payments_order on public.payments (order_id) where order_id is not null;
alter table public.payments drop constraint if exists payments_one_source;
alter table public.payments add constraint payments_one_source
  check (num_nonnulls(request_id, trip_id, booking_id, order_id) = 1);

insert into public.platform_config (key, value) values ('delivery_fee', '1.50') on conflict (key) do nothing;

create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------
create or replace function public.owns_restaurant(p_restaurant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.restaurants where id = p_restaurant and owner_id = auth.uid()) or public.is_admin();
$$;

create or replace function public.can_access_order(p_order uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o where o.id = p_order
      and (o.customer_id = auth.uid()
        or o.courier_id = public.my_provider_id()
        or public.owns_restaurant(o.restaurant_id)
        or exists (select 1 from public.courier_offers c where c.order_id = o.id and c.provider_id = public.my_provider_id()))
  ) or public.is_admin();
$$;

alter table public.restaurants   enable row level security;
alter table public.menu_items    enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.courier_offers enable row level security;

create policy "restaurants: public read" on public.restaurants
  for select using (status = 'active' or owner_id = auth.uid() or public.is_admin());
create policy "restaurants: owner insert" on public.restaurants for insert with check (owner_id = auth.uid());
create policy "restaurants: owner manage" on public.restaurants for update
  using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());

create policy "menu: public read" on public.menu_items for select using (true);
create policy "menu: owner manage" on public.menu_items for all
  using (public.owns_restaurant(restaurant_id)) with check (public.owns_restaurant(restaurant_id));

create policy "orders: participant read" on public.orders for select using (can_access_order(id));
create policy "orders: customer create" on public.orders for insert with check (customer_id = auth.uid());
create policy "orders: participant update" on public.orders for update using (
  customer_id = auth.uid() or courier_id = public.my_provider_id() or public.owns_restaurant(restaurant_id));

create policy "order_items: access" on public.order_items for select using (public.can_access_order(order_id));
create policy "courier_offers: read" on public.courier_offers for select using (
  provider_id = public.my_provider_id() or public.can_access_order(order_id));
create policy "courier_offers: respond" on public.courier_offers for update
  using (provider_id = public.my_provider_id()) with check (provider_id = public.my_provider_id());

grant select, insert, update, delete on
  public.restaurants, public.menu_items, public.orders, public.order_items, public.courier_offers
  to anon, authenticated;

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.courier_offers;

-- ============================================================
-- 0024_food_rpcs
-- ============================================================
-- =============================================================
-- AngkorGo Food — order + courier-dispatch RPCs (reuses the dispatch pattern)
-- =============================================================

-- Customer places an order (server prices items + creates the pending payment).
create or replace function public.place_order(
  p_restaurant uuid, p_items jsonb,
  p_lng double precision, p_lat double precision, p_address text,
  p_method payment_method default 'cash'
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_fee numeric; v_subtotal numeric := 0; v_total numeric; v_order uuid;
  it jsonb; v_price numeric; v_name text; v_provider uuid; v_comm numeric;
begin
  select (value)::text::numeric into v_fee from public.platform_config where key = 'delivery_fee';
  v_fee := coalesce(v_fee, 1.50);

  insert into public.orders (customer_id, restaurant_id, status, delivery_location, delivery_lat, delivery_lng, delivery_address, subtotal, delivery_fee, total, payment_method)
  values (auth.uid(), p_restaurant, 'placed', st_point(p_lng, p_lat)::geography, p_lat, p_lng, p_address, 0, v_fee, 0, p_method)
  returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    select price, name into v_price, v_name from public.menu_items
      where id = (it->>'menu_item_id')::uuid and restaurant_id = p_restaurant and available;
    if v_price is null then raise exception 'Invalid menu item'; end if;
    insert into public.order_items (order_id, menu_item_id, name, price, qty)
    values (v_order, (it->>'menu_item_id')::uuid, v_name, v_price, greatest(1, (it->>'qty')::int));
    v_subtotal := v_subtotal + v_price * greatest(1, (it->>'qty')::int);
  end loop;

  v_total := v_subtotal + v_fee;
  update public.orders set subtotal = v_subtotal, total = v_total where id = v_order;

  -- Restaurant earns via a provider record; rate makes them net subtotal*(1-commission)
  -- of the total, so the platform commission absorbs the delivery fee (paid to courier on delivery).
  insert into public.providers (user_id, status)
    select owner_id, 'approved' from public.restaurants where id = p_restaurant
    on conflict (user_id) do nothing;
  select p.id, p.commission_rate into v_provider, v_comm
    from public.providers p join public.restaurants r on r.owner_id = p.user_id where r.id = p_restaurant;

  insert into public.payments (order_id, customer_id, provider_id, amount, provider_rate, method, status)
  values (v_order, auth.uid(), v_provider, v_total,
          round((v_subtotal * (1 - coalesce(v_comm, 0.10))) / nullif(v_total, 0), 3), p_method, 'pending');

  return v_order;
end;
$$;

-- Restaurant accepts / marks ready (ready → dispatch couriers).
create or replace function public.accept_order(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders set status = 'accepted', accepted_at = now()
    where id = p_order and status = 'placed' and public.owns_restaurant(restaurant_id);
  if not found then raise exception 'Order not acceptable'; end if;
end; $$;

-- Nearest available couriers to the restaurant.
create or replace function public.find_nearby_couriers(p_order uuid, p_radius numeric default 3)
returns table (provider_id uuid, distance_km numeric, eta_minutes integer, rating numeric)
language sql stable security definer set search_path = public as $$
  with o as (select r.location as loc from public.orders ord join public.restaurants r on r.id = ord.restaurant_id where ord.id = p_order)
  select pr.id,
    round((st_distance(pl.location, o.loc) / 1000.0)::numeric, 2) as distance_km,
    greatest(1, ceil((st_distance(pl.location, o.loc) / 1000.0) / 20.0 * 60.0) + 3)::int,
    pr.rating
  from o
  join public.provider_locations pl on st_dwithin(pl.location, o.loc, p_radius * 1000)
  join public.providers pr on pr.id = pl.provider_id
  where pr.is_online and pr.status = 'approved'
    and not exists (select 1 from public.courier_offers c where c.order_id = p_order and c.provider_id = pr.id)
    and not exists (select 1 from public.orders x where x.courier_id = pr.id and x.status in ('courier_assigned','picked_up','delivering'))
  order by distance_km asc, pr.rating desc
  limit 15;
$$;

create or replace function public.dispatch_order(p_order uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_radius numeric; v_created integer := 0;
begin
  update public.orders set status = 'ready', ready_at = coalesce(ready_at, now()), last_dispatch_at = now()
    where id = p_order and status in ('accepted','ready') and public.owns_restaurant(restaurant_id);
  select current_radius_km into v_radius from public.orders where id = p_order;
  insert into public.courier_offers (order_id, provider_id, distance_km, eta_minutes)
  select p_order, nc.provider_id, nc.distance_km, nc.eta_minutes
  from public.find_nearby_couriers(p_order, v_radius) nc
  on conflict (order_id, provider_id) do nothing;
  get diagnostics v_created = row_count;
  return v_created;
end; $$;

-- Courier accepts (atomic first-wins).
create or replace function public.accept_order_offer(p_offer uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_order uuid; v_provider uuid;
begin
  select order_id, provider_id into v_order, v_provider from public.courier_offers where id = p_offer for update;
  update public.orders set status = 'courier_assigned', courier_id = v_provider
    where id = v_order and status = 'ready';
  if not found then raise exception 'Order no longer available'; end if;
  update public.courier_offers set status = 'accepted', responded_at = now() where id = p_offer;
  update public.courier_offers set status = 'expired' where order_id = v_order and id <> p_offer and status = 'offered';
end; $$;

-- Courier advances pickup → delivering → delivered (credits the delivery fee).
create or replace function public.advance_order(p_order uuid, p_to order_status)
returns void language plpgsql security definer set search_path = public as $$
declare v_courier uuid; v_fee numeric;
begin
  select courier_id, delivery_fee into v_courier, v_fee from public.orders where id = p_order;
  if v_courier <> public.my_provider_id() and not public.is_admin() then
    raise exception 'Only the courier can update this order';
  end if;
  update public.orders set status = p_to,
    picked_up_at = case when p_to = 'picked_up' then now() else picked_up_at end,
    delivered_at = case when p_to = 'delivered' then now() else delivered_at end
    where id = p_order;
  if p_to = 'delivered' then
    insert into public.wallets (provider_id, balance) values (v_courier, v_fee)
      on conflict (provider_id) do update set balance = public.wallets.balance + v_fee, updated_at = now();
  end if;
end; $$;

-- Notify restaurant on new order; customer when a courier is assigned.
create or replace function public.on_order_placed()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.restaurants where id = new.restaurant_id;
  perform public.notify_user(v_owner, 'New order', 'You have a new food order', 'order_placed',
    jsonb_build_object('order_id', new.id));
  return new;
end; $$;
create trigger trg_order_placed after insert on public.orders
  for each row execute function public.on_order_placed();

grant execute on function public.place_order(uuid, jsonb, double precision, double precision, text, payment_method) to authenticated;
grant execute on function public.accept_order(uuid)            to authenticated;
grant execute on function public.dispatch_order(uuid)          to authenticated;
grant execute on function public.accept_order_offer(uuid)      to authenticated;
grant execute on function public.advance_order(uuid, order_status) to authenticated;

