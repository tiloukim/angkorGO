-- =============================================================
-- AngkorGo Rescue — 0004 Dispatch Functions & Realtime
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
