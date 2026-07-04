# AngkorGo Rescue — System Architecture

## 1. High-level

```
 ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
 │ Customer App │        │ Provider App │        │ Admin (web)  │
 │ (Expo RN)    │        │ (Expo RN)    │        │ (Next.js 16) │
 └──────┬───────┘        └──────┬───────┘        └──────┬───────┘
        │  supabase-js (auth, realtime, storage, rpc)   │
        └───────────────┬───────────────────────────────┘
                        ▼
             ┌─────────────────────────┐
             │        Supabase         │
             │ ┌─────────────────────┐ │
             │ │ Postgres + PostGIS  │ │  tables, RLS, triggers, RPCs
             │ │ Realtime (CDC)      │ │  live requests / location / chat
             │ │ Auth (OTP/OAuth)    │ │  email OTP, Google, Apple
             │ │ Storage             │ │  docs + before/after photos
             │ │ Edge Functions      │ │  dispatch timer, push, pay webhooks
             │ └─────────────────────┘ │
             └───────────┬─────────────┘
                         │
        ┌────────────────┼────────────────────┐
        ▼                ▼                     ▼
   Google Maps     Expo Push          Payments (ABA PayWay,
   (geo/route)     Notifications      KHQR, Stripe, Wing, ACLEDA)
```

The clients talk **directly** to Supabase for CRUD/realtime (guarded by RLS).
Anything needing a secret or server authority (payment capture, push sending,
dispatch timers, payout release) runs in an **Edge Function** or a Next.js route
handler using the service-role key.

## 2. Request state machine

```
pending ──dispatch_request()──▶ dispatching ──accept_assignment()──▶ accepted
                                    │                                    │
                                    │ no accept + widen_dispatch()       ▼
                                    │  (5→10→20km)                     en_route
                                    ▼                                    │
                                 expired                               arrived
                                                                         │
   cancelled ◀── customer/admin cancel (any pre-completion state)     in_progress
                                                                         │
                                                            payment released ▼
                                                                       completed
```

Every transition is written to `service_status_history` by the
`trg_request_status_history` trigger — no app code needed for the audit trail.

## 3. Dispatch algorithm

Implemented as Postgres RPCs in `0004_functions_realtime.sql`:

1. **`find_nearby_providers(request_id, radius_km)`** — PostGIS `ST_DWithin` on
   `provider_locations.location` (GiST-indexed geography). Filters: `is_online`,
   `status='approved'`, offers the request's `category`, not already offered/rejected,
   not on another active job. Returns distance, ETA (25 km/h heuristic + 2 min), rating.
2. **`dispatch_request(request_id)`** — inserts `service_assignments` (offers) for
   all matches at the current radius; sets request → `dispatching`. Providers get a
   realtime `INSERT` on `service_assignments` filtered by their `provider_id`.
3. **`widen_dispatch(request_id)`** — bumps radius 5→10→20 km and re-dispatches.
   Driven by an Edge Function timer (offer TTL from `platform_config.offer_ttl_seconds`).
4. **`accept_assignment(assignment_id)`** — `SELECT … FOR UPDATE` + guarded
   `UPDATE … WHERE status IN ('pending','dispatching')` makes acceptance **first-wins
   atomic**; all other offers flip to `expired`. Request → `accepted`.

## 4. Realtime channels

| Table                    | Who subscribes            | Purpose                          |
|--------------------------|---------------------------|----------------------------------|
| `service_assignments`    | Providers (own offers)    | Incoming request offers          |
| `service_requests`       | Customer + provider       | Status changes (accepted→...)    |
| `provider_locations`     | Customer of active job     | Live tracking (5 s heartbeat)    |
| `chat_messages`          | Both request participants | In-app chat                      |
| `service_status_history` | Participants              | Timeline UI                      |
| `payments`               | Participants              | Payment state                    |
| `notifications`          | Owner                     | In-app notification feed         |

RLS on each table means a subscription only streams rows the user may read —
the security boundary and the realtime filter are the same policy.

## 5. GPS tracking

- Provider app posts an upsert to `provider_locations` every **5 s** while online
  (`location = ST_Point(lng,lat)::geography`, plus heading/speed).
- Customer subscribes to that provider's row during an active job; the map animates
  the marker and re-requests a Google Directions polyline + ETA on each update.
- Nearest-provider search and radius dispatch both reuse the GiST geography index.

## 6. Payments & commission

- On job completion the provider uploads an invoice → a `payments` row is created.
- `trg_payment_split` computes `provider_amount = amount * provider_rate` (default
  0.90) and `commission_amount` (the AngkorGo 10%). Rate is configurable per payment.
- Customer pays via gateway (ABA PayWay / KHQR / Stripe / Wing / ACLEDA) → status
  `held`. Admin/auto release → `released`, which triggers `credit_wallet_on_release`
  to credit the provider wallet and bump `total_jobs`.
- Providers request payouts via `withdrawals`; admin marks `paid`.

## 7. Security

- **RBAC via RLS** — `is_admin()`, `my_provider_id()`, `can_access_request()` helpers
  back every policy; roles live in `profiles.role`.
- **Provider verification** — documents in Storage + `provider_documents.verified`;
  provider stays `pending` (undispatchable) until an admin approves.
- **Atomic dispatch** prevents double-assignment; **service-definer RPCs** keep
  privileged transitions off the client.
- **Audit** — `audit_logs` for admin actions; `service_status_history` for requests.
- **GPS validation** — server can reject location jumps / stale heartbeats in the
  location upsert Edge Function (Phase 5).
