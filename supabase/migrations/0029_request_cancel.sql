-- =============================================================
-- AngkorGo Repair (roadside) — server-side request cancellation, completing
-- cancellation parity across all verticals (trip/order/booking/request).
-- Customer or assigned provider may cancel; expires open offers and reverses
-- any unreleased payment.
-- =============================================================

create or replace function public.cancel_request(p_request uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_req public.service_requests%rowtype; v_uid uuid := auth.uid(); v_provider uuid;
begin
  select * into v_req from public.service_requests where id = p_request for update;
  if v_req.id is null then raise exception 'Request not found'; end if;
  if v_req.status in ('completed','cancelled','expired') then
    raise exception 'Request can no longer be cancelled';
  end if;

  select id into v_provider from public.providers where user_id = v_uid;
  if v_uid <> v_req.customer_id
     and (v_provider is null or v_req.assigned_provider_id is null or v_provider <> v_req.assigned_provider_id)
     and not public.is_admin() then
    raise exception 'Not allowed to cancel this request';
  end if;

  update public.service_requests set status = 'cancelled' where id = p_request;
  update public.service_assignments set status = 'expired' where request_id = p_request and status = 'offered';
  update public.payments
    set status = case when status = 'held' then 'refunded' else 'failed' end
    where request_id = p_request and status in ('pending','held');
end;
$$;
grant execute on function public.cancel_request(uuid, text) to authenticated;
