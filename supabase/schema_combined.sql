-- ====== supabase/migrations/0001_extensions_enums.sql ======
-- =============================================================
-- AngkorGo — 0001 Extensions & Enums
-- Phase 1: Database Design
-- =============================================================

-- Geospatial (nearest-provider search, ST_DWithin radius dispatch)
create extension if not exists postgis;
-- gen_random_uuid(), crypto helpers
create extension if not exists pgcrypto;

-- ---------- Enum types ----------

-- Role of a platform account. auth.users is the identity table;
-- public.profiles.role drives RBAC across RLS policies.
create type user_role as enum ('customer', 'provider', 'admin');

create type provider_status as enum ('pending', 'approved', 'suspended', 'rejected');

-- Lifecycle of a rescue request (see docs/ARCHITECTURE.md state machine)
create type request_status as enum (
  'pending',      -- created, not yet dispatched
  'dispatching',  -- offers being sent, expanding radius
  'accepted',     -- a provider accepted
  'en_route',     -- provider driving to customer
  'arrived',      -- provider on scene
  'in_progress',  -- work happening
  'completed',    -- customer approved + paid
  'cancelled',    -- cancelled by customer/admin
  'expired'       -- no provider accepted in time
);

-- One offer to a single provider inside a request's dispatch fan-out
create type assignment_status as enum ('offered', 'accepted', 'rejected', 'expired', 'cancelled');

create type payment_status as enum ('pending', 'held', 'released', 'refunded', 'failed');

create type payment_method as enum ('aba_payway', 'khqr', 'stripe', 'wing', 'acleda', 'cash');

create type document_type as enum (
  'national_id', 'drivers_license', 'business_license', 'vehicle_photo', 'profile_photo'
);

create type withdrawal_status as enum ('pending', 'processing', 'paid', 'rejected');

create type service_category as enum (
  'flat_tire',
  'battery_jump_start',
  'battery_replacement',
  'fuel_delivery',
  'lockout_service',
  'tow_truck',
  'engine_diagnosis',
  'emergency_repair',
  'motorcycle_repair',
  'car_repair',
  'van_repair',
  'truck_repair'
);

create type image_kind as enum ('vehicle', 'problem', 'before', 'after', 'invoice');

-- ====== supabase/migrations/0002_tables.sql ======
-- =============================================================
-- AngkorGo — 0002 Core Tables
-- =============================================================

-- ---------- profiles ----------
-- Extends auth.users (the "users" table). One row per account.
create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  role               user_role   not null default 'customer',
  full_name          text,
  phone              text,
  avatar_url         text,
  preferred_language text        not null default 'en' check (preferred_language in ('en', 'km')),
  is_suspended       boolean     not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- providers ----------
create table public.providers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.profiles(id) on delete cascade,
  business_name   text,
  bio             text,
  status          provider_status not null default 'pending',
  is_online       boolean not null default false,
  rating          numeric(2,1) not null default 0.0,
  total_jobs      integer not null default 0,
  commission_rate numeric(4,3) not null default 0.100 check (commission_rate >= 0 and commission_rate <= 1),
  approved_at     timestamptz,
  approved_by     uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- provider_documents ----------
