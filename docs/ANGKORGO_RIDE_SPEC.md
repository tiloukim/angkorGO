# AngkorGo Ride — Product & Technical Spec

Ride-hailing (moto / tuk-tuk / car) as the **second service vertical** on the AngkorGo
platform, alongside **Rescue** (roadside assistance). Both share one backend, one driver/
provider network, one wallet, and one dispatch engine — Ride just adds a *destination*, a
*fare engine*, and *vehicle tiers*.

> Positioning: a Grab / PassApp-style app for Cambodia. Cash-first market, KHQR-ready,
> Khmer + English.

---

## 1. What we reuse (already built & live)

| Capability | Existing asset | Ride use |
|---|---|---|
| Nearest-provider match | `find_nearby_providers` (PostGIS `ST_DWithin`) | nearest driver by vehicle class |
| Atomic first-wins accept | `accept_assignment` (`FOR UPDATE`) | driver accepts a trip |
| Radius-expanding dispatch | `dispatch_request` / `widen_dispatch` | expand search 1→3→5 km |
| Live GPS | `provider_locations` heartbeat + `TrackingMap` + Directions | track driver + trip |
| Payments + 90/10 split | `payments`, `compute_payment_split`, wallet credit | fares + platform cut |
| Driver onboarding/verify | `providers`, `provider_documents` | + license, vehicle, plate |
| Ratings, wallet, payouts, admin, push, realtime, i18n | all of it | as-is |

Roadside rescue already *is* "dispatch a provider to a point." Ride = "dispatch a driver,
then take the rider somewhere." ~80% overlap.

---

## 2. New concepts

- **Trip** — a ride with a pickup **and** dropoff, a fare estimate, and a route.
- **Vehicle class** — `moto` (motodop), `tuktuk` (PassApp-style / remork), `sedan`, `suv`.
- **Fare engine** — distance + time pricing per class, minimum fare, surge, cancellation fee.
- **Cash settlement** — cash-first market: rider pays driver cash; platform commission is
  owed by the driver and netted from their wallet (a ledger, not just a credit).

---

## 3. Data model (additions)

Keep Rescue's tables; add Ride-specific ones. Drivers reuse `providers` + `provider_services`
(with the new vehicle-class categories).

```sql
create type vehicle_class as enum ('moto', 'tuktuk', 'sedan', 'suv');

create type trip_status as enum (
  'requested',        -- created, fare estimated
  'searching',        -- dispatching offers, expanding radius
  'matched',          -- a driver accepted
  'driver_arriving',  -- driver en route to pickup
  'driver_arrived',   -- at pickup, waiting for rider
  'in_progress',      -- rider onboard, heading to dropoff
  'completed',
  'cancelled',
  'expired',          -- no driver accepted
  'no_drivers'        -- none online in range
);

-- Driver's vehicle (a provider can register one+; class must be admin-approved)
create table public.driver_vehicles (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.providers(id) on delete cascade,
  class        vehicle_class not null,
  make_model   text,
  color        text,
  plate_number text not null,
  seats        int default 4,
  photo_url    text,
  verified     boolean not null default false,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- The trip
create table public.trips (
  id                 uuid primary key default gen_random_uuid(),
  rider_id           uuid not null references public.profiles(id),
  driver_id          uuid references public.providers(id),
  vehicle_id         uuid references public.driver_vehicles(id),
  class              vehicle_class not null,
  status             trip_status not null default 'requested',

  pickup_location    geography(Point,4326) not null,
  pickup_address     text,
  dropoff_location   geography(Point,4326) not null,
  dropoff_address    text,
  route_polyline     text,                       -- Google encoded polyline

  est_distance_km    numeric(7,2),
  est_duration_min   integer,
  est_fare           numeric(10,2),
  final_fare         numeric(10,2),
  surge_multiplier   numeric(4,2) not null default 1.0,
  currency           text not null default 'USD',
  payment_method     payment_method,             -- reuse Rescue enum (adds 'cash')

  current_radius_km  numeric not null default 2,
  last_dispatch_at   timestamptz,
  requested_at       timestamptz not null default now(),
  matched_at         timestamptz,
  started_at         timestamptz,
  completed_at       timestamptz,
  cancelled_at       timestamptz,
  cancel_reason      text
);
create index idx_trips_pickup_geo on public.trips using gist (pickup_location);
create index idx_trips_status on public.trips (status);
create index idx_trips_rider on public.trips (rider_id);
create index idx_trips_driver on public.trips (driver_id);

-- Trip offers (mirrors service_assignments, one per driver during dispatch)
create table public.trip_offers (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  provider_id  uuid not null references public.providers(id) on delete cascade,
  status       assignment_status not null default 'offered',  -- reuse enum
  distance_km  numeric(6,2),
  eta_minutes  integer,
  offered_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (trip_id, provider_id)
);

-- Fare table per class per zone (seed with Phnom Penh defaults)
create table public.fare_config (
  class            vehicle_class primary key,
  base_fare        numeric(8,2) not null,
  per_km           numeric(8,2) not null,
  per_min          numeric(8,2) not null,
  minimum_fare     numeric(8,2) not null,
  cancellation_fee numeric(8,2) not null default 0,
  currency         text not null default 'USD'
);

-- Commission ledger for cash trips (driver owes platform its cut)
create table public.driver_ledger (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  trip_id     uuid references public.trips(id),
  amount      numeric(10,2) not null,   -- +credit (card payout) / -debit (cash commission owed)
  reason      text,
  created_at  timestamptz not null default now()
);
```

