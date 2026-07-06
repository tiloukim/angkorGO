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
