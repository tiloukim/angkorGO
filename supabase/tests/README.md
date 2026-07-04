# AngkorGo — Tests

## Database tests (pgTAP)

Native Supabase DB tests. They run inside a transaction and roll back, so they're
safe against a local database.

```bash
supabase start          # local stack
supabase test db        # runs every *.sql in supabase/tests
```

| File                    | Covers                                                        |
|-------------------------|---------------------------------------------------------------|
| `dispatch_test.sql`     | `find_nearby_providers` radius filter, online/approved gating, `dispatch_request`, `widen_dispatch` 5→10→20 |
| `accept_race_test.sql`  | Atomic first-wins accept; losing offer auto-expires (double-accept guard) |
| `payments_test.sql`     | 90/10 split trigger, `release_payment_admin` → wallet credit + request completed |
| `rls_test.sql`          | Customers can only read/insert their own requests (RLS isolation) |

> pgTAP tests insert into `auth.users` to drive the `handle_new_user` /
> `ensure_provider_row` triggers. If your local `auth.users` has extra NOT NULL
> columns, extend the fixture inserts accordingly.

## End-to-end (happy path)

Drives the full flow through real customer/provider clients (RLS + RPCs), against
a running local or staging project:

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_ANON_KEY=<anon> \
SUPABASE_SERVICE_ROLE_KEY=<service_role> \
  node supabase/tests/e2e/happy-path.mjs
```

Asserts: request → dispatch → accept → heartbeat → invoice → pay → release →
wallet credited 90% → request completed → rating recomputed.

## What isn't covered yet
- Load/soak on the dispatch sweep and realtime fan-out
- Payment-gateway webhook signature verification (stubbed pending real credentials)
- Mobile UI tests (Detox/Maestro) — deferred to post-MVP
