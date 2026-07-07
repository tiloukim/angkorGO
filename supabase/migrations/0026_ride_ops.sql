-- =============================================================
-- AngkorGo Ride — ops hardening
--   #4 cancel_trip() so cancellation runs server-side (offer cleanup + audit)
--   #3 schedule run_dispatch_sweep() so stale trips auto-widen/expire
--   #5 block drivers from going online while they owe too much cash commission
-- =============================================================

-- ---------- #4 Server-side trip cancellation ----------
create or replace function public.cancel_trip(p_trip uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_trip     public.trips%rowtype;
  v_uid      uuid := auth.uid();
  v_provider uuid;
begin
  select * into v_trip from public.trips where id = p_trip for update;
  if v_trip.id is null then raise exception 'Trip not found'; end if;
  if v_trip.status in ('completed','cancelled','expired','no_drivers') then
    raise exception 'Trip can no longer be cancelled';
  end if;

  select id into v_provider from public.providers where user_id = v_uid;
  if v_uid <> v_trip.rider_id and (v_provider is null or v_provider <> v_trip.driver_id) then
    raise exception 'Not a participant of this trip';
  end if;

  update public.trips
    set status = 'cancelled', cancelled_at = now(),
        cancel_reason = coalesce(p_reason,
          case when v_uid = v_trip.rider_id then 'rider_cancelled' else 'driver_cancelled' end)
    where id = p_trip;

  -- Free any drivers still holding an offer for this trip.
  update public.trip_offers set status = 'expired'
    where trip_id = p_trip and status = 'offered';
end;
$$;
grant execute on function public.cancel_trip(uuid, text) to authenticated;

-- ---------- #3 Auto-run the dispatch sweep ----------
-- run_dispatch_sweep() widens the search radius for stale trips and expires
-- offers/trips past their TTL. Schedule it so it doesn't depend on the app.
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('ride-dispatch-sweep');
exception when others then null;  -- not scheduled yet
end $$;

-- Every minute (universally-supported cron syntax). If your pg_cron supports
-- sub-minute intervals you can change this to '30 seconds' for faster widening.
select cron.schedule('ride-dispatch-sweep', '* * * * *', $$ select public.run_dispatch_sweep(); $$);

-- ---------- #5 Cash-commission cap: block going online while over-owed ----------
create or replace function public.enforce_commission_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owed numeric;
  v_cap  numeric := coalesce((select (value)::text::numeric from public.platform_config
                              where key = 'cash_commission_cap'), 20);  -- default $20
begin
  if new.is_online = true and coalesce(old.is_online, false) = false then
    select coalesce(sum(amount), 0) into v_owed from public.driver_ledger where provider_id = new.id;
    if v_owed <= -v_cap then
      raise exception 'You owe $% in cash commission. Please settle up before going online.', abs(v_owed);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_commission_cap on public.providers;
create trigger trg_enforce_commission_cap
  before update on public.providers
  for each row execute function public.enforce_commission_cap();
