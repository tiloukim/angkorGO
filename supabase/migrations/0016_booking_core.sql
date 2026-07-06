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
