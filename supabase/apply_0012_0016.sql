-- AngkorGo — apply migrations 0012–0016 to a live project already on 0011.
-- Run ONCE in Supabase SQL Editor. Idempotent grants; new types/tables assume 0011 is applied.

-- ====== supabase/migrations/0012_grants.sql ======
-- =============================================================
-- AngkorGo — 0012 Data API grants
-- Makes table access explicit for the anon/authenticated roles instead of
-- relying on Supabase's "expose new tables" default. RLS policies (0005/0009/…)
-- still enforce row-level access; these grants only satisfy Postgres' table-level
-- privilege check (needed e.g. when an RLS policy subqueries another table).
-- Idempotent — safe to run on an already-working project.
-- =============================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Future tables get the same grants automatically.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;

-- NOTE: function EXECUTE grants are intentionally NOT blanket-granted here so the
-- webhook-only RPCs revoked in 0011 (confirm_payment, release_payment_admin) stay
-- restricted to service_role.

-- ====== supabase/migrations/0013_ride_schema.sql ======
-- =============================================================
-- AngkorGo Ride — R1: Schema
-- Ride-hailing vertical (moto / tuktuk / car) on the shared platform.
-- See docs/ANGKORGO_RIDE_SPEC.md. Reuses providers, payments, provider_locations,
-- assignment_status, payment_method, and the is_admin()/my_provider_id() helpers.
-- =============================================================

-- ---------- Enums ----------
create type vehicle_class as enum ('moto', 'tuktuk', 'car');

create type trip_status as enum (
  'requested',        -- created, fare estimated
  'searching',        -- dispatching, expanding radius
  'matched',          -- a driver accepted
  'driver_arriving',  -- driver en route to pickup
  'driver_arrived',   -- at pickup
  'in_progress',      -- rider onboard → dropoff
  'completed',
  'cancelled',
  'expired',          -- no driver accepted in time
  'no_drivers'        -- none online in range
);

