-- =============================================================
-- AngkorGo Rescue — 0008 Request creation RPC + Storage
-- Phase 3: Emergency Request System
-- =============================================================

-- ---------- Create a request (geography from lng/lat) ----------
-- supabase-js can't build a geography literal directly, so requests are
-- created through this RPC. Runs as invoker → the "requests: customer create"
-- RLS policy still applies (customer_id must equal auth.uid()).
create or replace function public.create_service_request(
  p_category     service_category,
  p_lng          double precision,
  p_lat          double precision,
  p_address      text default null,
  p_vehicle_type text default null,
  p_notes        text default null
)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.service_requests
    (customer_id, category, pickup_location, address, vehicle_type, notes)
  values
    (auth.uid(), p_category, st_point(p_lng, p_lat)::geography, p_address, p_vehicle_type, p_notes)
  returning id into v_id;
  return v_id;
end;
$$;

-- Read a request with its pickup point as GeoJSON (for map re-hydration).
create or replace function public.get_request(p_request_id uuid)
returns table (
  id uuid, category service_category, status request_status,
  lng double precision, lat double precision, address text,
  assigned_provider_id uuid, created_at timestamptz
)
language sql stable security invoker set search_path = public as $$
  select sr.id, sr.category, sr.status,
         st_x(sr.pickup_location::geometry), st_y(sr.pickup_location::geometry),
         sr.address, sr.assigned_provider_id, sr.created_at
  from public.service_requests sr
  where sr.id = p_request_id;   -- RLS restricts to participants/admin
$$;

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public)
values
  ('request-images', 'request-images', false),
  ('provider-docs',  'provider-docs',  false)
on conflict (id) do nothing;

-- request-images: path convention  {request_id}/{uuid}.jpg
-- Participants of the request may read; participants may upload.
create policy "req-img read" on storage.objects for select
  using (
    bucket_id = 'request-images'
    and public.can_access_request(((storage.foldername(name))[1])::uuid)
  );

create policy "req-img write" on storage.objects for insert
  with check (
    bucket_id = 'request-images'
    and public.can_access_request(((storage.foldername(name))[1])::uuid)
  );

-- provider-docs: path convention {provider_id}/{type}.jpg — owner + admin only.
create policy "prov-doc owner rw" on storage.objects for all
  using (
    bucket_id = 'provider-docs'
    and (((storage.foldername(name))[1])::uuid = public.my_provider_id() or public.is_admin())
  )
  with check (
    bucket_id = 'provider-docs'
    and (((storage.foldername(name))[1])::uuid = public.my_provider_id() or public.is_admin())
  );
