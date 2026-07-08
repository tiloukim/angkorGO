-- =============================================================
-- AngkorGo Express (parcel/package delivery, Grab Express / GoSend style).
-- Point-to-point courier delivery: sender → courier → recipient, with
-- proof-of-delivery (a 4-digit code the recipient gives the courier + an
-- optional photo). Reuses the dispatch, tracking, and payments backbone; the
-- courier is the same provider that does food delivery. Mirrors 0023/0024.
-- =============================================================

create type parcel_status as enum (
  'requested',          -- created
  'searching',          -- dispatching to couriers
  'courier_assigned',   -- a courier accepted
  'picked_up',          -- courier has the parcel
  'delivering',         -- en route to recipient
  'delivered',
  'cancelled'
);

create type parcel_size as enum ('small', 'medium', 'large');

-- ---------- Parcels ----------
create table public.parcels (
  id                uuid primary key default gen_random_uuid(),
  sender_id         uuid not null references public.profiles(id) on delete cascade,
  courier_id        uuid references public.providers(id),
  status            parcel_status not null default 'requested',

  pickup_location   geography(Point, 4326) not null,
  pickup_lat        double precision,
  pickup_lng        double precision,
  pickup_address    text,

  dropoff_location  geography(Point, 4326) not null,
  dropoff_lat       double precision,
  dropoff_lng       double precision,
  dropoff_address   text,
  recipient_name    text,
  recipient_phone   text,

  size              parcel_size not null default 'small',
  note              text,
  photo_url         text,

  -- proof of delivery
  delivery_code     text not null,         -- 4-digit; sender shares with recipient
  proof_photo_url   text,

  distance_km       numeric(7,2),
  fee               numeric(10,2) not null,
  currency          text not null default 'USD',
  payment_method    payment_method,

  current_radius_km numeric not null default 3,
  last_dispatch_at  timestamptz,
  requested_at      timestamptz not null default now(),
  assigned_at       timestamptz,
  picked_up_at      timestamptz,
  delivered_at      timestamptz,
  cancelled_at      timestamptz,
  cancel_reason     text,
  updated_at        timestamptz not null default now()
);
create index idx_parcels_sender on public.parcels (sender_id);
create index idx_parcels_courier on public.parcels (courier_id);
create index idx_parcels_status on public.parcels (status);
create index idx_parcels_pickup_geo on public.parcels using gist (pickup_location);

-- ---------- Courier dispatch offers (mirrors courier_offers) ----------
create table public.parcel_offers (
  id           uuid primary key default gen_random_uuid(),
  parcel_id    uuid not null references public.parcels(id) on delete cascade,
  provider_id  uuid not null references public.providers(id) on delete cascade,
  status       assignment_status not null default 'offered',
  distance_km  numeric(6,2),
  eta_minutes  integer,
  offered_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (parcel_id, provider_id)
);
create index idx_parcel_offers_parcel on public.parcel_offers (parcel_id);
create index idx_parcel_offers_provider on public.parcel_offers (provider_id, status);

-- ---------- Payments: add parcel as a fifth source ----------
alter table public.payments add column if not exists parcel_id uuid references public.parcels(id) on delete cascade;
create unique index if not exists idx_payments_parcel on public.payments (parcel_id) where parcel_id is not null;
alter table public.payments drop constraint if exists payments_one_source;
alter table public.payments add constraint payments_one_source
  check (num_nonnulls(request_id, trip_id, booking_id, order_id, parcel_id) = 1);

-- Express fare config (Phnom Penh launch, USD).
insert into public.platform_config (key, value) values
  ('parcel_base_fee', '1.00'), ('parcel_per_km', '0.30'), ('parcel_min_fee', '1.25')
  on conflict (key) do nothing;

create trigger trg_parcels_updated before update on public.parcels
  for each row execute function public.set_updated_at();

-- Public bucket for parcel + proof-of-delivery photos.
insert into storage.buckets (id, name, public) values ('parcels', 'parcels', true)
  on conflict (id) do nothing;
