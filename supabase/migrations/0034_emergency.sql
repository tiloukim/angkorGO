-- =============================================================
-- AngkorGo Safety — membership-gated Emergency SOS.
-- A member presses SOS → we find the nearest partnered police station, create an
-- alert, and notify ops. NOTE: actual police response depends on real agreements
-- + a reliable delivery channel (SMS/phone/station dashboard); this migration is
-- the software framework only. The app must tell users to call 117 for immediate
-- danger. Platform pays each station a monthly_fee (billing is an ops process).
-- =============================================================

-- ---------- Membership (gates the SOS feature) ----------
alter table public.profiles add column if not exists membership_until timestamptz;

create or replace function public.is_member(p_user uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = coalesce(p_user, auth.uid())
      and membership_until is not null and membership_until > now()
  );
$$;

create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  plan       text not null default 'monthly',
  amount     numeric(10,2) not null,
  currency   text not null default 'USD',
  method     payment_method,
  status     text not null default 'active',   -- active | expired | cancelled
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index idx_memberships_user on public.memberships (user_id, created_at);

insert into public.platform_config (key, value) values ('membership_monthly_fee', '2.00')
  on conflict (key) do nothing;

-- Subscribe / renew. SANDBOX: activates immediately. TODO: gate activation on a
-- confirmed ABA PayWay / Bakong payment before extending membership_until.
create or replace function public.start_membership(p_method payment_method default 'khqr')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_fee numeric; v_until timestamptz; v_id uuid;
begin
  select (value)::text::numeric into v_fee from public.platform_config where key = 'membership_monthly_fee';
  v_fee := coalesce(v_fee, 2.00);
  select membership_until into v_until from public.profiles where id = auth.uid();
  v_until := greatest(coalesce(v_until, now()), now()) + interval '1 month';
  update public.profiles set membership_until = v_until where id = auth.uid();
  insert into public.memberships (user_id, amount, method, expires_at)
    values (auth.uid(), v_fee, p_method, v_until) returning id into v_id;
  return v_id;
end; $$;

-- ---------- Police stations (partners) ----------
create table public.police_stations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  address     text,
  location    geography(Point, 4326) not null,
  lat         double precision,
  lng         double precision,
  monthly_fee numeric(10,2) not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index idx_police_stations_geo on public.police_stations using gist (location);

-- ---------- Emergency alerts ----------
create type emergency_status as enum ('active', 'acknowledged', 'resolved', 'cancelled');

create table public.emergency_alerts (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references public.profiles(id) on delete cascade,
  station_id     uuid references public.police_stations(id),
  status         emergency_status not null default 'active',
  location       geography(Point, 4326) not null,
  lat            double precision,
  lng            double precision,
  note           text,
  created_at     timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at    timestamptz,
  cancelled_at   timestamptz
);
create index idx_emergency_member on public.emergency_alerts (member_id, created_at);
create index idx_emergency_status on public.emergency_alerts (status);

-- ---------- RLS ----------
alter table public.memberships      enable row level security;
alter table public.police_stations  enable row level security;
alter table public.emergency_alerts enable row level security;

create policy "memberships: owner read" on public.memberships
  for select using (user_id = auth.uid() or public.is_admin());

create policy "stations: read active" on public.police_stations
  for select using (active or public.is_admin());
create policy "stations: admin manage" on public.police_stations
  for all using (public.is_admin()) with check (public.is_admin());

create policy "emergency: member read own" on public.emergency_alerts
  for select using (member_id = auth.uid() or public.is_admin());
create policy "emergency: member update own" on public.emergency_alerts
  for update using (member_id = auth.uid() or public.is_admin());

grant select on public.police_stations to anon, authenticated;
grant select, update on public.emergency_alerts to authenticated;
grant select on public.memberships to authenticated;

alter publication supabase_realtime add table public.emergency_alerts;

-- ---------- RPCs ----------
-- Trigger an SOS. Members only. Finds the nearest active station, records the
-- alert, and notifies ops (real SMS/station delivery is a follow-up edge fn).
create or replace function public.trigger_emergency(p_lng double precision, p_lat double precision, p_note text default null)
returns table (alert_id uuid, station_name text, station_phone text, distance_km numeric)
language plpgsql security definer set search_path = public as $$
declare v_pt geography; v_st record; v_alert uuid; r record;
begin
  if not public.is_member() then raise exception 'Emergency SOS requires an active membership'; end if;
  v_pt := st_point(p_lng, p_lat)::geography;

  select ps.id, ps.name, ps.phone,
         round((st_distance(ps.location, v_pt) / 1000.0)::numeric, 2) as dist
    into v_st
  from public.police_stations ps
  where ps.active
  order by ps.location <-> v_pt
  limit 1;

  insert into public.emergency_alerts (member_id, station_id, location, lat, lng, note)
    values (auth.uid(), v_st.id, v_pt, p_lat, p_lng, p_note)
    returning id into v_alert;

  -- Notify ops/admins so the alert is visible in the dashboard. Station SMS/phone
  -- delivery is intentionally out of scope here (needs a real gateway + agreements).
  for r in select id from public.profiles where role = 'admin' loop
    perform public.notify_user(r.id, '🚨 Emergency SOS',
      concat('A member triggered SOS near ', coalesce(v_st.name, 'unknown area')),
      'emergency', jsonb_build_object('alert_id', v_alert, 'lat', p_lat, 'lng', p_lng));
  end loop;

  return query select v_alert, v_st.name, v_st.phone, v_st.dist;
end; $$;

create or replace function public.cancel_emergency(p_alert uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.emergency_alerts set status = 'cancelled', cancelled_at = now()
    where id = p_alert and member_id = auth.uid() and status in ('active','acknowledged');
end; $$;

-- Admin/ops acknowledges or resolves an alert.
create or replace function public.set_emergency_status(p_alert uuid, p_status emergency_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  update public.emergency_alerts set status = p_status,
    acknowledged_at = case when p_status = 'acknowledged' then now() else acknowledged_at end,
    resolved_at     = case when p_status = 'resolved' then now() else resolved_at end
    where id = p_alert;
end; $$;

grant execute on function public.is_member(uuid)            to authenticated;
grant execute on function public.start_membership(payment_method) to authenticated;
grant execute on function public.trigger_emergency(double precision, double precision, text) to authenticated;
grant execute on function public.cancel_emergency(uuid)     to authenticated;
grant execute on function public.set_emergency_status(uuid, emergency_status) to authenticated;