-- ---------- Driver vehicles ----------
create table public.driver_vehicles (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.providers(id) on delete cascade,
  class        vehicle_class not null,
  make_model   text,
  color        text,
  plate_number text not null,
  seats        integer default 4,
  photo_url    text,
  verified     boolean not null default false,
  verified_by  uuid references public.profiles(id),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index idx_driver_vehicles_provider on public.driver_vehicles (provider_id, class, active);

-- ---------- Trips ----------
create table public.trips (
  id                 uuid primary key default gen_random_uuid(),
  rider_id           uuid not null references public.profiles(id) on delete cascade,
  driver_id          uuid references public.providers(id),
  vehicle_id         uuid references public.driver_vehicles(id),
  class              vehicle_class not null,
  status             trip_status not null default 'requested',

  pickup_location    geography(Point, 4326) not null,
  pickup_address     text,
  pickup_lat         double precision,
  pickup_lng         double precision,
  dropoff_location   geography(Point, 4326) not null,
  dropoff_address    text,
  dropoff_lat        double precision,
  dropoff_lng        double precision,
  route_polyline     text,

  est_distance_km    numeric(7,2),
  est_duration_min   integer,
  est_fare           numeric(10,2),
  final_fare         numeric(10,2),
  surge_multiplier   numeric(4,2) not null default 1.0,
  currency           text not null default 'USD',
  payment_method     payment_method,

  current_radius_km  numeric not null default 2,
  last_dispatch_at   timestamptz,
  requested_at       timestamptz not null default now(),
  matched_at         timestamptz,
  started_at         timestamptz,
  completed_at       timestamptz,
  cancelled_at       timestamptz,
  cancel_reason      text,
  updated_at         timestamptz not null default now()
);
create index idx_trips_pickup_geo on public.trips using gist (pickup_location);
create index idx_trips_status     on public.trips (status);
create index idx_trips_rider      on public.trips (rider_id);
create index idx_trips_driver     on public.trips (driver_id);

-- ---------- Trip offers (dispatch fan-out; mirrors service_assignments) ----------
create table public.trip_offers (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  provider_id  uuid not null references public.providers(id) on delete cascade,
  status       assignment_status not null default 'offered',
  distance_km  numeric(6,2),
  eta_minutes  integer,
  offered_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (trip_id, provider_id)
);
create index idx_trip_offers_trip     on public.trip_offers (trip_id);
create index idx_trip_offers_provider on public.trip_offers (provider_id, status);

-- ---------- Trip status history ----------
create table public.trip_status_history (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  status     trip_status not null,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index idx_trip_status_hist on public.trip_status_history (trip_id, created_at);

-- ---------- Fare config (per class; Phnom Penh launch, USD) ----------
create table public.fare_config (
  class            vehicle_class primary key,
  base_fare        numeric(8,2) not null,
  per_km           numeric(8,2) not null,
  per_min          numeric(8,2) not null,
  minimum_fare     numeric(8,2) not null,
  cancellation_fee numeric(8,2) not null default 0,
  currency         text not null default 'USD',
  updated_at       timestamptz not null default now()
);
insert into public.fare_config (class, base_fare, per_km, per_min, minimum_fare, cancellation_fee) values
  ('moto',   0.50, 0.20, 0.03, 0.75, 0.25),
  ('tuktuk', 0.75, 0.35, 0.04, 1.00, 0.40),
  ('car',    1.25, 0.55, 0.06, 2.00, 0.75)
on conflict (class) do nothing;

-- ---------- Driver ledger (cash-commission settlement) ----------
-- +credit (card/KHQR payout owed to driver) / -debit (cash-trip commission owed to platform)
create table public.driver_ledger (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  trip_id     uuid references public.trips(id) on delete set null,
  amount      numeric(10,2) not null,
  reason      text,
  created_at  timestamptz not null default now()
);
create index idx_driver_ledger_provider on public.driver_ledger (provider_id, created_at);

-- ---------- Payments: make polymorphic (rescue request OR ride trip) ----------
alter table public.payments alter column request_id drop not null;
alter table public.payments add column if not exists trip_id uuid references public.trips(id) on delete cascade;
create unique index if not exists idx_payments_trip on public.payments (trip_id) where trip_id is not null;
alter table public.payments
  add constraint payments_one_source check (num_nonnulls(request_id, trip_id) = 1);

-- ---------- Triggers ----------
create trigger trg_trips_updated before update on public.trips
  for each row execute function public.set_updated_at();

create or replace function public.log_trip_status()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.trip_status_history (trip_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;
create trigger trg_trip_status_history
  after insert or update on public.trips
  for each row execute function public.log_trip_status();

-- ---------- RLS ----------
create or replace function public.can_access_trip(p_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip_id
      and (
        t.rider_id = auth.uid()
        or t.driver_id = public.my_provider_id()
        or exists (select 1 from public.trip_offers o
                   where o.trip_id = t.id and o.provider_id = public.my_provider_id())
      )
  ) or public.is_admin();
$$;

alter table public.driver_vehicles     enable row level security;
alter table public.trips                enable row level security;
alter table public.trip_offers          enable row level security;
alter table public.trip_status_history  enable row level security;
alter table public.fare_config          enable row level security;
alter table public.driver_ledger        enable row level security;

-- driver_vehicles: owner + admin manage; rider can read the vehicle on their trip
create policy "vehicles: owner manage" on public.driver_vehicles
  for all using (provider_id = public.my_provider_id() or public.is_admin())
  with check (provider_id = public.my_provider_id() or public.is_admin());
create policy "vehicles: rider read on trip" on public.driver_vehicles
  for select using (
    exists (select 1 from public.trips t where t.vehicle_id = driver_vehicles.id and t.rider_id = auth.uid())
  );

-- trips
create policy "trips: participant read" on public.trips
  for select using (
    rider_id = auth.uid()
    or driver_id = public.my_provider_id()
    or exists (select 1 from public.trip_offers o where o.trip_id = trips.id and o.provider_id = public.my_provider_id())
    or public.is_admin()
  );
create policy "trips: rider create" on public.trips
  for insert with check (rider_id = auth.uid());
create policy "trips: participant update" on public.trips
  for update using (
    rider_id = auth.uid() or driver_id = public.my_provider_id() or public.is_admin()
  );

-- trip_offers
create policy "trip_offers: participant read" on public.trip_offers
  for select using (provider_id = public.my_provider_id() or public.can_access_trip(trip_id));
create policy "trip_offers: driver respond" on public.trip_offers
  for update using (provider_id = public.my_provider_id())
  with check (provider_id = public.my_provider_id());

-- trip_status_history
create policy "trip history: access" on public.trip_status_history
  for select using (public.can_access_trip(trip_id));

-- fare_config: public read, admin write
create policy "fares: public read" on public.fare_config
  for select using (true);
create policy "fares: admin write" on public.fare_config
  for all using (public.is_admin()) with check (public.is_admin());

-- driver_ledger: owner read, admin manage
create policy "ledger: owner read" on public.driver_ledger
  for select using (provider_id = public.my_provider_id() or public.is_admin());
create policy "ledger: admin write" on public.driver_ledger
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Grants (explicit, mirrors 0012 for these new tables) ----------
grant select, insert, update, delete on
  public.driver_vehicles, public.trips, public.trip_offers,
  public.trip_status_history, public.fare_config, public.driver_ledger
  to anon, authenticated;

-- ---------- Realtime ----------
alter publication supabase_realtime add table public.trips;
alter publication supabase_realtime add table public.trip_offers;
alter publication supabase_realtime add table public.trip_status_history;

-- ====== supabase/migrations/0014_trilingual.sql ======
-- =============================================================
-- AngkorGo — 0014 Trilingual (English / Khmer / Chinese)
-- The platform now supports 'zh' in addition to 'en' and 'km'.
-- =============================================================

alter table public.profiles drop constraint if exists profiles_preferred_language_check;
alter table public.profiles
  add constraint profiles_preferred_language_check
  check (preferred_language in ('en', 'km', 'zh'));

-- ====== supabase/migrations/0015_fare_engine.sql ======
-- =============================================================
-- AngkorGo Ride — R2: Fare engine
-- Given a route's distance + duration (from Google Distance Matrix / Directions),
-- compute the fare per class from fare_config. Server-authoritative pricing.
-- =============================================================

-- Single-class estimate.
create or replace function public.estimate_fare(
  p_class        vehicle_class,
  p_distance_km  numeric,
  p_duration_min integer,
  p_surge        numeric default 1.0
)
returns numeric
language sql stable set search_path = public as $$
  select round(greatest(
    fc.minimum_fare,
    (fc.base_fare + fc.per_km * p_distance_km + fc.per_min * p_duration_min) * coalesce(p_surge, 1.0)
  ), 2)
  from public.fare_config fc
  where fc.class = p_class;
$$;

-- Estimate for every class at once (feeds the rider's class picker).
create or replace function public.estimate_all_fares(
  p_distance_km  numeric,
  p_duration_min integer,
  p_surge        numeric default 1.0
)
returns table (class vehicle_class, fare numeric, currency text)
language sql stable set search_path = public as $$
  select
    fc.class,
    round(greatest(
      fc.minimum_fare,
      (fc.base_fare + fc.per_km * p_distance_km + fc.per_min * p_duration_min) * coalesce(p_surge, 1.0)
    ), 2),
    fc.currency
  from public.fare_config fc
  order by fc.base_fare;
$$;

grant execute on function public.estimate_fare(vehicle_class, numeric, integer, numeric) to anon, authenticated;
grant execute on function public.estimate_all_fares(numeric, integer, numeric) to anon, authenticated;

-- ====== supabase/migrations/0016_booking_core.sql ======
-- =============================================================
-- AngkorGo Booking Core (shared by Vehicle Rental "Turo" + Stay "Airbnb")
-- Browse listings → reserve a date range → pay → review. listing_type
-- discriminates vehicle vs place; the mechanics are identical.
-- =============================================================

create type listing_type   as enum ('vehicle', 'place');
create type listing_status as enum ('draft', 'active', 'paused', 'removed');
create type booking_status as enum ('requested', 'confirmed', 'declined', 'cancelled', 'in_progress', 'completed');

-- Prevent overlapping confirmed reservations (daterange exclusion).
create extension if not exists btree_gist;

-- ---------- Listings ----------
create table public.listings (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references public.profiles(id) on delete cascade,
  type          listing_type not null,
  title         text not null,
  description   text,

  price_per_unit numeric(10,2) not null,   -- per day (vehicle) or per night (place)
  currency       text not null default 'USD',
  deposit        numeric(10,2) not null default 0,
  cleaning_fee   numeric(10,2) not null default 0,

  location      geography(Point, 4326),
  lat           double precision,
  lng           double precision,
  address       text,

  -- type-specific: vehicle {make,model,year,seats,transmission,plate} | place {beds,baths,max_guests,amenities}
  attributes    jsonb not null default '{}'::jsonb,
  photos        text[] not null default '{}',
  instant_book  boolean not null default false,
  status        listing_status not null default 'draft',
  rating        numeric(2,1) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_listings_host on public.listings (host_id);
create index idx_listings_type_status on public.listings (type, status);
create index idx_listings_geo on public.listings using gist (location);

-- ---------- Bookings ----------
create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  guest_id       uuid not null references public.profiles(id) on delete cascade,
  status         booking_status not null default 'requested',

  start_date     date not null,
  end_date       date not null,
  guests         integer not null default 1,

  price_per_unit numeric(10,2) not null,
  unit_count     integer not null,           -- nights/days = end - start
  subtotal       numeric(10,2) not null,
  cleaning_fee   numeric(10,2) not null default 0,
  deposit        numeric(10,2) not null default 0,
  total_amount   numeric(10,2) not null,
  currency       text not null default 'USD',
  payment_method payment_method,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  during daterange generated always as (daterange(start_date, end_date, '[)')) stored,
  check (end_date > start_date)
);
create index idx_bookings_listing on public.bookings (listing_id);
create index idx_bookings_guest on public.bookings (guest_id);
-- No two confirmed/active bookings for the same listing may overlap.
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (listing_id with =, during with &&)
  where (status in ('confirmed', 'in_progress'));

-- ---------- Reviews ----------
create table public.booking_reviews (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  guest_id   uuid not null references public.profiles(id),
  rating     integer not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now()
);
create index idx_booking_reviews_listing on public.booking_reviews (listing_id);

-- ---------- Payments: add booking as a third source ----------
alter table public.payments add column if not exists booking_id uuid references public.bookings(id) on delete cascade;
create unique index if not exists idx_payments_booking on public.payments (booking_id) where booking_id is not null;
alter table public.payments drop constraint if exists payments_one_source;
alter table public.payments add constraint payments_one_source
  check (num_nonnulls(request_id, trip_id, booking_id) = 1);

-- ---------- Triggers ----------
create trigger trg_listings_updated before update on public.listings
  for each row execute function public.set_updated_at();
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();

create or replace function public.recompute_listing_rating()
returns trigger language plpgsql as $$
begin
  update public.listings l
  set rating = coalesce((select round(avg(rating)::numeric, 1)
                         from public.booking_reviews where listing_id = new.listing_id), 0)
  where l.id = new.listing_id;
  return new;
end;
$$;
create trigger trg_booking_review_rating
  after insert on public.booking_reviews
  for each row execute function public.recompute_listing_rating();

-- ---------- Availability helper ----------
create or replace function public.listing_available(
  p_listing_id uuid, p_start date, p_end date
)
returns boolean
language sql stable set search_path = public as $$
  select not exists (
    select 1 from public.bookings b
    where b.listing_id = p_listing_id
      and b.status in ('confirmed', 'in_progress')
      and b.during && daterange(p_start, p_end, '[)')
  );
$$;
grant execute on function public.listing_available(uuid, date, date) to anon, authenticated;

-- ---------- RLS ----------
create or replace function public.owns_listing(p_listing_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.listings where id = p_listing_id and host_id = auth.uid())
      or public.is_admin();
$$;

alter table public.listings        enable row level security;
alter table public.bookings        enable row level security;
alter table public.booking_reviews enable row level security;

-- listings: active ones are public; host manages own; admin all
create policy "listings: public read active" on public.listings
  for select using (status = 'active' or host_id = auth.uid() or public.is_admin());
create policy "listings: host insert" on public.listings
  for insert with check (host_id = auth.uid());
create policy "listings: host manage" on public.listings
  for update using (host_id = auth.uid() or public.is_admin())
  with check (host_id = auth.uid() or public.is_admin());

-- bookings: guest + listing host + admin
create policy "bookings: participant read" on public.bookings
  for select using (guest_id = auth.uid() or public.owns_listing(listing_id));
create policy "bookings: guest create" on public.bookings
  for insert with check (guest_id = auth.uid());
create policy "bookings: participant update" on public.bookings
  for update using (guest_id = auth.uid() or public.owns_listing(listing_id));

-- reviews: public read; guest writes for own completed booking
create policy "booking reviews: public read" on public.booking_reviews
  for select using (true);
create policy "booking reviews: guest create" on public.booking_reviews
  for insert with check (
    guest_id = auth.uid()
    and exists (select 1 from public.bookings b
                where b.id = booking_reviews.booking_id and b.guest_id = auth.uid() and b.status = 'completed')
  );

-- ---------- Grants + realtime ----------
grant select, insert, update, delete on
  public.listings, public.bookings, public.booking_reviews to anon, authenticated;

alter publication supabase_realtime add table public.bookings;