create policy "parcels img read" on storage.objects for select using (bucket_id = 'parcels');
create policy "parcels img write" on storage.objects for insert
  with check (bucket_id = 'parcels' and auth.role() = 'authenticated');

-- ---------- RLS ----------
create or replace function public.can_access_parcel(p_parcel uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.parcels p where p.id = p_parcel
      and (p.sender_id = auth.uid()
        or p.courier_id = public.my_provider_id()
        or exists (select 1 from public.parcel_offers o where o.parcel_id = p.id and o.provider_id = public.my_provider_id()))
  ) or public.is_admin();
$$;

alter table public.parcels       enable row level security;
alter table public.parcel_offers enable row level security;

create policy "parcels: participant read" on public.parcels for select using (can_access_parcel(id));
create policy "parcels: sender create" on public.parcels for insert with check (sender_id = auth.uid());
create policy "parcels: participant update" on public.parcels for update using (
  sender_id = auth.uid() or courier_id = public.my_provider_id());

create policy "parcel_offers: read" on public.parcel_offers for select using (
  provider_id = public.my_provider_id() or public.can_access_parcel(parcel_id));
create policy "parcel_offers: respond" on public.parcel_offers for update
  using (provider_id = public.my_provider_id()) with check (provider_id = public.my_provider_id());

grant select, insert, update, delete on public.parcels, public.parcel_offers to anon, authenticated;

alter publication supabase_realtime add table public.parcels;
alter publication supabase_realtime add table public.parcel_offers;

-- =============================================================
-- RPCs
-- =============================================================

