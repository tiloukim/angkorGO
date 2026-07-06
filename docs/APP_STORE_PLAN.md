# AngkorGo — App Store & Google Play Launch Plan

Publishing the Expo (React Native) app to **Apple App Store** and **Google Play**, built and
submitted via **EAS** (config already in `apps/mobile/eas.json`, bundle id `ai.angkorgo.app`).

---

## 0. Key decision — one app or two?

Grab/Uber ship **separate rider and driver apps**; stores also prefer a focused experience.
- **MVP (recommended):** ship **one app** with a role toggle (what we have) — faster, one listing.
- **Scale:** split into **AngkorGo** (rider/customer) and **AngkorGo Driver/Partner** later.

Decide before creating store listings (it changes how many app records you make).

---

## 1. Accounts & fees (do first — enrollment takes days)

| | Cost | Notes |
|---|---|---|
| **Apple Developer Program** | $99 / yr | Enroll as a **company** (needs a **D-U-N-S number**, free, ~1–2 weeks) or individual. Company shows "AngkorGo" as seller. |
| **Google Play Console** | $25 once | Company account needs D-U-N-S too (Google now requires org verification). |

Start the D-U-N-S request now — it's the long pole.

---

## 2. Legal & policy prerequisites (both stores reject without these)

- [ ] **Privacy Policy** page — host at `https://www.angkorgo.app/privacy` (currently a `#` link)
- [ ] **Terms of Service** — `https://www.angkorgo.app/terms`
- [ ] **Support URL / email** — e.g. `support@angkorgo.app`
- [ ] **Account deletion** path (Apple + Google now require in-app or a URL to delete account)
- [ ] Data-collection disclosure (location, contacts, photos, payment) — used in both stores' privacy forms

> I can generate the Privacy/Terms pages and an in-app "delete account" flow — small task.

## 3. Store assets (trilingual: EN / KH / ZH)

- [ ] **App icon** 1024×1024 (no alpha) — `apps/mobile/assets/icon.png`
- [ ] **Adaptive icon** (Android foreground + background)
- [ ] **Splash screen**
- [ ] **Screenshots** — iPhone 6.7" + 6.5", iPad (if supported), Android phone + 7"/10" tablet
- [ ] **Google Play feature graphic** 1024×500
- [ ] **Descriptions** (short + full) in EN/KH/ZH
- [ ] **Keywords** (Apple), **category** = Travel or Maps & Navigation

## 4. Apple App Store specifics

- App Store Connect → new app, register bundle `ai.angkorgo.app`
- **Sign in with Apple** — required because we offer Google login ✅ (already implemented)
- **App Privacy** questionnaire — declare location (precise), photos, contact info, payments
- **Background location** (driver live-tracking) → strong review scrutiny: clear
  `NSLocationAlwaysAndWhenInUse` usage string + reviewer notes + a screen recording
- **Payments**: rides/repairs/rentals are **real-world services → exempt from Apple IAP**;
  external payment (KHQR/ABA/card) is allowed. State this in review notes to avoid a 3.1.1 rejection.
- **Demo account** for reviewers (a test rider + test provider login) — required
- Age rating questionnaire

## 5. Google Play specifics

- Play Console → create app; upload **AAB** (EAS `production` build)
- **Data safety** form (mirror Apple privacy)
- **Content rating** questionnaire (IARC)
- **Foreground service / background location** declaration + **demo video** of the feature
- **Target API level** must meet current requirement (Expo SDK handles; keep updated)
- Release track flow: **Internal testing → Closed → Production**

## 6. Build & submit (EAS)

```bash
cd apps/mobile
eas login
eas init                       # sets extra.eas.projectId
# secrets (one-time)
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value ...
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value ...
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value ...
# builds
eas build --profile production --platform ios
eas build --profile production --platform android
# submit
eas submit --profile production --platform ios       # to App Store Connect
eas submit --profile production --platform android    # to Play Console
```

Also fill the real values in `app.json` (replace `GOOGLE_MAPS_IOS_KEY` / `GOOGLE_MAPS_ANDROID_KEY`
placeholders) and `eas.json` env.

## 7. Pre-submission product gaps to close

The store build needs the app to actually *work*, so before submitting:
- [ ] Google Maps native keys wired (tracking + directions)
- [ ] Push notifications tested on device (Expo `projectId`)
- [ ] At least the **Mobile Auto Repair** flow fully working end-to-end on device
  (it's built; needs on-device QA with the live Supabase)
- [ ] Payment gateway live creds (or launch cash + KHQR only first)
- [ ] Account-deletion + Privacy/Terms live

## 8. Timeline (realistic)

| Week | Work |
|---|---|
| 1 | D-U-N-S + enroll Apple/Google; privacy/terms pages; assets |
| 2 | Wire Maps/push/payment creds; on-device QA; EAS production builds |
| 3 | Internal/TestFlight + Play internal testing; fix review-blockers |
| 4 | Submit → review (Apple ~1–3 days, Google ~1–3 days) → launch |

## 9. Immediate next steps I can do for you
1. Generate **Privacy Policy + Terms** pages and link them in the footer + app
2. Add an in-app **"Delete account"** flow (store requirement)
3. Wire the real **Maps / push / payment** env into `app.json` + `eas.json` once you have the keys
4. Draft the **trilingual store descriptions** (EN/KH/ZH)

You handle (external): D-U-N-S, Apple/Google enrollment, and generating the icon/screenshots
(I can spec exact sizes).
