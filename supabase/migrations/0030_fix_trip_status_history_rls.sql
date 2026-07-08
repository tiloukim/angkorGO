-- =============================================================
-- Fix: create_trip failed with "new row violates row-level security policy
-- for table trip_status_history".
--
-- create_trip is security invoker, so its trip INSERT fires log_trip_status()
-- as the rider. That trigger inserts an audit row into trip_status_history,
-- which has RLS enabled but only a SELECT policy — so the write is blocked and
-- the whole request aborts. Audit-trail triggers should run as definer.
--
-- Making the function security definer (search_path pinned) lets the audit
-- insert bypass RLS, exactly like the other definer triggers in the schema.
-- Function body is unchanged from 0013.
-- =============================================================

create or replace function public.log_trip_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.trip_status_history (trip_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;
