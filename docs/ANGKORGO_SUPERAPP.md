# AngkorGo — Cambodia Super-App: Master Architecture

**One platform, one app, one site — multiple on-demand & booking services for Cambodia.**
Trilingual: **English · Khmer · Chinese (中文)**.

AngkorGo is a Grab-style super-app. Every vertical shares one identity, one provider/host
network, one wallet, one payments + commission engine, one map/tracking stack, and one admin —
so each new service is an *extension*, not a new app.

---

## The 5 verticals

| # | Vertical | Inspiration | Service model | Status |
|---|----------|-------------|---------------|--------|
| 1 | **Ride** (taxi/moto/tuk-tuk) | Grab / Uber | Dispatch (real-time) | 🚧 R1 schema done |
| 2 | **Vehicle Rental** (car/van) | Turo | Booking (date range) | ⬜ needs booking core |
| 3 | **Mobile Auto Repair** | mobilemechanicsusa.com | Dispatch (real-time) | ✅ **built** (was "Rescue") |
| 4 | **Food Delivery** | foodpanda | Dispatch (3-sided) | ⬜ future — reserve `service_type` now |
| 5 | **Stay** (short-term rental) | Airbnb | Booking (date range) | ⬜ needs booking core |

> **#3 is already built.** The roadside "Rescue" MVP *is* the mobile-mechanic vertical
> (mechanic dispatched to the customer). It's live end-to-end — we just position it as
> "Mobile Auto Repair" under the AngkorGo umbrella.

---

## Two service models (the key architectural split)

Everything reduces to one of two patterns:

**A. Dispatch model** — real-time, "nearest available provider comes to you now."
→ **Ride, Mobile Auto Repair, Food Delivery (courier leg).**
Reuses the built engine: `find_nearby_providers` (PostGIS) → offers → atomic accept →
live GPS tracking → pay → rate.

**B. Booking model** — "browse listings, reserve a date range, pay, review."
→ **Vehicle Rental (Turo), Stay (Airbnb).**
Needs a new shared subsystem: **listings + availability + bookings**. No real-time dispatch;
instead calendar availability, instant-book or request-to-book, deposits, check-in/out.

Building the **Booking core once** powers *both* rental verticals (Turo + Airbnb are the same
mechanics over different listing types).

---

## Shared platform core (already built ✅)

- **Identity & roles** — `profiles` (customer / provider / admin), Supabase Auth (email OTP,
  Google, Apple)
- **Provider/host network** — `providers`, verification docs, ratings, online/offline, wallet, payouts
- **Payments** — `payments` (now polymorphic), 90/10 split (commission configurable **per vertical**),
  KHQR / ABA / Wing / ACLEDA / Stripe / **cash** + driver ledger
- **Maps** — PostGIS geo, live tracking, Google Directions/Places
- **Realtime + push**, **Admin dashboard**, **Storage**, **i18n (EN/KH/ZH)**

Each vertical plugs into this; it doesn't rebuild it.

---

## New shared pieces to add

1. **`service_type` (vertical) enum** — `ride | auto_repair | vehicle_rental | food | stay`.
   Tag providers, listings, payments, and orders so one network serves many verticals and the
   admin/wallet reporting rolls up per vertical. (Auto-repair maps to today's rescue tables.)
2. **Booking core** — `listings`, `listing_availability`, `bookings`, `booking_reviews`
   (shared by Vehicle Rental + Stay; `listing_type` discriminates vehicle vs place).
3. **Food subsystem** (later) — `restaurants`, `menu_items`, `orders`, `order_items`, courier
   dispatch reusing the dispatch engine.

---

## Data model sketch (per vertical)

- **Ride** — `trips`, `driver_vehicles`, `trip_offers`, `fare_config`, `driver_ledger` ✅ (0013)
- **Auto Repair** — existing `service_requests` + friends ✅
- **Vehicle Rental** — `listings`(type=vehicle: make/model, daily_rate, deposit, location) +
  `bookings`(start/end dates, renter, status, deposit hold)
- **Stay** — `listings`(type=place: rooms, beds, amenities, nightly_rate, address) +
  `bookings`(check-in/out, guests) + house rules
- **Food** — `restaurants` → `menu_items` → `orders` → courier `dispatch`

---

## Trilingual (EN / KH / ZH)

- Shared `Language = 'en' | 'km' | 'zh'`; dictionaries in `packages/shared` now include Chinese
  (UI strings, service categories, vehicle classes). ✅
- DB `profiles.preferred_language` accepts `zh` (migration `0014`). ✅
- Per-vertical content (listing titles, menu items) stored with `_en / _km / _zh` fields or a
  `translations jsonb` column, chosen at build time per table.
- App language switcher cycles all three; default by device locale.

---

## Build roadmap (proposed)

**Phase A — Finish Ride (R2–R10)** ← in progress, biggest market, engine reuse highest
  R2 fare engine · R3 rider booking · R4 dispatch · R5 tracking · R6 payments · R7 driver ·
  R8 admin · R9 tests · R10 launch

**Phase B — Booking core + Vehicle Rental (Turo)**
  B1 listings/bookings schema · B2 host listing flow · B3 search + availability · B4 book +
  deposit + pay · B5 handover/return + reviews · B6 admin

**Phase C — Stay (Airbnb)** — reuses Booking core; adds place-specific fields, calendar, house rules

**Phase D — Food Delivery** — restaurants/menus/orders + courier dispatch (reuses dispatch engine)

**Cross-cutting (ongoing)**
  - Trilingual EN/KH/ZH (started ✅)
  - Unified home with a **vertical switcher** (Ride / Repair / Rentals / Stay / Food)
  - `service_type` tagging across providers, payments, admin reporting

---

## Reconciliation with what exists

| Master-plan vertical | Current state |
|---|---|
| Mobile Auto Repair (#3) | ✅ Built & live (the "Rescue" MVP) — re-badged as a vertical |
| Ride (#1) | 🚧 R1 schema done; R2–R10 next |
| Vehicle Rental (#2) | ✅ MVP built on booking core (migration `0022`): host listing creation + browse/book + confirm/decline + payment (host provisioned a provider record for wallet payout) |
| Stay (#5) | ✅ MVP built on booking core (reuses `create_booking`/`confirm_booking` — type-agnostic; no new migration). Browse/detail/book places + host place listings (shared host form w/ vehicle/place toggle). |
| Food (#4) | ✅ MVP (migrations `0023`+`0024`): restaurants/menu_items/orders/order_items/courier_offers; place_order, restaurant accept/ready→dispatch, courier find/dispatch/accept + deliver (credits fee); customer browse/menu/cart/order, merchant screen, courier offers on provider dashboard + delivery screen |
| Trilingual EN/KH/ZH | ✅ shared i18n + DB updated |

**Recommendation:** finish **Ride (Phase A)** first — it's started, has the biggest daily
demand, and maximally reuses the live engine. Then build the **Booking core** once to unlock
both **Vehicle Rental** and **Stay** together. Food last (most complex, 3-sided).
