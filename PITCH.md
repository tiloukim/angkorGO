# 🇰🇭 AngkorGo — Cambodia's Everyday Super-App

> **One app. All services. Everywhere in Cambodia.**
> Trilingual (English · ខ្មែរ · 中文) · one login · one wallet · one map.

---

## The opportunity

Cambodia has a young, fast-urbanizing, mobile-first population and rapid adoption of **KHQR / Bakong** digital payments — but everyday services are still fragmented across cash, phone calls, and single-purpose apps. Foreign super-apps aren't deeply localized (language, local payments, local trust). **AngkorGo is a built-for-Cambodia super-app**: every daily need in one trilingual place, paid the way Cambodians actually pay.

## What it is — 6 services in one app

| | Service | What it does | Model |
|---|---|---|---|
| 🛺 | **Ride** | Moto / tuk-tuk / car hailing with live dispatch, GPS tracking & per-class fares | Grab / Uber |
| 🍜 | **Food** | Order from restaurants → kitchen → courier → your door | Foodpanda |
| 🚗 | **Rental** | Rent cars & vans by the day from local owners | Turo |
| 🏠 | **Stay** | Short-term homes, apartments & villas | Airbnb |
| 🔧 | **Repair** | Roadside mechanic, tow, tire, battery & fuel — comes to you | Mechanic-to-you |
| 📦 | **Express** | Send a parcel A→B with a 4-digit proof-of-delivery code | Grab Express |

Plus a safety layer no rival offers:

## 🚨 Emergency SOS

A **membership** ($2/month) unlocks a one-press panic button that locates the **nearest police station**, fires an alert, and surfaces it on a live **ops dashboard** — member presses, ops acknowledges, the member's phone confirms help is coming, all in real time. (Users are always directed to call 117 for immediate danger.)

## Why it wins — one engine, six businesses

AngkorGo is built on a single shared backbone, so each new vertical is fast and cheap to add:

- **Dispatch** — PostGIS nearest-provider matching with atomic, first-wins accept
- **Tracking** — live GPS + Google Routes, real-time ETAs
- **Payments** — polymorphic escrow (ride / food / booking / order / parcel), 90/10 split, KHQR-native
- **Identity, wallet, ledger, ratings, trilingual UI** — shared across everything

**The moat:** deep local fit (language + KHQR + trust), a differentiated **safety** feature, and an engine that turns "add a vertical" into weeks, not quarters.

## The apps

- **AngkorGo** — the consumer super-app (all 6 services + SOS)
- **AngkorGo Driver** — a dedicated, separately-branded driver/courier/mechanic app
- **Admin console** — provider & vehicle approvals, operations, payouts, and live SOS alerts (in production)

## Business model

- **10% platform commission** on every transaction (providers keep 90%)
- **$2/month membership** (Emergency SOS + member perks)
- **B2B**: monthly partner fees from police stations for the safety network
- KHQR / ABA PayWay / Bakong-ready; cash supported via a driver-commission ledger

## Status — MVP complete & device-verified

- ✅ **All 6 verticals working end-to-end** on real devices — request → match → track → complete → rate → **pay (KHQR escrow → release)**
- ✅ **Emergency SOS** proven app ↔ admin in real time
- ✅ Driver app split, trilingual throughout, admin console **live on the web**
- 🛠️ Built on Expo/React Native · Next.js · Supabase (Postgres + PostGIS + Realtime + Edge Functions) · Google Maps/Places/Routes
- 34 database migrations live · 5 edge functions deployed · hardened through real device testing

## Path to launch

1. **Payments** — activate ABA PayWay / Bakong merchant (swap the sandbox)
2. **Ship** — EAS builds → App Store + Google Play (customer + driver apps)
3. **Safety** — sign police-station partners + a reliable alert-delivery channel (+ legal review)
4. **Go-to-market** — Phnom Penh launch, provider onboarding, launch promotions

---

**In one breath:** *AngkorGo is Grab + Foodpanda + Turo + Airbnb + roadside rescue + parcel courier + a personal-safety panic button — one trilingual app, one wallet, built for Cambodia. And it already works.*

*One app. All services. Everywhere in Cambodia.* 🐘
