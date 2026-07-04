-- =============================================================
-- AngkorGo — 0011 Payments
-- Phase 6: invoice → escrow (held) → release → wallet credit → payout
-- Money-moving transitions go through SECURITY DEFINER RPCs with explicit
-- role guards (RLS on payments/withdrawals stays read-only for participants).
-- =============================================================

-- ---------- Provider issues an invoice for a job ----------
create or replace function public.create_invoice(
  p_request_id uuid,
  p_amount     numeric,
  p_currency   text default 'USD',
  p_invoice_url text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_provider uuid := public.my_provider_id();
  v_customer uuid;
  v_rate     numeric;
  v_id       uuid;
begin
  select customer_id into v_customer
  from public.service_requests
  where id = p_request_id
    and assigned_provider_id = v_provider
    and status in ('arrived', 'in_progress');
  if v_customer is null then
    raise exception 'Not authorized to invoice this request';
  end if;

  -- provider keeps (1 - commission); default 0.90.
  select 1 - commission_rate into v_rate from public.providers where id = v_provider;

  insert into public.payments (request_id, customer_id, provider_id, amount, currency, provider_rate, invoice_url, status)
  values (p_request_id, v_customer, v_provider, p_amount, p_currency, coalesce(v_rate, 0.9), p_invoice_url, 'pending')
  on conflict (request_id) do update
    set amount = excluded.amount, currency = excluded.currency,
        provider_rate = excluded.provider_rate, invoice_url = excluded.invoice_url,
        status = 'pending'
    where public.payments.status = 'pending'
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- Gateway confirmed capture → escrow (held) ----------
-- Called by the payment-webhook Edge Function (service role) after ABA PayWay /
-- Stripe / KHQR confirms funds. Idempotent on external_txn_id.
create or replace function public.confirm_payment(
  p_payment_id uuid,
  p_method     payment_method,
  p_txn        text default null
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.payments
    set status = 'held', method = p_method, external_txn_id = p_txn, paid_at = now()
    where id = p_payment_id and status = 'pending';
end;
$$;

-- ---------- Release escrow → credit provider + complete request ----------
-- Customer confirms the work is done (or admin releases). The wallet credit +
-- total_jobs bump happen via the credit_wallet_on_release trigger (0003).
create or replace function public.release_payment(p_payment_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_customer uuid; v_request uuid;
begin
  select customer_id, request_id into v_customer, v_request
  from public.payments where id = p_payment_id and status = 'held';
  if v_request is null then
    raise exception 'Payment not in a releasable state';
  end if;
  if v_customer <> auth.uid() and not public.is_admin() then
    raise exception 'Only the customer or an admin may release payment';
  end if;

  update public.payments set status = 'released' where id = p_payment_id;
  update public.service_requests set status = 'completed' where id = v_request;
end;
$$;

-- ---------- Service-role release (used by the payment webhook) ----------
-- No auth.uid() guard — restricted to service_role via GRANTs below so it can
-- never be called from a client session.
create or replace function public.release_payment_admin(p_payment_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_request uuid;
begin
  select request_id into v_request from public.payments
  where id = p_payment_id and status = 'held';
  if v_request is null then return; end if;
  update public.payments set status = 'released' where id = p_payment_id;
  update public.service_requests set status = 'completed' where id = v_request;
end;
$$;

-- Lock the webhook-only RPCs down to service_role.
revoke execute on function public.confirm_payment(uuid, payment_method, text) from anon, authenticated;
revoke execute on function public.release_payment_admin(uuid) from public, anon, authenticated;
grant execute on function public.confirm_payment(uuid, payment_method, text) to service_role;
grant execute on function public.release_payment_admin(uuid) to service_role;

-- ---------- Provider requests a payout (debits wallet, holds funds) ----------
create or replace function public.request_withdrawal(
  p_amount      numeric,
  p_method      payment_method,
  p_destination text
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_provider uuid := public.my_provider_id();
  v_balance  numeric;
  v_id       uuid;
begin
  if v_provider is null then raise exception 'Not a provider'; end if;

  select balance into v_balance from public.wallets where provider_id = v_provider for update;
  if coalesce(v_balance, 0) < p_amount then
    raise exception 'Insufficient wallet balance';
  end if;

  update public.wallets set balance = balance - p_amount, updated_at = now()
    where provider_id = v_provider;

  insert into public.withdrawals (provider_id, amount, method, destination)
  values (v_provider, p_amount, p_method, p_destination)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- Admin processes a payout (refunds wallet on rejection) ----------
create or replace function public.process_withdrawal(
  p_withdrawal_id uuid,
  p_status        withdrawal_status
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_provider uuid; v_amount numeric; v_current withdrawal_status;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;

  select provider_id, amount, status into v_provider, v_amount, v_current
  from public.withdrawals where id = p_withdrawal_id for update;

  update public.withdrawals
    set status = p_status, processed_at = now(), processed_by = auth.uid()
    where id = p_withdrawal_id;

  -- Refund the held funds if the payout is rejected.
  if p_status = 'rejected' and v_current <> 'rejected' then
    update public.wallets set balance = balance + v_amount, updated_at = now()
      where provider_id = v_provider;
  end if;
end;
$$;

alter publication supabase_realtime add table public.wallets;
alter publication supabase_realtime add table public.withdrawals;
