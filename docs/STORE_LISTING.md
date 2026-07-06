# AngkorGo — App Store & Google Play Listing Package

Everything for the store listings. Config (version, icons, EAS submit) is in
`apps/mobile/app.json` + `eas.json`. Placeholder icons are committed — **replace with
real branding before final submission.**

---

## Basics

| Field | Value |
|---|---|
| App name | **AngkorGo** |
| Bundle ID (iOS) / Package (Android) | `ai.angkorgo.app` |
| Version / build | `1.0.0` / `1` |
| Category | **Travel & Local** (Play) · **Travel** primary, **Lifestyle** secondary (Apple) |
| Support URL | https://www.angkorgo.app |
| Marketing URL | https://www.angkorgo.app |
| Privacy Policy | https://www.angkorgo.app/privacy |
| Terms | https://www.angkorgo.app/terms |
| Support email | support@angkorgo.app |
| Age rating | 12+ (marketplace with user chat/reviews) |

## Subtitle / short description
- **Apple subtitle (30 chars):** `Rides, repairs, rentals & food`
- **Play short (80 chars):** `Cambodia's super-app: rides, mobile mechanic, car & home rentals, food delivery`

## Keywords (Apple, ≤100 chars)
`rideshare,taxi,tuktuk,moto,mechanic,tow,car rental,hotel,homestay,food delivery,cambodia`

## Full description (English)
```
AngkorGo is Cambodia's everyday super-app — five services, one account, one wallet.

🛺 RIDE — Book a moto, tuk-tuk, or car. See the fare up front, track your driver live, pay by cash or KHQR.
🔧 MOBILE AUTO REPAIR — Broken down? A mechanic, tow truck, tire, battery, or fuel provider comes to you.
🚗 RENT A VEHICLE — Rent cars and vans by the day from local owners.
🏠 STAY — Find short-term places to stay across Cambodia.
🍜 FOOD DELIVERY — Order from your favourite restaurants, delivered to your door.

• Real-time matching with the nearest provider
• Live GPS tracking and ETAs
• Pay by cash, KHQR, ABA, Wing, ACLEDA, or card
• English · ភាសាខ្មែរ · 中文

Help is on the way.
```

## Full description (Khmer / ភាសាខ្មែរ)
```
AngkorGo គឺជាកម្មវិធីទូទៅសម្រាប់ជីវិតប្រចាំថ្ងៃនៅកម្ពុជា — សេវាកម្ម ៥ ក្នុងកម្មវិធីតែមួយ។

🛺 ជិះ — កក់ម៉ូតូ តុកតុក ឬឡាន។ ដឹងតម្លៃជាមុន តាមដានអ្នកបើកបរ បង់ជាសាច់ប្រាក់ ឬ KHQR។
🔧 ជួសជុលរថយន្តដល់ទីកន្លែង — ខូចនៅតាមផ្លូវ? ជាងម៉ាស៊ីន រថអូស កង់ ថ្ម ឬប្រេង នឹងមកដល់អ្នក។
🚗 ជួលរថយន្ត — ជួលឡាន និងរថយន្តដឹកតាមថ្ងៃ។
🏠 ស្នាក់នៅ — រកកន្លែងស្នាក់នៅរយៈពេលខ្លីទូទាំងកម្ពុជា។
🍜 ដឹកអាហារ — កម្ម៉ង់ពីភោជនីយដ្ឋានដែលអ្នកចូលចិត្ត។

ជំនួយកំពុងតែមកដល់។
```

## Full description (Chinese / 中文)
```
AngkorGo 是柬埔寨的日常超级应用——五项服务，一个账户，一个钱包。

🛺 出行 — 预订摩托车、嘟嘟车或汽车。车费透明，实时追踪司机，现金或 KHQR 付款。
🔧 上门汽车维修 — 抛锚了？技师、拖车、轮胎、电瓶或送油服务上门。
🚗 租车 — 按天租用本地车主的汽车和面包车。
🏠 住宿 — 在柬埔寨各地寻找短期住宿。
🍜 外卖 — 从您喜爱的餐厅点餐，送货上门。

帮助即将到达。
```

---

## ⚠️ Review-access (MOST IMPORTANT — plan before submitting)

Login is **email OTP** (a 6-digit code emailed on sign-in). App reviewers can't
receive that code, so you MUST give them a way in. Pick one:

1. **Shared demo inbox (recommended)** — create a demo email whose inbox reviewers
   can open (a temp-mail or a shared Gmail), seed it as a user, and put the inbox
   URL + credentials in the review notes. Reviewers request the code themselves.
2. **Provided code** — put "Enter demo email; we'll supply the current 6-digit code
   within minutes — contact support@angkorgo.app" in App Review notes. Works better
   for Google than Apple.
3. **Add Google Sign-In** (already coded) — configure Google OAuth in Supabase, give
   reviewers a demo Google account. No OTP needed.

Seed a demo **customer**, **provider** (approved, with a vehicle), and **admin** so
reviewers can see both sides.

## App Review notes (paste at submission)
```
AngkorGo is a marketplace connecting customers with independent providers for rides,
mobile auto repair, vehicle rentals, stays, and food delivery in Cambodia.

LOGIN: email one-time code. Demo access: <email> — code available at <inbox URL / on request>.
Also try "Continue with Google" with demo account <google-demo> if enabled.

PAYMENTS: All transactions are for real-world services and physical goods (rides,
repairs, rentals, meals), paid via local gateways (KHQR/ABA/Wing/ACLEDA), card, or
cash — per App Store Review Guideline 3.1.3, these are exempt from in-app purchase.

LOCATION: Used only while the app is in use, to match nearby providers and show live
tracking during an active trip/delivery. No background location.

Sign in with Apple is supported.
```

---

## Assets checklist (replace the committed placeholders)
- [ ] **App icon** 1024×1024, no alpha/transparency → `apps/mobile/assets/icon.png`
- [ ] **Android adaptive icon** foreground 1024×1024 (safe zone) → `assets/adaptive-icon.png` (bg `#0B1220`)
- [ ] **Splash** → `assets/splash.png`
- [ ] **iPhone 6.7" screenshots** 1290×2796 — 3 to 10 (required)
- [ ] **iPhone 6.5" screenshots** 1242×2688 — recommended
- [ ] **Android phone screenshots** 1080×2340 (9:16) — 2 to 8 (required)
- [ ] **Play feature graphic** 1024×500 (required)
- [ ] **Play hi-res icon** 512×512

Suggested screenshot flow (one per service + tracking): Home (5 services) → Ride
fare picker → Live tracking map → Rescue categories → Food menu/cart.

---

## Submit (EAS)

1. Fill real values in `eas.json` → `submit.production` (Apple ID, App Store Connect
   app id, Apple Team ID; Google Play service-account JSON at repo path — **gitignored**).
2. Set EAS secrets (Maps + Supabase) and `eas init` for the project id.
```bash
cd apps/mobile
eas build --profile production --platform all
eas submit --profile production --platform ios       # → App Store Connect (TestFlight)
eas submit --profile production --platform android    # → Play internal testing
```
3. Promote from TestFlight / Play internal → production once approved.

## Pre-submit gates (from the app-store plan)
- [ ] Google Maps **billing enabled** + real keys wired (`app.json` placeholders + EAS secret)
- [ ] Demo review access working (see above)
- [ ] Real icon + screenshots
- [ ] Push tested on a device (Expo `projectId` set)
- [ ] Privacy/Terms live ✅, in-app account deletion ✅
