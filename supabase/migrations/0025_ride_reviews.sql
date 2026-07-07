-- =============================================================
-- AngkorGo Ride — bidirectional trip ratings (rider ⇄ driver)
-- Mirrors the rescue `reviews` + `booking_reviews` pattern. A driver's
-- providers.rating is recomputed across BOTH rescue reviews and rider→driver
-- trip reviews, so one average reflects all their work.
-- =============================================================

create type trip_review_by as enum ('rider', 'driver');

create table public.trip_reviews (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  by_role    trip_review_by not null,                       -- who wrote it
  rider_id   uuid not null references public.profiles(id),   -- the trip's rider
  driver_id  uuid not null references public.providers(id),  -- the trip's driver
  rating     integer not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  unique (trip_id, by_role)                                  -- one per side per trip
);
create index idx_trip_reviews_driver on public.trip_reviews (driver_id);
create index idx_trip_reviews_rider  on public.trip_reviews (rider_id);

-- ---------- Unified provider-rating recompute (rescue + ride) ----------
create or replace function public.recompute_provider_rating_all(p_provider uuid)
returns void language sql security definer set search_path = public as $$
  update public.providers p
  set rating = coalesce((
    select round(avg(r)::numeric, 1) from (
      select rating as r from public.reviews      where provider_id = p_provider
      union all
      select rating as r from public.trip_reviews where driver_id = p_provider and by_role = 'rider'
    ) x
  ), 0)
  where p.id = p_provider;
$$;

-- Point the existing rescue-review trigger at the unified recompute.
create or replace function public.recompute_provider_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_provider_rating_all(new.provider_id);
  return new;
end;
$$;

-- Recompute when a rider rates a driver.
create or replace function public.recompute_provider_rating_from_trip()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.by_role = 'rider' then
    perform public.recompute_provider_rating_all(new.driver_id);
  end if;
  return new;
end;
$$;
create trigger trg_trip_review_rating
  after insert on public.trip_reviews
  for each row execute function public.recompute_provider_rating_from_trip();

-- ---------- Submit a trip review (rider→driver or driver→rider) ----------
create or replace function public.submit_trip_review(
  p_trip uuid, p_rating integer, p_comment text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_trip     public.trips%rowtype;
  v_uid      uuid := auth.uid();
  v_provider uuid;
  v_role     trip_review_by;
begin
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be 1-5'; end if;

  select * into v_trip from public.trips where id = p_trip;
  if v_trip.id is null then raise exception 'Trip not found'; end if;
  if v_trip.status <> 'completed' then raise exception 'Trip is not completed'; end if;
  if v_trip.driver_id is null then raise exception 'Trip has no driver'; end if;

  select id into v_provider from public.providers where user_id = v_uid;

  if v_uid = v_trip.rider_id then
    v_role := 'rider';
  elsif v_provider is not null and v_provider = v_trip.driver_id then
    v_role := 'driver';
  else
    raise exception 'Not a participant of this trip';
  end if;

  insert into public.trip_reviews (trip_id, by_role, rider_id, driver_id, rating, comment)
  values (p_trip, v_role, v_trip.rider_id, v_trip.driver_id, p_rating, p_comment)
  on conflict (trip_id, by_role) do update
    set rating = excluded.rating, comment = excluded.comment;
end;
$$;
grant execute on function public.submit_trip_review(uuid, integer, text) to authenticated;

-- ---------- RLS + grants ----------
alter table public.trip_reviews enable row level security;
create policy "trip reviews: public read" on public.trip_reviews for select using (true);
-- Writes go exclusively through submit_trip_review() (security definer).
grant select on public.trip_reviews to anon, authenticated;
