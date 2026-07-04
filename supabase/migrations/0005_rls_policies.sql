-- =============================================================
-- AngkorGo Rescue — 0005 Row Level Security
-- =============================================================

-- ---------- Helper: role checks ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Provider row id owned by the current user (or null)
create or replace function public.my_provider_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.providers where user_id = auth.uid();
$$;

-- Is the current user a participant (customer or assigned provider) of a request?
create or replace function public.can_access_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.service_requests sr
    where sr.id = p_request_id
      and (
        sr.customer_id = auth.uid()
        or sr.assigned_provider_id = public.my_provider_id()
        or exists (select 1 from public.service_assignments sa
                   where sa.request_id = sr.id and sa.provider_id = public.my_provider_id())
      )
  ) or public.is_admin();
$$;

-- ---------- Enable RLS on all tables ----------
alter table public.profiles               enable row level security;
alter table public.providers              enable row level security;
alter table public.provider_documents     enable row level security;
alter table public.provider_services      enable row level security;
alter table public.provider_locations     enable row level security;
alter table public.service_requests       enable row level security;
alter table public.service_request_images enable row level security;
alter table public.service_assignments    enable row level security;
alter table public.service_status_history enable row level security;
alter table public.chat_messages          enable row level security;
alter table public.payments               enable row level security;
alter table public.wallets                enable row level security;
alter table public.withdrawals            enable row level security;
alter table public.reviews                enable row level security;
alter table public.notifications          enable row level security;
alter table public.audit_logs             enable row level security;

-- ---------- profiles ----------
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- providers ----------
-- Approved providers are publicly discoverable (name, rating) for the map.
create policy "providers: public read approved" on public.providers
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "providers: insert self" on public.providers
  for insert with check (user_id = auth.uid());
create policy "providers: update own or admin" on public.providers
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ---------- provider_documents ----------
create policy "docs: owner or admin" on public.provider_documents
  for all using (provider_id = public.my_provider_id() or public.is_admin())
  with check (provider_id = public.my_provider_id() or public.is_admin());

-- ---------- provider_services ----------
create policy "services: public read" on public.provider_services
  for select using (true);
create policy "services: owner write" on public.provider_services
  for all using (provider_id = public.my_provider_id() or public.is_admin())
  with check (provider_id = public.my_provider_id() or public.is_admin());

-- ---------- provider_locations ----------
-- Owner upserts own; participants of an active request can read the provider's
-- position (enforced in app via subscription filter); admins read all.
create policy "locations: owner write" on public.provider_locations
  for all using (provider_id = public.my_provider_id())
  with check (provider_id = public.my_provider_id());
create policy "locations: read" on public.provider_locations
  for select using (
    provider_id = public.my_provider_id()
    or public.is_admin()
    or exists (select 1 from public.service_requests sr
               where sr.assigned_provider_id = provider_locations.provider_id
                 and sr.customer_id = auth.uid()
                 and sr.status in ('accepted','en_route','arrived','in_progress'))
  );

-- ---------- service_requests ----------
create policy "requests: participant read" on public.service_requests
  for select using (
    customer_id = auth.uid()
    or assigned_provider_id = public.my_provider_id()
    or exists (select 1 from public.service_assignments sa
               where sa.request_id = service_requests.id and sa.provider_id = public.my_provider_id())
    or public.is_admin()
  );
create policy "requests: customer create" on public.service_requests
  for insert with check (customer_id = auth.uid());
create policy "requests: participant update" on public.service_requests
  for update using (
    customer_id = auth.uid()
    or assigned_provider_id = public.my_provider_id()
    or public.is_admin()
  );

-- ---------- service_request_images ----------
create policy "req images: access" on public.service_request_images
  for select using (public.can_access_request(request_id));
create policy "req images: participant write" on public.service_request_images
  for insert with check (public.can_access_request(request_id) and uploaded_by = auth.uid());

-- ---------- service_assignments ----------
create policy "assignments: participant read" on public.service_assignments
  for select using (
    provider_id = public.my_provider_id()
    or public.can_access_request(request_id)
  );
-- Accept/reject flows through accept_assignment() (security definer); direct
-- updates limited to the offered provider marking a rejection.
create policy "assignments: provider respond" on public.service_assignments
  for update using (provider_id = public.my_provider_id())
  with check (provider_id = public.my_provider_id());

-- ---------- service_status_history ----------
create policy "status history: access" on public.service_status_history
  for select using (public.can_access_request(request_id));

-- ---------- chat_messages ----------
create policy "chat: access read" on public.chat_messages
  for select using (public.can_access_request(request_id));
create policy "chat: participant send" on public.chat_messages
  for insert with check (public.can_access_request(request_id) and sender_id = auth.uid());

-- ---------- payments ----------
create policy "payments: participant read" on public.payments
  for select using (
    customer_id = auth.uid()
    or provider_id = public.my_provider_id()
    or public.is_admin()
  );
create policy "payments: admin write" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- wallets ----------
create policy "wallets: owner read" on public.wallets
  for select using (provider_id = public.my_provider_id() or public.is_admin());

-- ---------- withdrawals ----------
create policy "withdrawals: owner read" on public.withdrawals
  for select using (provider_id = public.my_provider_id() or public.is_admin());
create policy "withdrawals: owner request" on public.withdrawals
  for insert with check (provider_id = public.my_provider_id());
create policy "withdrawals: admin manage" on public.withdrawals
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------- reviews ----------
create policy "reviews: public read" on public.reviews
  for select using (true);
create policy "reviews: customer create" on public.reviews
  for insert with check (customer_id = auth.uid() and public.can_access_request(request_id));

-- ---------- notifications ----------
create policy "notifications: owner read" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications: owner update" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- audit_logs ----------
create policy "audit: admin read" on public.audit_logs
  for select using (public.is_admin());
