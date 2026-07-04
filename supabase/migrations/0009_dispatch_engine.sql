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
