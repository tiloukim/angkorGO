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
