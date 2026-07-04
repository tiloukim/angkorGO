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