`payments` gets a nullable `trip_id` (polymorphic with `request_id`) so the same payment +
wallet-credit machinery serves both verticals.

---

## 4. Fare engine

```
est_fare = max(
  minimum_fare,
  (base_fare + per_km * est_distance_km + per_min * est_duration_min) * surge_multiplier
)
```

- **Distance/duration** from Google Directions/Distance Matrix at request time; store polyline.
- **Sample Phnom Penh config (illustrative, USD):**

| Class | base | /km | /min | min | cancel |
|---|---|---|---|---|---|
| moto | 0.50 | 0.20 | 0.03 | 0.75 | 0.25 |
| tuktuk | 0.75 | 0.35 | 0.04 | 1.00 | 0.40 |
| sedan | 1.25 | 0.55 | 0.06 | 2.00 | 0.75 |
| suv | 1.75 | 0.75 | 0.08 | 3.00 | 1.00 |

- **Surge**: `surge_multiplier` per zone from a live demand/supply ratio; MVP = 1.0, admin-settable.
- **KHR support**: `currency` per trip; display both USD and KHR (≈4100/USD).
- RPC `estimate_fare(class, pickup, dropoff, distance, duration)` → returns est_fare (server-authoritative).

---

## 5. Trip lifecycle (state machine)

```
requested ──estimate shown──▶ searching ──accept_trip()──▶ matched
    │                             │                            │
    │                     no accept + widen (2→3→5 km)      driver_arriving  (live GPS to pickup)
    ▼                             ▼                            │
 cancelled                    expired / no_drivers          driver_arrived
                                                               │  rider boards
                                                          in_progress  (live GPS to dropoff, running fare)
                                                               │  end trip
                                                          completed ──▶ payment (card escrow / cash ledger)
```

Cancellation: free before `matched`; `cancellation_fee` after a driver is en route.

---

## 6. Dispatch (adapted from Rescue)

- `find_nearby_drivers(trip_id, radius)` — approved + online providers whose `provider_services`
  (or `driver_vehicles`) include the trip's `class`, within radius, not on an active trip;
  ordered by distance then rating. (Same PostGIS pattern as `find_nearby_providers`.)
- `dispatch_trip(trip_id)` / `widen_dispatch_trip(trip_id)` — 2→3→5 km (tighter than Rescue;
  urban density).
- `accept_trip(offer_id)` — `SELECT … FOR UPDATE` first-wins; sets trip `matched`, driver_id;
  expires sibling offers. Copied from `accept_assignment`.
- Edge `dispatch-sweep` extended (or a `trip-sweep`) for offer TTL widen/expire.

---

## 7. Mobile — Rider (Expo)

New route group `(rider)` (or a mode toggle inside the customer app):
- **Home** — "Where to?" Google Places autocomplete; draggable pickup pin (defaults to GPS)
- **Choose ride** — vehicle-class cards, each showing fare estimate + ETA; pick payment method
- **Requesting** — searching animation; cancel
- **Matched** — driver card (photo, name, rating, plate, vehicle) + live map with ETA to pickup
- **In-trip** — route to dropoff, live ETA, running fare
- **Pay & rate** — reuse `PaymentSheet` + `ReviewPrompt`

## 8. Mobile — Driver (Expo)

