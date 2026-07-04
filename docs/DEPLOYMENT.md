# AngkorGo — Deployment Runbook (Phase 10)

Deploy order: **Supabase → Edge Functions → automation → Vercel (web) → Expo (mobile)**.
Everything below is a real command or dashboard step; nothing here runs automatically.

## 0. Prerequisites
- `pnpm i -g supabase eas-cli vercel`
- Accounts: Supabase, Vercel, Cloudflare (DNS), Google Cloud (Maps), Apple + Google
  developer, payment gateways (ABA PayWay / Bakong KHQR / Stripe / Wing / ACLEDA)

## 1. Supabase database
```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push                 # applies migrations 0001–0011 in order
supabase test db                 # sanity: pgTAP suite green
```
Post-push:
- Set the first admin: `update profiles set role='admin' where id='<your-uuid>';`
- Storage buckets `request-images` / `provider-docs` are created by `0008` (private).

## 2. Auth providers (dashboard → Authentication → Providers)
- **Email**: confirmations OFF (passwordless OTP), OTP length 6
- **Google**: set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`; redirect
  `https://<PROJECT>.supabase.co/auth/v1/callback`
- **Apple**: Service ID + key; enable "Sign in with Apple"
- Redirect URLs: `angkorgo://auth/callback`, `https://admin.angkorgo.ai/auth/callback`

## 3. Edge Functions + secrets
```bash
supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... \
  ABA_PAYWAY_MERCHANT_ID=... ABA_PAYWAY_API_KEY=...
supabase functions deploy dispatch-sweep send-push create-payment payment-webhook
```
(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)

## 4. Automation wiring
- **Push**: Database → Webhooks → new webhook on `public.notifications` **INSERT** →
  HTTP POST to the `send-push` function URL (service-role auth header).
- **Dispatch sweep** (pick one):
  ```sql
  -- pg_cron (enable the extension first)
  select cron.schedule('dispatch-sweep', '* * * * *', $$ select public.run_dispatch_sweep(); $$);
  ```
  or an external 15s cron hitting the `dispatch-sweep` function URL.
- **Payment gateway**: point each gateway's webhook at the `payment-webhook` URL and
  replace the stubbed calls in `create-payment` / `payment-webhook` with real API calls +
  signature verification.

## 5. Admin web (Vercel)
```bash
cd apps/web && vercel link        # or import the repo in the dashboard
```
- **Root Directory**: `apps/web` (monorepo detection includes the workspace)
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Domain: `admin.angkorgo.ai` (Cloudflare CNAME → Vercel)
```bash
vercel --prod
```

## 6. Mobile (Expo EAS)
```bash
cd apps/mobile
eas init                          # sets extra.eas.projectId in app.json
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value ...
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value ...
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value ...
# Replace GOOGLE_MAPS_IOS_KEY / GOOGLE_MAPS_ANDROID_KEY placeholders in app.json.
eas build --profile production --platform all
eas submit --profile production --platform all
```

## 7. Google Maps (Google Cloud console)
Enable: Maps SDK for Android, Maps SDK for iOS, Directions API, Geocoding API.
Create 3 restricted keys (iOS bundle, Android package+SHA1, web referrer) and wire them
to the corresponding env vars / `app.json` fields.

## 8. Go-live checklist
- [ ] Migrations pushed + admin seeded
- [ ] pgTAP + e2e green against staging
- [ ] Auth providers configured; OTP email deliverable
- [ ] Edge Functions deployed; notifications webhook + sweep cron active
- [ ] Real payment gateway credentials + webhook signature verification
- [ ] Google Maps keys restricted and working (tracking + directions)
- [ ] Admin web on `admin.angkorgo.ai`; provider approval flow verified end-to-end
- [ ] EAS production builds submitted to App Store / Play Store
```