-- Sender creates a parcel (server prices it + generates the delivery code).
create or replace function public.place_parcel(
  p_pickup_lng double precision, p_pickup_lat double precision, p_pickup_address text,
  p_dropoff_lng double precision, p_dropoff_lat double precision, p_dropoff_address text,
  p_recipient_name text, p_recipient_phone text,
  p_size parcel_size, p_note text, p_photo_url text,
  p_distance_km numeric, p_method payment_method default 'cash'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_base numeric; v_per_km numeric; v_min numeric; v_mult numeric; v_fee numeric;
  v_code text; v_id uuid;
begin
  select (value)::text::numeric into v_base   from public.platform_config where key = 'parcel_base_fee';
  select (value)::text::numeric into v_per_km from public.platform_config where key = 'parcel_per_km';
  select (value)::text::numeric into v_min    from public.platform_config where key = 'parcel_min_fee';
  v_mult := case p_size when 'small' then 1.0 when 'medium' then 1.3 else 1.6 end;
  v_fee  := round(greatest(coalesce(v_min, 1.25),
              (coalesce(v_base, 1.0) + coalesce(v_per_km, 0.30) * coalesce(p_distance_km, 0)) * v_mult), 2);
  v_code := lpad((floor(random() * 10000))::int::text, 4, '0');

  insert into public.parcels (
    sender_id, status, pickup_location, pickup_lat, pickup_lng, pickup_address,
    dropoff_location, dropoff_lat, dropoff_lng, dropoff_address, recipient_name, recipient_phone,
    size, note, photo_url, delivery_code, distance_km, fee, payment_method)
  values (
    auth.uid(), 'searching', st_point(p_pickup_lng, p_pickup_lat)::geography, p_pickup_lat, p_pickup_lng, p_pickup_address,
    st_point(p_dropoff_lng, p_dropoff_lat)::geography, p_dropoff_lat, p_dropoff_lng, p_dropoff_address, p_recipient_name, p_recipient_phone,
    p_size, p_note, p_photo_url, v_code, p_distance_km, v_fee, p_method)
  returning id into v_id;
  return v_id;
end; $$;

-- Nearest available couriers to the parcel PICKUP.
create or replace function public.find_nearby_parcel_couriers(p_parcel uuid, p_radius numeric default 3)
returns table (provider_id uuid, distance_km numeric, eta_minutes integer, rating numeric)
language sql stable security definer set search_path = public as $$
  with pk as (select pickup_location as loc from public.parcels where id = p_parcel)
  select pr.id,
    round((st_distance(pl.location, pk.loc) / 1000.0)::numeric, 2) as distance_km,
    greatest(1, ceil((st_distance(pl.location, pk.loc) / 1000.0) / 20.0 * 60.0) + 3)::int,
    pr.rating
  from pk
  join public.provider_locations pl on st_dwithin(pl.location, pk.loc, p_radius * 1000)
  join public.providers pr on pr.id = pl.provider_id
  where pr.is_online and pr.status = 'approved'
    and not exists (select 1 from public.parcel_offers c where c.parcel_id = p_parcel and c.provider_id = pr.id)
    and not exists (select 1 from public.parcels x where x.courier_id = pr.id and x.status in ('courier_assigned','picked_up','delivering'))
    and not exists (select 1 from public.orders o where o.courier_id = pr.id and o.status in ('courier_assigned','picked_up','delivering'))
    and not exists (select 1 from public.trips t where t.driver_id = pr.id and t.status in ('matched','driver_arriving','driver_arrived','in_progress'))
  order by distance_km asc, pr.rating desc
  limit 15;
$$;

create or replace function public.dispatch_parcel(p_parcel uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_radius numeric; v_created integer := 0;
begin
  update public.parcels set status = 'searching', last_dispatch_at = now()
    where id = p_parcel and status = 'searching';
  select current_radius_km into v_radius from public.parcels where id = p_parcel;
  insert into public.parcel_offers (parcel_id, provider_id, distance_km, eta_minutes)
  select p_parcel, nc.provider_id, nc.distance_km, nc.eta_minutes
  from public.find_nearby_parcel_couriers(p_parcel, v_radius) nc
  on conflict (parcel_id, provider_id) do nothing;
  get diagnostics v_created = row_count;
  return v_created;
end; $$;

create or replace function public.widen_parcel(p_parcel uuid)
returns integer language plpgsql security definer set search_path = public as $$
begin
  update public.parcels set current_radius_km = case current_radius_km when 3 then 5 when 5 then 8 else 8 end
    where id = p_parcel;
  return public.dispatch_parcel(p_parcel);
end; $$;

-- Courier accepts (atomic first-wins).
create or replace function public.accept_parcel_offer(p_offer uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_parcel uuid; v_provider uuid;
begin
  select parcel_id, provider_id into v_parcel, v_provider from public.parcel_offers where id = p_offer for update;
  update public.parcels set status = 'courier_assigned', courier_id = v_provider, assigned_at = now()
    where id = v_parcel and status = 'searching';
  if not found then raise exception 'Parcel no longer available'; end if;
  update public.parcel_offers set status = 'accepted', responded_at = now() where id = p_offer;
  update public.parcel_offers set status = 'expired' where parcel_id = v_parcel and id <> p_offer and status = 'offered';
end; $$;

create or replace function public.reject_parcel_offer(p_offer uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.parcel_offers set status = 'rejected', responded_at = now()
  where id = p_offer and provider_id = public.my_provider_id() and status = 'offered';
end; $$;

-- Courier advances pickup → delivering (NOT delivered — that needs proof).
create or replace function public.advance_parcel(p_parcel uuid, p_to parcel_status)
returns void language plpgsql security definer set search_path = public as $$
declare v_courier uuid;
begin
  select courier_id into v_courier from public.parcels where id = p_parcel;
  if v_courier <> public.my_provider_id() and not public.is_admin() then
    raise exception 'Only the courier can update this parcel';
  end if;
  if p_to not in ('picked_up','delivering') then raise exception 'Use deliver_parcel to complete'; end if;
  update public.parcels set status = p_to,
    picked_up_at = case when p_to = 'picked_up' then now() else picked_up_at end
    where id = p_parcel;
end; $$;

-- Courier completes delivery with proof (recipient code + optional photo).
-- Settles the fee: cash → courier owes commission (driver_ledger); cashless →
-- pending payment (sender pays → release credits courier). Mirrors settle_trip.
create or replace function public.deliver_parcel(p_parcel uuid, p_code text, p_proof_photo_url text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_courier uuid; v_sender uuid; v_fee numeric; v_method payment_method; v_code text; v_rate numeric; v_pay uuid;
begin
  select courier_id, sender_id, fee, coalesce(payment_method, 'cash'), delivery_code
    into v_courier, v_sender, v_fee, v_method, v_code
  from public.parcels where id = p_parcel and status in ('picked_up','delivering');
  if v_courier is null then raise exception 'Parcel not in a deliverable state'; end if;
  if v_courier <> public.my_provider_id() and not public.is_admin() then
    raise exception 'Only the courier can deliver this parcel';
  end if;
  if p_code is distinct from v_code then raise exception 'Wrong delivery code'; end if;

  update public.parcels set status = 'delivered', delivered_at = now(), proof_photo_url = p_proof_photo_url
    where id = p_parcel;

  select 1 - commission_rate into v_rate from public.providers where id = v_courier;
  v_rate := coalesce(v_rate, 0.9);
  if v_method = 'cash' then
    insert into public.driver_ledger (provider_id, trip_id, amount, reason)
      values (v_courier, null, -round(v_fee * (1 - v_rate), 2), 'cash parcel commission');
    return null;
  else
    insert into public.payments (parcel_id, customer_id, provider_id, amount, provider_rate, method, status)
      values (p_parcel, v_sender, v_courier, v_fee, v_rate, v_method, 'pending')
      returning id into v_pay;
    return v_pay;
  end if;
end; $$;

create or replace function public.cancel_parcel(p_parcel uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_p public.parcels%rowtype; v_uid uuid := auth.uid(); v_provider uuid;
begin
  select * into v_p from public.parcels where id = p_parcel for update;
  if v_p.id is null then raise exception 'Parcel not found'; end if;
  if v_p.status in ('delivered','cancelled') then raise exception 'Parcel can no longer be cancelled'; end if;
  select id into v_provider from public.providers where user_id = v_uid;
  if v_uid <> v_p.sender_id and (v_provider is null or v_p.courier_id is null or v_provider <> v_p.courier_id) and not public.is_admin() then
    raise exception 'Not allowed to cancel this parcel';
  end if;
  update public.parcels set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason where id = p_parcel;
  update public.parcel_offers set status = 'expired' where parcel_id = p_parcel and status = 'offered';
  update public.payments set status = case when status = 'held' then 'refunded' else 'failed' end
    where parcel_id = p_parcel and status in ('pending','held');
end; $$;

-- ---------- Notifications ----------
create or replace function public.on_parcel_offer_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  select user_id into v_user from public.providers where id = new.provider_id;
  perform public.notify_user(v_user, 'New delivery', concat('Parcel · ', new.distance_km, ' km away'),
    'parcel_offer', jsonb_build_object('parcel_id', new.parcel_id, 'offer_id', new.id));
  return new;
end; $$;
create trigger trg_parcel_offer_notify after insert on public.parcel_offers
  for each row execute function public.on_parcel_offer_created();

create or replace function public.on_parcel_assigned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'courier_assigned' and old.status is distinct from 'courier_assigned' then
    perform public.notify_user(new.sender_id, 'Courier assigned', 'A courier is picking up your parcel',
      'parcel_assigned', jsonb_build_object('parcel_id', new.id));
  end if;
  return new;
end; $$;
create trigger trg_parcel_assigned_notify after update on public.parcels
  for each row execute function public.on_parcel_assigned();

grant execute on function public.place_parcel(double precision, double precision, text, double precision, double precision, text, text, text, parcel_size, text, text, numeric, payment_method) to authenticated;
grant execute on function public.dispatch_parcel(uuid)        to authenticated;
grant execute on function public.widen_parcel(uuid)           to authenticated;
grant execute on function public.accept_parcel_offer(uuid)    to authenticated;
grant execute on function public.reject_parcel_offer(uuid)    to authenticated;
grant execute on function public.advance_parcel(uuid, parcel_status) to authenticated;
grant execute on function public.deliver_parcel(uuid, text, text) to authenticated;
grant execute on function public.cancel_parcel(uuid, text)    to authenticated;