Extends the existing provider app:
- **Onboarding** — add `driver_vehicles` (class, plate, photo) → admin-approved
- **Trip inbox** — offer cards: pickup, dropoff, distance, **estimated fare**, rider rating → Accept/Decline (reuse `useProviderOffers` pattern)
- **Active trip** — navigate to pickup → *Arrived* → *Start trip* → navigate to dropoff → *End trip* → collect payment (cash confirm or card release)
- **Earnings** — per-trip breakdown; cash-owed balance from `driver_ledger`

## 9. Admin (web)

New sidebar section **Ride**:
- **Live trips** map (active trips + driver positions)
- **Fare config** editor (`fare_config`) + **surge** control per zone
- **Vehicle approvals** (`driver_vehicles.verified`)
- **Trip disputes**, cancellations, refunds
- KPIs: trips/day, GMV, avg fare, driver utilization, completion rate

## 10. Realtime channels

`trips` (status), `trip_offers` (driver inbox), `provider_locations` (tracking),
`chat_messages` (per-trip; add nullable `trip_id`), `payments`.

---

## 11. Cash settlement (Cambodia-critical)

Most rides are **cash**. Flow:
1. Rider pays driver cash at dropoff.
2. Platform's 10% commission is recorded as a **debit** in `driver_ledger`.
3. Driver's card-trip earnings (wallet credits) net against cash-commission debits.
4. If a driver's ledger goes too negative, they're auto-suspended from new offers until settled
   (top-up via KHQR/ABA).

This keeps the 90/10 economics whether the fare is paid by card/KHQR (escrow) or cash (ledger).

---

## 12. Build phases (mirrors the Rescue plan)

| Phase | Scope |
|---|---|
| **R1** ✅ | Schema: `trips`, `driver_vehicles`, `trip_offers`, `fare_config`, `driver_ledger`, enums, RLS, grants, realtime (migration `0013`) — defaults: moto/tuktuk/car, USD+KHR, cash+KHQR, one app, Phnom Penh |
| **R2** | Fare engine: `estimate_fare` RPC + Google Distance Matrix integration |
| **R3** ✅ | Rider booking flow: where-to (Places search), class picker w/ live fares (USD+KHR) + ETA, create trip (migration `0017` `create_trip`/`get_trip`); status screen. Dispatch/matching = R4 |
| **R4** ✅ | Dispatch (migration `0018`): `find_nearby_drivers`, `dispatch_trip`, `widen_dispatch_trip` (2→3→5), atomic `accept_trip` + `reject_trip_offer`, offer notify + matched notify, trip TTL in `run_dispatch_sweep`; driver ride-offer inbox + active-trip screen; rider sees "matched" |
| **R5** ✅ | Live tracking (migration `0019`): rider reads driver location (RLS policy) + `get_trip_driver` RPC; rider `ride/[id]` shows tracking map (driver→pickup, then driver→dropoff) + driver card (name/rating/vehicle/plate/fare) via `TrackingMap` + `useProviderLocation`. Driver broadcasts from R4. |
| **R6** ✅ | Fare settlement (migration `0020`): `settle_trip` on trip end — cash → `driver_ledger` commission debit; cashless → pending `payments` row → escrow → release credits driver 90% (reuses payments engine). Driver "End trip" → `settle_trip`; rider `PaymentSheet` on completed cashless trip; `driver_ledger_balance` shown on wallet. |
| **R7** ✅ | Driver vehicle onboarding: `(provider)/vehicles` (register/list, photo upload, pending→verified) + admin **Vehicle Approvals** page (`setVehicleVerified`). Driver active-trip flow shipped in R4. |
| **R8** | Admin: fare/surge config, vehicle approvals, live trips, disputes |
| **R9** | Testing: fare math, dispatch race, cash-ledger accounting, e2e trip |
| **R10** | Launch: Google Places/Distance APIs, pricing per city, EAS build |

---

## Open decisions (need your input before R1)
1. **Vehicle classes** — is `moto` + `tuktuk` + `car` enough for launch, or split car into sedan/SUV?
2. **Currency** — price in **USD**, **KHR**, or both shown?
3. **Cash vs cashless** — support cash from day one (needs the ledger), or KHQR/card-only first (simpler)?
4. **One app or two** — riders & drivers in the *same* app (role toggle) like now, or split rider/driver apps?
5. **City scope** — Phnom Penh only at launch, or multi-city fare zones from the start?
