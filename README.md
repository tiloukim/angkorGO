# AngkorGo Rescue 🚨

**"Help is on the way."**

Phase 1 MVP of the AngkorGo ecosystem — an on-demand roadside assistance & mobile
mechanic marketplace for Cambodia. Connects stranded drivers with nearby mechanics,
tow trucks, tire/battery/fuel providers — Uber/Grab-style dispatch, live GPS tracking,
in-app payments, and a 90/10 provider/platform commission split.

## Monorepo layout

```
angkorgo-rescue/
├── apps/
│   ├── web/                 # Next.js 16 — Admin dashboard + provider onboarding + KHQR pay pages
│   └── mobile/              # Expo (React Native) — Customer & Provider apps (role-switched)
├── packages/
│   └── shared/              # Shared TS types, Supabase client, i18n (en/km), dispatch constants
├── supabase/
│   ├── migrations/          # PostgreSQL schema (numbered, run in order)
│   │   ├── 0001_extensions_enums.sql
│   │   ├── 0002_tables.sql
│   │   ├── 0003_indexes_triggers.sql
│   │   ├── 0004_functions_realtime.sql   # dispatch engine RPCs + realtime publication
│   │   ├── 0005_rls_policies.sql
│   │   └── 0006_seed.sql
│   └── functions/           # Edge Functions (dispatch timer, push, payment webhooks) — Phase 4+
└── docs/
    ├── ARCHITECTURE.md      # System design, state machine, realtime, dispatch algorithm
    └── IMPLEMENTATION_PLAN.md
```

## Tech stack

| Layer      | Choice                                             |
|------------|----------------------------------------------------|
| Web        | Next.js 16, TypeScript, TailwindCSS, shadcn/ui     |
| Mobile     | React Native + Expo SDK                            |
| Backend/DB | Supabase (PostgreSQL 15 + PostGIS), Edge Functions |
| Auth       | Supabase Auth — Email OTP, Google, Apple           |
| Maps       | Google Maps API (geocoding, directions, tiles)     |
| Realtime   | Supabase Realtime (Postgres CDC)                   |
| Push       | Expo Push Notifications                            |
| Storage    | Supabase Storage (docs, vehicle/problem photos)    |
| Payments   | ABA PayWay, KHQR, Stripe, Wing, ACLEDA             |
| Hosting    | Vercel (web) + Cloudflare (DNS/CDN)                |

## Getting started

```bash
# 1. Provision the database (Supabase CLI)
supabase start                       # local, or link a hosted project
supabase db reset                    # applies supabase/migrations in order

# 2. Web (admin dashboard)
cd apps/web && pnpm install && pnpm dev

# 3. Mobile (customer + provider)
cd apps/mobile && pnpm install && npx expo start
```

Copy `.env.example` → `.env` in each app and fill Supabase + Google Maps keys.

See **docs/ARCHITECTURE.md** for the dispatch algorithm and request state machine,
and **docs/IMPLEMENTATION_PLAN.md** for the 10-phase build order and current status.
