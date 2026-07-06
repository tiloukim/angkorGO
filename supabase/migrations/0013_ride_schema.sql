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
