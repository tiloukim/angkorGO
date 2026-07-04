# AngkorGo — MVP Implementation Plan

Status legend: ✅ done · 🚧 in progress · ⬜ not started

## Phase 1 — Database Design ✅
- ✅ PostGIS + enums (`0001`)
- ✅ 16 core tables + config/catalog (`0002`, `0006`)
- ✅ Indexes (GiST geo) + triggers: updated_at, new-user→profile, status history,
  rating recompute, payment split, wallet credit (`0003`)
- ✅ Dispatch RPCs + realtime publication (`0004`)
- ✅ Full RLS with role helpers (`0005`)

## Phase 2 — Authentication ✅
- ✅ Supabase clients — mobile (SecureStore), web browser + SSR + middleware
- ✅ Email OTP flow — mobile (`login`→`verify`) + web admin login
- ✅ Google OAuth (both) + Apple native sign-in (iOS mobile)
- ✅ Role selection at signup → `onboarded` flag (migration `0007`); provider
  row auto-provisioned via `ensure_provider_row` trigger
- ✅ Auth-gated routing — mobile `RootNavigator`, web `middleware.ts` (admin-only)
- ⬜ Follow-ups: configure Google/Apple providers in Supabase dashboard; set the
  first admin (`update profiles set role='admin' where id=…`); email templates

## Phase 3 — Emergency Request System ✅
- ✅ Customer emergency screen (12 large category buttons, EN/KM)
- ✅ GPS capture + draggable pin (`react-native-maps`, `lib/location.ts`,
  on-device reverse geocode) — `request/location`
- ✅ Photo upload (≤10) → `request-images` bucket → `service_request_images`
  (`lib/uploads.ts`) — `request/photos`
- ✅ Create request via `create_service_request` RPC (geography built server-side);
  storage buckets + RLS in migration `0008`
- ✅ Live status screen (`request/[id]`) subscribed to the request via Realtime;
  triggers `dispatch_request` on submit

## Phase 4 — Dispatch Engine ✅
- ✅ `dispatch_request` fired from the request flow (Phase 3 submit)
- ✅ Offer TTL widen/expire — `run_dispatch_sweep()` (migration `0009`) driven by
  the `dispatch-sweep` Edge Function / pg_cron; widens 5→10→20 km
- ✅ Provider offer inbox — `hooks/useProviderOffers.ts` (Realtime on
  `service_assignments`), rendered in the provider dashboard
- ✅ Accept (atomic `accept_assignment`, first-wins) + `reject_assignment`
- ✅ Expo push — `push_tokens` table, notify triggers (offer→provider,
  accepted→customer), `send-push` Edge Function (Database Webhook on notifications),
  `lib/push.ts` token registration
- ✅ Active-job screen — provider advances accepted→en_route→arrived→in_progress→completed
- ⬜ Follow-ups: deploy Edge Functions, add notifications→send-push webhook, schedule sweep

## Phase 5 — GPS Tracking ✅
- ✅ Provider 5 s heartbeat — `useLocationBroadcast` → `update_provider_location`
  RPC (migration `0010`), active only during a live job
- ✅ Server-side GPS validation — coord-range + >300 km/h jump rejection in the RPC;
  plain `lat`/`lng` columns added so Realtime payloads carry usable coords
- ✅ Customer live map — `useProviderLocation` (Realtime), `TrackingMap` component
  with Google Directions polyline + live ETA (`lib/directions.ts`)
- ✅ Customer `request/[id]` switches to the tracking map once assigned
- ⬜ Follow-up: needs `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` + native Maps SDK keys

## Phase 6 — Payments ✅
- ✅ Invoice via `create_invoice` RPC (provider, sets 90/10 `provider_rate` from
  `commission_rate`; split computed by the Phase-1 trigger) — migration `0011`
- ✅ Escrow flow — `confirm_payment` (pending→held) + `release_payment` /
  `release_payment_admin` (held→released → wallet credit + request completed);
  webhook-only RPCs locked to `service_role`
- ✅ KHQR + ABA/Wing/ACLEDA (QR) + Stripe (intent) via `create-payment` Edge Fn;
  `payment-webhook` Edge Fn (auto-release for MVP) — gateway calls stubbed w/ TODOs
- ✅ Customer `PaymentSheet` (method picker, QR, confirm & release) + `usePayment`
- ✅ Provider invoice entry on the job screen; `request_withdrawal` /
  `process_withdrawal` RPCs + provider wallet/withdrawals screen
- ⬜ Follow-ups: real Bakong/ABA/Stripe credentials + webhook signature verification

## Phase 7 — Provider App ✅
- ✅ Onboarding — business info, service-category multi-select, document upload
  (ID/license/vehicle) → `provider-docs` bucket + `provider_documents`
  (`onboarding.tsx`, `uploadProviderDocument`)
- ✅ Online/offline toggle + offer inbox (Phase 4), earnings/wallet (Phase 6)
- ✅ Job history (`jobs.tsx` active + completed), profile + ratings (`profile.tsx`)
- ✅ Customer review on completion → `ReviewPrompt` (fires rating-recompute trigger)
- ✅ Dashboard nav (onboarding prompt when pending, jobs/wallet/profile)

## Phase 8 — Admin Dashboard ✅
- ✅ Admin shell layout (sidebar nav) around all admin routes
- ✅ KPIs — overview cards (users, providers, active/completed, revenue, commission)
- ✅ Provider approval queue — signed-URL document review, approve (verifies docs +
  notifies provider) / reject
- ✅ User management — list, suspend / reinstate
- ✅ Payout queue — mark paid / reject via `process_withdrawal` (atomic wallet refund)
- ✅ Dispute center — expired/cancelled requests + failed/refunded payments
- Server actions in `(admin)/actions.ts`; all authority is RLS + SECURITY DEFINER RPCs

## Phase 9 — Testing ✅
- ✅ pgTAP DB tests (`supabase test db`): `dispatch_test`, `accept_race_test`
  (double-accept guard), `payments_test` (split + wallet), `rls_test` (isolation)
- ✅ TypeScript e2e happy path (`tests/e2e/happy-path.mjs`) — full flow through real
  customer/provider clients against a running project
- ✅ `supabase/tests/README.md` (how to run + coverage gaps)
- ⬜ Deferred: mobile UI tests (Detox/Maestro), gateway webhook signature tests

## Phase 10 — Production Deployment ✅ (config ready; execution needs live creds)
- ✅ `supabase/config.toml` (auth providers, storage, function jwt settings)
- ✅ Native Google Maps keys in `app.json`; `eas.json` build/submit profiles
- ✅ `apps/web/vercel.json` (monorepo build) + root workspace scripts
- ✅ GitHub Actions CI (`.github/workflows/ci.yml`) — pgTAP + web build
- ✅ `docs/DEPLOYMENT.md` runbook (Supabase → Edge Fns → automation → Vercel → EAS)
- ⬜ Execution (owner-only): `supabase link/db push`, deploy functions, wire webhook +
  cron, real payment/Maps/OAuth credentials, `vercel --prod`, `eas build/submit`

---

### Status: all 10 phases built ✅
MVP is functionally complete across mobile (customer + provider), web (admin), and the
Supabase backend. Remaining work is **operational**, not development:
1. Link a live Supabase project + push migrations (`docs/DEPLOYMENT.md` §1).
2. Configure OAuth, payment gateway, and Google Maps credentials.
3. Deploy Edge Functions + wire the notifications webhook and dispatch sweep cron.
4. Ship the admin web (Vercel) and mobile apps (EAS) to production.