create table public.provider_documents (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  type        document_type not null,
  file_url    text not null,        -- Supabase Storage path
  verified    boolean not null default false,
  verified_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

-- ---------- provider_services ----------
create table public.provider_services (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  category    service_category not null,
  base_price  numeric(10,2),
  active      boolean not null default true,
  unique (provider_id, category)
);

-- ---------- provider_locations ----------
-- Single current location per provider (upserted on heartbeat).
create table public.provider_locations (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  location    geography(Point, 4326) not null,
  heading     numeric,        -- degrees 0-360
  speed       numeric,        -- m/s
  updated_at  timestamptz not null default now()
);

-- ---------- service_requests ----------
create table public.service_requests (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references public.profiles(id) on delete cascade,
  category        service_category not null,
  status          request_status not null default 'pending',
  pickup_location geography(Point, 4326) not null,
  address         text,
  vehicle_type    text,
  notes           text,
  current_radius_km integer not null default 5,
  assigned_provider_id uuid references public.providers(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '30 minutes')
);

-- ---------- service_request_images ----------
create table public.service_request_images (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.service_requests(id) on delete cascade,
  image_url   text not null,
  kind        image_kind not null default 'problem',
  uploaded_by uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- ---------- service_assignments ----------
-- One row per (request, provider) offer during dispatch fan-out.
create table public.service_assignments (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.service_requests(id) on delete cascade,
  provider_id  uuid not null references public.providers(id) on delete cascade,
  status       assignment_status not null default 'offered',
  distance_km  numeric(6,2),
  eta_minutes  integer,
  offered_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (request_id, provider_id)
);

-- ---------- service_status_history ----------
create table public.service_status_history (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  status     request_status not null,
  changed_by uuid references public.profiles(id),
  note       text,
  created_at timestamptz not null default now()
);

-- ---------- chat_messages ----------
create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- payments ----------
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null unique references public.service_requests(id) on delete cascade,
  customer_id     uuid not null references public.profiles(id),
  provider_id     uuid not null references public.providers(id),
  amount          numeric(10,2) not null check (amount >= 0),
  currency        text not null default 'USD',
  method          payment_method,
  status          payment_status not null default 'pending',
  provider_rate   numeric(4,3) not null default 0.900,   -- share to provider
  provider_amount numeric(10,2) not null default 0,
  commission_amount numeric(10,2) not null default 0,
  invoice_url     text,
  external_txn_id text,
  created_at      timestamptz not null default now(),
  paid_at         timestamptz
);

-- ---------- wallets ----------
create table public.wallets (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique references public.providers(id) on delete cascade,
  balance     numeric(12,2) not null default 0,
  currency    text not null default 'USD',
  updated_at  timestamptz not null default now()
);

-- ---------- withdrawals ----------
create table public.withdrawals (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.providers(id) on delete cascade,
  amount       numeric(12,2) not null check (amount > 0),
  status       withdrawal_status not null default 'pending',
  method       payment_method,
  destination  text,           -- account/phone number
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references public.profiles(id)
);

-- ---------- reviews ----------
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null unique references public.service_requests(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  provider_id uuid not null references public.providers(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

-- ---------- notifications ----------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text,
  type       text,           -- e.g. 'request_offer', 'accepted', 'payment'
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- audit_logs ----------
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id),
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ====== supabase/migrations/0003_indexes_triggers.sql ======
-- =============================================================
-- AngkorGo — 0003 Indexes & Triggers
-- =============================================================

-- ---------- Indexes ----------

-- Geospatial: nearest-provider dispatch + live tracking bounding queries
create index idx_provider_locations_geo on public.provider_locations using gist (location);
create index idx_service_requests_geo   on public.service_requests   using gist (pickup_location);

-- Dispatch hot paths
create index idx_providers_online_status on public.providers (is_online, status);
create index idx_provider_services_cat   on public.provider_services (category, active);

-- Foreign-key / lookup indexes
create index idx_requests_customer   on public.service_requests (customer_id);
create index idx_requests_status     on public.service_requests (status);
create index idx_requests_provider   on public.service_requests (assigned_provider_id);
create index idx_assignments_request on public.service_assignments (request_id);
create index idx_assignments_provider on public.service_assignments (provider_id, status);
create index idx_req_images_request  on public.service_request_images (request_id);
create index idx_status_hist_request on public.service_status_history (request_id, created_at);
create index idx_chat_request        on public.chat_messages (request_id, created_at);
create index idx_payments_provider   on public.payments (provider_id);
create index idx_withdrawals_provider on public.withdrawals (provider_id, status);
create index idx_reviews_provider    on public.reviews (provider_id);
create index idx_notifications_user  on public.notifications (user_id, read_at);
create index idx_audit_entity        on public.audit_logs (entity_type, entity_id);

-- ---------- updated_at maintenance ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated   before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_providers_updated  before update on public.providers
  for each row execute function public.set_updated_at();
create trigger trg_requests_updated   before update on public.service_requests
  for each row execute function public.set_updated_at();
create trigger trg_wallets_updated    before update on public.wallets
  for each row execute function public.set_updated_at();

-- ---------- Auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, preferred_language, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.phone,
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Record every request status change ----------
create or replace function public.log_request_status()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.service_status_history (request_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_request_status_history
  after insert or update on public.service_requests
  for each row execute function public.log_request_status();

-- ---------- Recompute provider rating on new review ----------
create or replace function public.recompute_provider_rating()
returns trigger language plpgsql as $$
begin
  update public.providers p
  set rating = coalesce((
    select round(avg(rating)::numeric, 1) from public.reviews where provider_id = new.provider_id
  ), 0)
  where p.id = new.provider_id;
  return new;
end;
$$;

create trigger trg_review_rating
  after insert on public.reviews
  for each row execute function public.recompute_provider_rating();

-- ---------- Compute commission split on payment write ----------
create or replace function public.compute_payment_split()
returns trigger language plpgsql as $$
begin
  new.provider_amount   := round(new.amount * new.provider_rate, 2);
  new.commission_amount := round(new.amount - new.provider_amount, 2);
  return new;
end;
$$;

create trigger trg_payment_split
  before insert or update of amount, provider_rate on public.payments
  for each row execute function public.compute_payment_split();

-- ---------- Credit provider wallet when payment is released ----------
create or replace function public.credit_wallet_on_release()
returns trigger language plpgsql as $$
begin
  if new.status = 'released' and old.status is distinct from 'released' then
    insert into public.wallets (provider_id, balance)
    values (new.provider_id, new.provider_amount)
    on conflict (provider_id)
    do update set balance = public.wallets.balance + new.provider_amount,
                  updated_at = now();
    update public.providers set total_jobs = total_jobs + 1 where id = new.provider_id;
  end if;
  return new;
end;
$$;

create trigger trg_wallet_credit
  after update on public.payments
  for each row execute function public.credit_wallet_on_release();

-- ====== supabase/migrations/0004_functions_realtime.sql ======
-- =============================================================
-- AngkorGo — 0004 Dispatch Functions & Realtime
-- =============================================================

-- ---------- Nearest-provider search (core of dispatch engine) ----------
-- Returns approved + online providers offering `p_category`, within
-- `p_radius_km` of the request pickup point, ordered by distance.
create or replace function public.find_nearby_providers(
  p_request_id uuid,
  p_radius_km  numeric default 5
)
returns table (
  provider_id uuid,
  distance_km numeric,
  eta_minutes integer,
  rating      numeric
)
language sql stable security definer set search_path = public as $$
  with req as (
    select pickup_location, category from public.service_requests where id = p_request_id
  )
  select
    pr.id,
    round((st_distance(pl.location, req.pickup_location) / 1000.0)::numeric, 2) as distance_km,
    -- crude ETA: assume 25 km/h average urban speed, +2 min dispatch overhead
    greatest(1, ceil((st_distance(pl.location, req.pickup_location) / 1000.0) / 25.0 * 60.0) + 2)::int as eta_minutes,
    pr.rating
  from req
  join public.provider_locations pl
    on st_dwithin(pl.location, req.pickup_location, p_radius_km * 1000)
  join public.providers pr on pr.id = pl.provider_id
  join public.provider_services ps
    on ps.provider_id = pr.id and ps.category = req.category and ps.active
  where pr.is_online = true
    and pr.status = 'approved'
    -- exclude providers already offered/rejected this request
    and not exists (
      select 1 from public.service_assignments sa
      where sa.request_id = p_request_id and sa.provider_id = pr.id
    )
    -- exclude providers currently on an active job
    and not exists (
      select 1 from public.service_requests sr
      where sr.assigned_provider_id = pr.id
        and sr.status in ('accepted','en_route','arrived','in_progress')
    )
  order by distance_km asc, pr.rating desc
  limit 20;
$$;

-- ---------- Dispatch fan-out step ----------
-- Creates offers for all matching providers at the current radius and marks
-- the request 'dispatching'. Called by the app/edge fn on request creation and
-- re-called with a widened radius if nobody accepts. Returns offers created.
create or replace function public.dispatch_request(p_request_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_radius integer;
  v_created integer := 0;
begin
  select current_radius_km into v_radius from public.service_requests where id = p_request_id;

  insert into public.service_assignments (request_id, provider_id, distance_km, eta_minutes)
  select p_request_id, np.provider_id, np.distance_km, np.eta_minutes
  from public.find_nearby_providers(p_request_id, v_radius) np
  on conflict (request_id, provider_id) do nothing;

  get diagnostics v_created = row_count;

  update public.service_requests
    set status = 'dispatching'
    where id = p_request_id and status in ('pending','dispatching');

  return v_created;
end;
$$;

-- ---------- Widen radius (5 -> 10 -> 20) ----------
create or replace function public.widen_dispatch(p_request_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_next integer;
begin
  update public.service_requests
    set current_radius_km = case current_radius_km
                              when 5 then 10
                              when 10 then 20
                              else 20 end
    where id = p_request_id
    returning current_radius_km into v_next;
  return public.dispatch_request(p_request_id);
end;
$$;

-- ---------- Provider accepts an offer (atomic, first-wins) ----------
create or replace function public.accept_assignment(p_assignment_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_request uuid;
  v_provider uuid;
begin
  select request_id, provider_id into v_request, v_provider
  from public.service_assignments where id = p_assignment_id for update;

  -- Only accept if request is still open. Row lock prevents double-accept race.
  update public.service_requests
    set status = 'accepted', assigned_provider_id = v_provider
    where id = v_request and status in ('pending','dispatching');

  if not found then
    raise exception 'Request no longer available';
  end if;

  update public.service_assignments
    set status = 'accepted', responded_at = now()
    where id = p_assignment_id;

  -- Expire all other outstanding offers for this request
  update public.service_assignments
    set status = 'expired'
    where request_id = v_request and id <> p_assignment_id and status = 'offered';
end;
$$;

-- ---------- Realtime publication ----------
-- Client subscribes to these tables for live UX.
alter publication supabase_realtime add table public.service_requests;
alter publication supabase_realtime add table public.service_assignments;
alter publication supabase_realtime add table public.provider_locations;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.service_status_history;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.notifications;

-- ====== supabase/migrations/0005_rls_policies.sql ======
-- =============================================================
-- AngkorGo — 0005 Row Level Security
-- =============================================================

-- ---------- Helper: role checks ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Provider row id owned by the current user (or null)
create or replace function public.my_provider_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.providers where user_id = auth.uid();
$$;

-- Is the current user a participant (customer or assigned provider) of a request?
create or replace function public.can_access_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.service_requests sr
    where sr.id = p_request_id
      and (
        sr.customer_id = auth.uid()
        or sr.assigned_provider_id = public.my_provider_id()
        or exists (select 1 from public.service_assignments sa
                   where sa.request_id = sr.id and sa.provider_id = public.my_provider_id())
      )
  ) or public.is_admin();
$$;

-- ---------- Enable RLS on all tables ----------
alter table public.profiles               enable row level security;
alter table public.providers              enable row level security;
alter table public.provider_documents     enable row level security;
alter table public.provider_services      enable row level security;
alter table public.provider_locations     enable row level security;
alter table public.service_requests       enable row level security;
alter table public.service_request_images enable row level security;
alter table public.service_assignments    enable row level security;
alter table public.service_status_history enable row level security;
alter table public.chat_messages          enable row level security;
alter table public.payments               enable row level security;
alter table public.wallets                enable row level security;
alter table public.withdrawals            enable row level security;
alter table public.reviews                enable row level security;
alter table public.notifications          enable row level security;
alter table public.audit_logs             enable row level security;

-- ---------- profiles ----------
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- providers ----------
-- Approved providers are publicly discoverable (name, rating) for the map.
create policy "providers: public read approved" on public.providers
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "providers: insert self" on public.providers
  for insert with check (user_id = auth.uid());
create policy "providers: update own or admin" on public.providers
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ---------- provider_documents ----------
create policy "docs: owner or admin" on public.provider_documents
  for all using (provider_id = public.my_provider_id() or public.is_admin())
  with check (provider_id = public.my_provider_id() or public.is_admin());

-- ---------- provider_services ----------
create policy "services: public read" on public.provider_services
  for select using (true);
create policy "services: owner write" on public.provider_services
  for all using (provider_id = public.my_provider_id() or public.is_admin())
  with check (provider_id = public.my_provider_id() or public.is_admin());

-- ---------- provider_locations ----------
-- Owner upserts own; participants of an active request can read the provider's
-- position (enforced in app via subscription filter); admins read all.
create policy "locations: owner write" on public.provider_locations
  for all using (provider_id = public.my_provider_id())
  with check (provider_id = public.my_provider_id());
create policy "locations: read" on public.provider_locations
  for select using (
    provider_id = public.my_provider_id()
    or public.is_admin()
    or exists (select 1 from public.service_requests sr
               where sr.assigned_provider_id = provider_locations.provider_id
                 and sr.customer_id = auth.uid()
                 and sr.status in ('accepted','en_route','arrived','in_progress'))
  );

-- ---------- service_requests ----------
create policy "requests: participant read" on public.service_requests
  for select using (
    customer_id = auth.uid()
    or assigned_provider_id = public.my_provider_id()
    or exists (select 1 from public.service_assignments sa
               where sa.request_id = service_requests.id and sa.provider_id = public.my_provider_id())
    or public.is_admin()
  );
create policy "requests: customer create" on public.service_requests
  for insert with check (customer_id = auth.uid());
create policy "requests: participant update" on public.service_requests
  for update using (
    customer_id = auth.uid()
    or assigned_provider_id = public.my_provider_id()
    or public.is_admin()
  );

-- ---------- service_request_images ----------
create policy "req images: access" on public.service_request_images
  for select using (public.can_access_request(request_id));
create policy "req images: participant write" on public.service_request_images
  for insert with check (public.can_access_request(request_id) and uploaded_by = auth.uid());

-- ---------- service_assignments ----------
create policy "assignments: participant read" on public.service_assignments
  for select using (
    provider_id = public.my_provider_id()
    or public.can_access_request(request_id)
  );
-- Accept/reject flows through accept_assignment() (security definer); direct
-- updates limited to the offered provider marking a rejection.
create policy "assignments: provider respond" on public.service_assignments
  for update using (provider_id = public.my_provider_id())
  with check (provider_id = public.my_provider_id());

-- ---------- service_status_history ----------
create policy "status history: access" on public.service_status_history
  for select using (public.can_access_request(request_id));

-- ---------- chat_messages ----------
create policy "chat: access read" on public.chat_messages
  for select using (public.can_access_request(request_id));
create policy "chat: participant send" on public.chat_messages
  for insert with check (public.can_access_request(request_id) and sender_id = auth.uid());

-- ---------- payments ----------
create policy "payments: participant read" on public.payments
  for select using (
    customer_id = auth.uid()
    or provider_id = public.my_provider_id()
    or public.is_admin()
  );
create policy "payments: admin write" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- wallets ----------
create policy "wallets: owner read" on public.wallets
  for select using (provider_id = public.my_provider_id() or public.is_admin());

-- ---------- withdrawals ----------
create policy "withdrawals: owner read" on public.withdrawals
  for select using (provider_id = public.my_provider_id() or public.is_admin());
create policy "withdrawals: owner request" on public.withdrawals
  for insert with check (provider_id = public.my_provider_id());
create policy "withdrawals: admin manage" on public.withdrawals
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------- reviews ----------
create policy "reviews: public read" on public.reviews
  for select using (true);
create policy "reviews: customer create" on public.reviews
  for insert with check (customer_id = auth.uid() and public.can_access_request(request_id));

-- ---------- notifications ----------
create policy "notifications: owner read" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications: owner update" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- audit_logs ----------
create policy "audit: admin read" on public.audit_logs
  for select using (public.is_admin());

-- ====== supabase/migrations/0006_seed.sql ======
-- =============================================================
-- AngkorGo — 0006 Seed (dev only)
-- Reference data + Phnom Penh sample geometry for local testing.
-- Run AFTER creating auth users; replace the UUIDs below with real auth ids.
-- =============================================================

-- Platform config: default commission (mirrors payments.provider_rate default)
create table if not exists public.platform_config (
  key   text primary key,
  value jsonb not null
);
insert into public.platform_config (key, value) values
  ('commission_rate', '0.10'),
  ('dispatch_radii_km', '[5,10,20]'),
  ('offer_ttl_seconds', '45')
on conflict (key) do nothing;

-- Service category catalogue with EN/KM labels for the emergency screen.
create table if not exists public.service_catalog (
  category  service_category primary key,
  label_en  text not null,
  label_km  text not null,
  icon      text
);
insert into public.service_catalog (category, label_en, label_km, icon) values
  ('flat_tire',          'Flat Tire',          'កង់​បែក',            'tire'),
  ('battery_jump_start', 'Battery Jump Start', 'ជម្រុញ​ថ្ម',          'battery-charging'),
  ('battery_replacement','Battery Replacement','ប្តូរ​ថ្ម',           'battery'),
  ('fuel_delivery',      'Out of Fuel',        'អស់​ប្រេង',          'fuel'),
  ('lockout_service',    'Lockout',            'ចាក់​សោ​ជាប់',        'lock'),
  ('tow_truck',          'Tow Truck',          'រថ​អូស',             'truck'),
  ('engine_diagnosis',   'Engine Trouble',     'បញ្ហា​ម៉ាស៊ីន',       'engine'),
  ('emergency_repair',   'Emergency Repair',   'ជួសជុល​បន្ទាន់',      'wrench'),
  ('motorcycle_repair',  'Motorcycle Repair',  'ជួសជុល​ម៉ូតូ',        'motorcycle'),
  ('car_repair',         'Car Repair',         'ជួសជុល​ឡាន',         'car'),
  ('van_repair',         'Van Repair',         'ជួសជុល​រថយន្ត​ដឹក',   'van'),
  ('truck_repair',       'Truck Repair',       'ជួសជុល​ឡាន​ធំ',       'truck')
on conflict (category) do nothing;

-- NOTE: sample provider/customer rows require real auth.users ids.
-- Example (Phnom Penh, Independence Monument ≈ 104.9219, 11.5564):
--   update public.provider_locations
--     set location = st_point(104.9219, 11.5564)::geography
--     where provider_id = '<provider-uuid>';

-- ====== supabase/migrations/0007_auth_onboarding.sql ======
-- =============================================================
-- AngkorGo — 0007 Auth / Onboarding
-- Phase 2: distinguishes brand-new accounts (must pick a role) from
-- returning users, and provisions a provider row when role = provider.
-- =============================================================

alter table public.profiles
  add column if not exists onboarded boolean not null default false;

-- Recreate the signup handler: mark onboarded=true only when the client
-- explicitly supplied a role (email-OTP flow passes it; OAuth may not).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer');
  v_had_role boolean := (new.raw_user_meta_data ? 'role');
begin
  insert into public.profiles (id, full_name, phone, preferred_language, role, onboarded)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.phone,
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en'),
    v_role,
    v_had_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- When a profile becomes a provider, ensure a providers row exists (pending).
create or replace function public.ensure_provider_row()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'provider' then
    insert into public.providers (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ensure_provider on public.profiles;
create trigger trg_ensure_provider
  after insert or update of role on public.profiles
  for each row execute function public.ensure_provider_row();

-- ====== supabase/migrations/0008_requests_storage.sql ======
-- =============================================================
-- AngkorGo — 0008 Request creation RPC + Storage
-- Phase 3: Emergency Request System
-- =============================================================

-- ---------- Create a request (geography from lng/lat) ----------
-- supabase-js can't build a geography literal directly, so requests are
-- created through this RPC. Runs as invoker → the "requests: customer create"
-- RLS policy still applies (customer_id must equal auth.uid()).
create or replace function public.create_service_request(
  p_category     service_category,
  p_lng          double precision,
  p_lat          double precision,
  p_address      text default null,
  p_vehicle_type text default null,
  p_notes        text default null
)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.service_requests
    (customer_id, category, pickup_location, address, vehicle_type, notes)
  values
    (auth.uid(), p_category, st_point(p_lng, p_lat)::geography, p_address, p_vehicle_type, p_notes)
  returning id into v_id;
  return v_id;
end;
$$;

-- Read a request with its pickup point as GeoJSON (for map re-hydration).
create or replace function public.get_request(p_request_id uuid)
returns table (
  id uuid, category service_category, status request_status,
  lng double precision, lat double precision, address text,
  assigned_provider_id uuid, created_at timestamptz
)
language sql stable security invoker set search_path = public as $$
  select sr.id, sr.category, sr.status,
         st_x(sr.pickup_location::geometry), st_y(sr.pickup_location::geometry),
         sr.address, sr.assigned_provider_id, sr.created_at
  from public.service_requests sr
  where sr.id = p_request_id;   -- RLS restricts to participants/admin
$$;

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public)
values
  ('request-images', 'request-images', false),
  ('provider-docs',  'provider-docs',  false)
on conflict (id) do nothing;

-- request-images: path convention  {request_id}/{uuid}.jpg
-- Participants of the request may read; participants may upload.
create policy "req-img read" on storage.objects for select
  using (
    bucket_id = 'request-images'
    and public.can_access_request(((storage.foldername(name))[1])::uuid)
  );

create policy "req-img write" on storage.objects for insert
  with check (
    bucket_id = 'request-images'
    and public.can_access_request(((storage.foldername(name))[1])::uuid)
  );

-- provider-docs: path convention {provider_id}/{type}.jpg — owner + admin only.
create policy "prov-doc owner rw" on storage.objects for all
  using (
    bucket_id = 'provider-docs'
    and (((storage.foldername(name))[1])::uuid = public.my_provider_id() or public.is_admin())
  )
  with check (
    bucket_id = 'provider-docs'
    and (((storage.foldername(name))[1])::uuid = public.my_provider_id() or public.is_admin())
  );

-- ====== supabase/migrations/0009_dispatch_engine.sql ======
-- =============================================================
-- AngkorGo — 0009 Dispatch Engine wiring
-- Phase 4: offer inbox, reject, TTL widen/expire sweep, push + notifications
-- =============================================================

-- ---------- Track when a request last fanned out (for TTL widening) ----------
alter table public.service_requests
  add column if not exists last_dispatch_at timestamptz;

-- Re-create dispatch RPCs to stamp last_dispatch_at.
create or replace function public.dispatch_request(p_request_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_radius integer;
  v_created integer := 0;
begin
  select current_radius_km into v_radius from public.service_requests where id = p_request_id;

  insert into public.service_assignments (request_id, provider_id, distance_km, eta_minutes)
  select p_request_id, np.provider_id, np.distance_km, np.eta_minutes
  from public.find_nearby_providers(p_request_id, v_radius) np
  on conflict (request_id, provider_id) do nothing;

  get diagnostics v_created = row_count;

  update public.service_requests
    set status = 'dispatching', last_dispatch_at = now()
    where id = p_request_id and status in ('pending','dispatching');

  return v_created;
end;
$$;

create or replace function public.widen_dispatch(p_request_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
begin
  update public.service_requests
    set current_radius_km = case current_radius_km when 5 then 10 when 10 then 20 else 20 end
    where id = p_request_id;
  return public.dispatch_request(p_request_id);
end;
$$;

-- ---------- Provider rejects/declines an offer ----------
create or replace function public.reject_assignment(p_assignment_id uuid)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.service_assignments
    set status = 'rejected', responded_at = now()
    where id = p_assignment_id
      and provider_id = public.my_provider_id()   -- RLS-aligned guard
      and status = 'offered';
end;
$$;

-- ---------- Push tokens (Expo) ----------
create table if not exists public.push_tokens (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null,
  platform   text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
alter table public.push_tokens enable row level security;
create policy "push: owner rw" on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- In-app notification helper ----------
create or replace function public.notify_user(
  p_user_id uuid, p_title text, p_body text, p_type text, p_data jsonb default '{}'::jsonb
)
returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, type, data)
  values (p_user_id, p_title, p_body, p_type, p_data);
$$;

-- New offer → notify the provider's user.
create or replace function public.on_offer_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_cat service_category;
begin
  select user_id into v_user from public.providers where id = new.provider_id;
  select category into v_cat from public.service_requests where id = new.request_id;
  perform public.notify_user(
    v_user, 'New rescue request', concat('A ', v_cat, ' job is ', new.distance_km, ' km away'),
    'request_offer', jsonb_build_object('request_id', new.request_id, 'assignment_id', new.id)
  );
  return new;
end;
$$;
create trigger trg_offer_notify
  after insert on public.service_assignments
  for each row execute function public.on_offer_created();

-- Request accepted → notify the customer.
create or replace function public.on_request_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform public.notify_user(
      new.customer_id, 'Help is on the way!', 'A provider accepted your request',
      'accepted', jsonb_build_object('request_id', new.id)
    );
  end if;
  return new;
end;
$$;
create trigger trg_request_accepted_notify
  after update on public.service_requests
  for each row execute function public.on_request_accepted();

alter publication supabase_realtime add table public.push_tokens;

-- ---------- TTL sweep: widen radius or expire (called by Edge cron) ----------
create or replace function public.run_dispatch_sweep()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_ttl integer;
  v_expired integer := 0;
  v_widened integer := 0;
  r record;
begin
  select coalesce((value)::text::integer, 45) into v_ttl
  from public.platform_config where key = 'offer_ttl_seconds';
  v_ttl := coalesce(v_ttl, 45);

  -- 1) Expire requests past their hard deadline.
  with e as (
    update public.service_requests
      set status = 'expired'
      where status in ('pending','dispatching') and expires_at < now()
      returning id
  )
  select count(*) into v_expired from e;
  update public.service_assignments set status = 'expired'
    where status = 'offered'
      and request_id in (select id from public.service_requests where status = 'expired');

  -- 2) Widen requests whose current radius has gone stale without acceptance.
  for r in
    select id from public.service_requests
    where status = 'dispatching'
      and current_radius_km < 20
      and last_dispatch_at < now() - make_interval(secs => v_ttl)
  loop
    perform public.widen_dispatch(r.id);
    v_widened := v_widened + 1;
  end loop;

  return jsonb_build_object('expired', v_expired, 'widened', v_widened);
end;
$$;

-- Optional: schedule the sweep every minute with pg_cron (enable extension first).
--   select cron.schedule('dispatch-sweep', '* * * * *', $$ select public.run_dispatch_sweep(); $$);
-- Or invoke the Edge Function supabase/functions/dispatch-sweep on a 15s external cron.

-- ====== supabase/migrations/0010_gps_tracking.sql ======
-- =============================================================
-- AngkorGo — 0010 GPS Tracking
-- Phase 5: provider heartbeat upsert (validated) + realtime-friendly coords
-- =============================================================

-- Keep plain lat/lng alongside the geography so Realtime payloads carry
-- readable coordinates (geography streams as opaque WKB otherwise).
alter table public.provider_locations
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- ---------- Validated location heartbeat ----------
-- Called by the provider app every ~5s. Runs as invoker so the
-- "locations: owner write" RLS policy applies (provider_id = my_provider_id()).
-- Rejects out-of-range coordinates and implausible GPS jumps (>300 km/h).
create or replace function public.update_provider_location(
  p_lng     double precision,
  p_lat     double precision,
  p_heading numeric default null,
  p_speed   numeric default null
)
returns boolean
language plpgsql security invoker set search_path = public as $$
declare
  v_provider uuid := public.my_provider_id();
  v_prev     public.provider_locations%rowtype;
  v_dist_m   double precision;
  v_dt       double precision;
begin
  if v_provider is null then
    return false;                         -- not a provider
  end if;
  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    return false;                         -- invalid coordinates
  end if;

  select * into v_prev from public.provider_locations where provider_id = v_provider;

  -- Reject teleports: if the implied speed since the last fix is absurd, drop it.
  if found then
    v_dist_m := st_distance(v_prev.location, st_point(p_lng, p_lat)::geography);
    v_dt     := greatest(extract(epoch from (now() - v_prev.updated_at)), 1);
    if v_dist_m / v_dt > 83 then          -- ~300 km/h
      return false;
    end if;
  end if;

  insert into public.provider_locations (provider_id, location, lat, lng, heading, speed, updated_at)
  values (v_provider, st_point(p_lng, p_lat)::geography, p_lat, p_lng, p_heading, p_speed, now())
  on conflict (provider_id) do update
    set location = excluded.location, lat = excluded.lat, lng = excluded.lng,
        heading = excluded.heading, speed = excluded.speed, updated_at = now();

  return true;
end;
$$;

-- ====== supabase/migrations/0011_payments.sql ======
-- =============================================================
-- AngkorGo — 0011 Payments
-- Phase 6: invoice → escrow (held) → release → wallet credit → payout
-- Money-moving transitions go through SECURITY DEFINER RPCs with explicit
-- role guards (RLS on payments/withdrawals stays read-only for participants).
-- =============================================================

-- ---------- Provider issues an invoice for a job ----------
create or replace function public.create_invoice(
  p_request_id uuid,
  p_amount     numeric,
  p_currency   text default 'USD',
  p_invoice_url text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_provider uuid := public.my_provider_id();
  v_customer uuid;
  v_rate     numeric;
  v_id       uuid;
begin
  select customer_id into v_customer
  from public.service_requests
  where id = p_request_id
    and assigned_provider_id = v_provider
    and status in ('arrived', 'in_progress');
  if v_customer is null then
    raise exception 'Not authorized to invoice this request';
  end if;

  -- provider keeps (1 - commission); default 0.90.
  select 1 - commission_rate into v_rate from public.providers where id = v_provider;

  insert into public.payments (request_id, customer_id, provider_id, amount, currency, provider_rate, invoice_url, status)
  values (p_request_id, v_customer, v_provider, p_amount, p_currency, coalesce(v_rate, 0.9), p_invoice_url, 'pending')
  on conflict (request_id) do update
    set amount = excluded.amount, currency = excluded.currency,
        provider_rate = excluded.provider_rate, invoice_url = excluded.invoice_url,
        status = 'pending'
    where public.payments.status = 'pending'
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- Gateway confirmed capture → escrow (held) ----------
-- Called by the payment-webhook Edge Function (service role) after ABA PayWay /
-- Stripe / KHQR confirms funds. Idempotent on external_txn_id.
create or replace function public.confirm_payment(
  p_payment_id uuid,
  p_method     payment_method,
  p_txn        text default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.payments
    set status = 'held', method = p_method, external_txn_id = p_txn, paid_at = now()
    where id = p_payment_id and status = 'pending';
end;
$$;

-- ---------- Release escrow → credit provider + complete request ----------
-- Customer confirms the work is done (or admin releases). The wallet credit +
-- total_jobs bump happen via the credit_wallet_on_release trigger (0003).
create or replace function public.release_payment(p_payment_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_customer uuid; v_request uuid;
begin
  select customer_id, request_id into v_customer, v_request
  from public.payments where id = p_payment_id and status = 'held';
  if v_request is null then
    raise exception 'Payment not in a releasable state';
  end if;
  if v_customer <> auth.uid() and not public.is_admin() then
    raise exception 'Only the customer or an admin may release payment';
  end if;

  update public.payments set status = 'released' where id = p_payment_id;
  update public.service_requests set status = 'completed' where id = v_request;
end;
$$;

-- ---------- Service-role release (used by the payment webhook) ----------
-- No auth.uid() guard — restricted to service_role via GRANTs below so it can
-- never be called from a client session.
create or replace function public.release_payment_admin(p_payment_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_request uuid;
begin
  select request_id into v_request from public.payments
  where id = p_payment_id and status = 'held';
  if v_request is null then return; end if;
  update public.payments set status = 'released' where id = p_payment_id;
  update public.service_requests set status = 'completed' where id = v_request;
end;
$$;

-- Lock the webhook-only RPCs down to service_role.
revoke execute on function public.confirm_payment(uuid, payment_method, text) from anon, authenticated;
revoke execute on function public.release_payment_admin(uuid) from public, anon, authenticated;
grant execute on function public.confirm_payment(uuid, payment_method, text) to service_role;
grant execute on function public.release_payment_admin(uuid) to service_role;

-- ---------- Provider requests a payout (debits wallet, holds funds) ----------
create or replace function public.request_withdrawal(
  p_amount      numeric,
  p_method      payment_method,
  p_destination text
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_provider uuid := public.my_provider_id();
  v_balance  numeric;
  v_id       uuid;
begin
  if v_provider is null then raise exception 'Not a provider'; end if;

  select balance into v_balance from public.wallets where provider_id = v_provider for update;
  if coalesce(v_balance, 0) < p_amount then
    raise exception 'Insufficient wallet balance';
  end if;

  update public.wallets set balance = balance - p_amount, updated_at = now()
    where provider_id = v_provider;

  insert into public.withdrawals (provider_id, amount, method, destination)
  values (v_provider, p_amount, p_method, p_destination)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- Admin processes a payout (refunds wallet on rejection) ----------
create or replace function public.process_withdrawal(
  p_withdrawal_id uuid,
  p_status        withdrawal_status
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_provider uuid; v_amount numeric; v_current withdrawal_status;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;

  select provider_id, amount, status into v_provider, v_amount, v_current
  from public.withdrawals where id = p_withdrawal_id for update;

  update public.withdrawals
    set status = p_status, processed_at = now(), processed_by = auth.uid()
    where id = p_withdrawal_id;

  -- Refund the held funds if the payout is rejected.
  if p_status = 'rejected' and v_current <> 'rejected' then
    update public.wallets set balance = balance + v_amount, updated_at = now()
      where provider_id = v_provider;
  end if;
end;
$$;

alter publication supabase_realtime add table public.wallets;
alter publication supabase_realtime add table public.withdrawals;

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

-- ====== supabase/migrations/0017_ride_rpcs.sql ======
-- =============================================================
-- AngkorGo Ride — R3: rider trip RPCs
-- create_trip builds pickup/dropoff geography server-side (supabase-js can't
-- emit geography literals). get_trip returns readable coords for the map.
-- Dispatch (find_nearby_drivers / accept_trip) is R4.
-- =============================================================

create or replace function public.create_trip(
  p_class           vehicle_class,
  p_pickup_lng      double precision,
  p_pickup_lat      double precision,
  p_pickup_address  text,
  p_dropoff_lng     double precision,
  p_dropoff_lat     double precision,
  p_dropoff_address text,
  p_est_distance_km numeric,
  p_est_duration_min integer,
  p_est_fare        numeric,
  p_surge           numeric        default 1.0,
  p_payment_method  payment_method default 'cash',
  p_polyline        text           default null
)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.trips (
    rider_id, class, status,
    pickup_location, pickup_lat, pickup_lng, pickup_address,
    dropoff_location, dropoff_lat, dropoff_lng, dropoff_address, route_polyline,
    est_distance_km, est_duration_min, est_fare, surge_multiplier, currency, payment_method
  ) values (
    auth.uid(), p_class, 'searching',
    st_point(p_pickup_lng, p_pickup_lat)::geography, p_pickup_lat, p_pickup_lng, p_pickup_address,
    st_point(p_dropoff_lng, p_dropoff_lat)::geography, p_dropoff_lat, p_dropoff_lng, p_dropoff_address, p_polyline,
    p_est_distance_km, p_est_duration_min, p_est_fare, coalesce(p_surge, 1.0), 'USD', p_payment_method
  )
  returning id into v_id;   -- RLS "trips: rider create" enforces rider_id = auth.uid()
  return v_id;
end;
$$;

create or replace function public.get_trip(p_trip_id uuid)
returns table (
  id uuid, class vehicle_class, status trip_status,
  pickup_lat double precision, pickup_lng double precision, pickup_address text,
  dropoff_lat double precision, dropoff_lng double precision, dropoff_address text,
  driver_id uuid, est_fare numeric, currency text
)
language sql stable security invoker set search_path = public as $$
  select id, class, status, pickup_lat, pickup_lng, pickup_address,
         dropoff_lat, dropoff_lng, dropoff_address, driver_id, est_fare, currency
  from public.trips where id = p_trip_id;   -- RLS restricts to participants/admin
$$;

grant execute on function public.create_trip(vehicle_class, double precision, double precision, text,
  double precision, double precision, text, numeric, integer, numeric, numeric, payment_method, text)
  to authenticated;
grant execute on function public.get_trip(uuid) to authenticated;

-- ====== supabase/migrations/0018_ride_dispatch.sql ======
-- =============================================================
-- AngkorGo Ride — R4: Dispatch engine
-- Match a searching trip with the nearest online driver of the right class.
-- Mirrors the rescue engine (find_nearby_providers / accept_assignment).
-- =============================================================

-- Carry the matched vehicle on the offer.
alter table public.trip_offers add column if not exists vehicle_id uuid references public.driver_vehicles(id);

-- ---------- Nearest available drivers for a trip's class ----------
create or replace function public.find_nearby_drivers(
  p_trip_id uuid,
  p_radius_km numeric default 2
)
returns table (provider_id uuid, vehicle_id uuid, distance_km numeric, eta_minutes integer, rating numeric)
language sql stable security definer set search_path = public as $$
  with trip as (select pickup_location, class from public.trips where id = p_trip_id)
  select
    pr.id,
    (select dv.id from public.driver_vehicles dv
      where dv.provider_id = pr.id and dv.class = trip.class and dv.active and dv.verified
      order by dv.created_at limit 1),
    round((st_distance(pl.location, trip.pickup_location) / 1000.0)::numeric, 2) as distance_km,
    greatest(1, ceil((st_distance(pl.location, trip.pickup_location) / 1000.0) / 25.0 * 60.0) + 2)::int,
    pr.rating
  from trip
  join public.provider_locations pl on st_dwithin(pl.location, trip.pickup_location, p_radius_km * 1000)
  join public.providers pr on pr.id = pl.provider_id
  where pr.is_online = true and pr.status = 'approved'
    and exists (select 1 from public.driver_vehicles dv
                where dv.provider_id = pr.id and dv.class = trip.class and dv.active and dv.verified)
    and not exists (select 1 from public.trip_offers o where o.trip_id = p_trip_id and o.provider_id = pr.id)
    -- not already on an active trip or an active rescue job
    and not exists (select 1 from public.trips t
                    where t.driver_id = pr.id and t.status in ('matched','driver_arriving','driver_arrived','in_progress'))
    and not exists (select 1 from public.service_requests sr
                    where sr.assigned_provider_id = pr.id and sr.status in ('accepted','en_route','arrived','in_progress'))
  order by distance_km asc, pr.rating desc
  limit 15;
$$;

-- ---------- Dispatch fan-out ----------
create or replace function public.dispatch_trip(p_trip_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_radius numeric; v_created integer := 0;
begin
  select current_radius_km into v_radius from public.trips where id = p_trip_id;

  insert into public.trip_offers (trip_id, provider_id, vehicle_id, distance_km, eta_minutes)
  select p_trip_id, nd.provider_id, nd.vehicle_id, nd.distance_km, nd.eta_minutes
  from public.find_nearby_drivers(p_trip_id, v_radius) nd
  on conflict (trip_id, provider_id) do nothing;

  get diagnostics v_created = row_count;

  update public.trips set status = 'searching', last_dispatch_at = now()
    where id = p_trip_id and status in ('requested','searching');
  return v_created;
end;
$$;

-- ---------- Widen radius (2 → 3 → 5 km) ----------
create or replace function public.widen_dispatch_trip(p_trip_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
begin
  update public.trips
    set current_radius_km = case current_radius_km when 2 then 3 when 3 then 5 else 5 end
    where id = p_trip_id;
  return public.dispatch_trip(p_trip_id);
end;
$$;

-- ---------- Driver accepts (atomic, first-wins) ----------
create or replace function public.accept_trip(p_offer_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_trip uuid; v_provider uuid; v_vehicle uuid;
begin
  select trip_id, provider_id, vehicle_id into v_trip, v_provider, v_vehicle
  from public.trip_offers where id = p_offer_id for update;

  update public.trips
    set status = 'matched', driver_id = v_provider,
        vehicle_id = coalesce(v_vehicle, vehicle_id), matched_at = now()
    where id = v_trip and status in ('requested','searching');
  if not found then raise exception 'Trip no longer available'; end if;

  update public.trip_offers set status = 'accepted', responded_at = now() where id = p_offer_id;
  update public.trip_offers set status = 'expired'
    where trip_id = v_trip and id <> p_offer_id and status = 'offered';
end;
$$;

create or replace function public.reject_trip_offer(p_offer_id uuid)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.trip_offers set status = 'rejected', responded_at = now()
  where id = p_offer_id and provider_id = public.my_provider_id() and status = 'offered';
end;
$$;

-- ---------- Notifications ----------
create or replace function public.on_trip_offer_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_cls vehicle_class;
begin
  select user_id into v_user from public.providers where id = new.provider_id;
  select class into v_cls from public.trips where id = new.trip_id;
  perform public.notify_user(
    v_user, 'New ride request', concat(v_cls, ' · ', new.distance_km, ' km away'),
    'trip_offer', jsonb_build_object('trip_id', new.trip_id, 'offer_id', new.id));
  return new;
end;
$$;
create trigger trg_trip_offer_notify
  after insert on public.trip_offers
  for each row execute function public.on_trip_offer_created();

create or replace function public.on_trip_matched()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'matched' and old.status is distinct from 'matched' then
    perform public.notify_user(new.rider_id, 'Driver found!', 'Your driver is on the way',
      'trip_matched', jsonb_build_object('trip_id', new.id));
  end if;
  return new;
end;
$$;
create trigger trg_trip_matched_notify
  after update on public.trips
  for each row execute function public.on_trip_matched();

-- ---------- Extend the TTL sweep to also widen/expire trips ----------
create or replace function public.run_dispatch_sweep()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_ttl integer;
  v_expired integer := 0; v_widened integer := 0;
  v_trip_widened integer := 0; v_trip_expired integer := 0;
  r record;
begin
  select coalesce((value)::text::integer, 45) into v_ttl from public.platform_config where key = 'offer_ttl_seconds';
  v_ttl := coalesce(v_ttl, 45);

  -- Rescue: expire past-deadline requests, widen stale ones.
  with e as (
    update public.service_requests set status = 'expired'
      where status in ('pending','dispatching') and expires_at < now() returning id)
  select count(*) into v_expired from e;
  update public.service_assignments set status = 'expired'
    where status = 'offered' and request_id in (select id from public.service_requests where status = 'expired');
  for r in select id from public.service_requests
           where status = 'dispatching' and current_radius_km < 20 and last_dispatch_at < now() - make_interval(secs => v_ttl)
  loop perform public.widen_dispatch(r.id); v_widened := v_widened + 1; end loop;

  -- Ride: widen stale searching trips (2→3→5), then give up if still stale at max radius.
  for r in select id from public.trips
           where status = 'searching' and current_radius_km < 5 and last_dispatch_at < now() - make_interval(secs => v_ttl)
  loop perform public.widen_dispatch_trip(r.id); v_trip_widened := v_trip_widened + 1; end loop;

  with te as (
    update public.trips set status = 'no_drivers'
      where status = 'searching' and current_radius_km >= 5 and last_dispatch_at < now() - make_interval(secs => v_ttl * 2)
      returning id)
  select count(*) into v_trip_expired from te;
  update public.trip_offers set status = 'expired'
    where status = 'offered' and trip_id in (select id from public.trips where status = 'no_drivers');

  return jsonb_build_object('expired', v_expired, 'widened', v_widened,
                            'trip_widened', v_trip_widened, 'trip_expired', v_trip_expired);
end;
$$;

grant execute on function public.dispatch_trip(uuid)       to authenticated;
grant execute on function public.accept_trip(uuid)         to authenticated;
grant execute on function public.reject_trip_offer(uuid)   to authenticated;
grant execute on function public.widen_dispatch_trip(uuid) to authenticated;

-- ====== supabase/migrations/0019_ride_tracking.sql ======
-- =============================================================
-- AngkorGo Ride — R5: Live tracking
-- Let a trip's rider read their driver's live location, and expose driver +
-- vehicle details for the tracking card.
-- =============================================================

-- Rider can read the assigned driver's location while the trip is active.
-- (Adds to the existing provider_locations SELECT policies — they OR together.)
create policy "locations: trip rider read" on public.provider_locations
  for select using (
    exists (
      select 1 from public.trips t
      where t.driver_id = provider_locations.provider_id
        and t.rider_id = auth.uid()
        and t.status in ('matched', 'driver_arriving', 'driver_arrived', 'in_progress')
    )
  );

-- Driver + vehicle details for the rider's tracking card (RLS-guarded).
create or replace function public.get_trip_driver(p_trip_id uuid)
returns table (
  driver_name text, rating numeric, total_jobs integer,
  vehicle_class vehicle_class, plate_number text, color text, photo_url text
)
language sql stable security definer set search_path = public as $$
  select pf.full_name, pr.rating, pr.total_jobs, dv.class, dv.plate_number, dv.color, dv.photo_url
  from public.trips t
  join public.providers pr on pr.id = t.driver_id
  join public.profiles pf on pf.id = pr.user_id
  left join public.driver_vehicles dv on dv.id = t.vehicle_id
  where t.id = p_trip_id and public.can_access_trip(p_trip_id);
$$;

grant execute on function public.get_trip_driver(uuid) to authenticated;

-- ====== supabase/migrations/0020_ride_payments.sql ======
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

-- ====== supabase/migrations/0021_platform_config_rls.sql ======
-- =============================================================
-- AngkorGo — 0021 Secure platform_config + global surge
-- Public can read config (fares/surge); only admins can change it.
-- =============================================================

alter table public.platform_config enable row level security;

create policy "config: public read" on public.platform_config
  for select using (true);
create policy "config: admin write" on public.platform_config
  for all using (public.is_admin()) with check (public.is_admin());

-- Global ride surge multiplier (Phnom Penh single-zone launch).
insert into public.platform_config (key, value) values ('surge_multiplier', '1.0')
  on conflict (key) do nothing;

