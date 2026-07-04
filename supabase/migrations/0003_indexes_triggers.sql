-- =============================================================
-- AngkorGo — 0003 Indexes & Triggers
-- =============================================================

-- ---------- Indexes ----------

-- Geospatial: nearest-provider dispatch + live tracking bounding queries
create index idx_provider_locations_geo on public.provider_locations using gist (location);
create index idx_service_requests_geo   on public.service_requests   using gist (pickup_location);

-- Dispatch hot paths
create index idx_providers_online_status on public.providers (is_online, status);
create index idx_provider_services_cat   on public.provider_services (category, active);

-- Foreign-key / lookup indexes
create index idx_requests_customer   on public.service_requests (customer_id);
create index idx_requests_status     on public.service_requests (status);
create index idx_requests_provider   on public.service_requests (assigned_provider_id);
create index idx_assignments_request on public.service_assignments (request_id);
create index idx_assignments_provider on public.service_assignments (provider_id, status);
create index idx_req_images_request  on public.service_request_images (request_id);
create index idx_status_hist_request on public.service_status_history (request_id, created_at);
create index idx_chat_request        on public.chat_messages (request_id, created_at);
create index idx_payments_provider   on public.payments (provider_id);
create index idx_withdrawals_provider on public.withdrawals (provider_id, status);
create index idx_reviews_provider    on public.reviews (provider_id);
create index idx_notifications_user  on public.notifications (user_id, read_at);
create index idx_audit_entity        on public.audit_logs (entity_type, entity_id);

-- ---------- updated_at maintenance ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated   before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_providers_updated  before update on public.providers
  for each row execute function public.set_updated_at();
create trigger trg_requests_updated   before update on public.service_requests
  for each row execute function public.set_updated_at();
create trigger trg_wallets_updated    before update on public.wallets
  for each row execute function public.set_updated_at();

-- ---------- Auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, preferred_language, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.phone,
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Record every request status change ----------
create or replace function public.log_request_status()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.service_status_history (request_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_request_status_history
  after insert or update on public.service_requests
  for each row execute function public.log_request_status();

-- ---------- Recompute provider rating on new review ----------
create or replace function public.recompute_provider_rating()
returns trigger language plpgsql as $$
begin
  update public.providers p
  set rating = coalesce((
    select round(avg(rating)::numeric, 1) from public.reviews where provider_id = new.provider_id
  ), 0)
  where p.id = new.provider_id;
  return new;
end;
$$;

create trigger trg_review_rating
  after insert on public.reviews
  for each row execute function public.recompute_provider_rating();

-- ---------- Compute commission split on payment write ----------
create or replace function public.compute_payment_split()
returns trigger language plpgsql as $$
begin
  new.provider_amount   := round(new.amount * new.provider_rate, 2);
  new.commission_amount := round(new.amount - new.provider_amount, 2);
  return new;
end;
$$;

create trigger trg_payment_split
  before insert or update of amount, provider_rate on public.payments
  for each row execute function public.compute_payment_split();

-- ---------- Credit provider wallet when payment is released ----------
create or replace function public.credit_wallet_on_release()
returns trigger language plpgsql as $$
begin
  if new.status = 'released' and old.status is distinct from 'released' then
    insert into public.wallets (provider_id, balance)
    values (new.provider_id, new.provider_amount)
    on conflict (provider_id)
    do update set balance = public.wallets.balance + new.provider_amount,
                  updated_at = now();
    update public.providers set total_jobs = total_jobs + 1 where id = new.provider_id;
  end if;
  return new;
end;
$$;

create trigger trg_wallet_credit
  after update on public.payments
  for each row execute function public.credit_wallet_on_release();
