# EcoRewards code guide (for team review and Assessment 2)

This guide explains **where to find each feature** in the source. Inline comments identify responsibilities; they are not a substitute for reading the function logic.

## 1. Mobile app structure

| Path | What it does |
|---|---|
| `src/app/index.tsx` | Sign-up/login gate, image hero, dashboard summaries, nearby task preview |
| `src/app/_layout.tsx` | Expo Router navigation, shared SessionProvider and BottomNav |
| `src/lib/session.tsx` | Secure token storage, saved backend URL, authenticated API fetch, refresh/logout |
| `src/lib/BottomNav.tsx` | Home, Report, EcoTasks, Rewards and Profile tabs |
| `src/lib/places.ts` | City/suburb options and approximate search coordinates |
| `src/lib/theme.ts` | Shared colour palette and reusable styles |
| `src/app/live-report.tsx` | Camera/gallery photo, location, category and multipart POST to backend |
| `src/app/live-tasks.tsx` | City/suburb/radius search for published low-risk tasks |
| `src/app/live-cleaner.tsx` | Verification application, claim, stop unsafe, evidence submission |
| `src/app/live-reports.tsx` | Database-backed report history |
| `src/app/live-rewards.tsx` | Approved EcoPoints and achievement levels |
| `src/app/profile.tsx` | Account navigation and cleaner profile entry |
| `src/app/live.tsx` | Server connection/account diagnostics screen |

`report.tsx`, `tasks.tsx`, `cleaner.tsx`, `rewards.tsx` and `my-reports.tsx` are **intentional one-line route aliases**. They are not duplicates; they keep the bottom navigation and deep links stable.

The unused `src/lib/demo.tsx` provider was removed. Active v12 screens use real backend state from `SessionProvider`.

## 2. Flask and database

| Path | What it does |
|---|---|
| `backend/app.py` | Flask app, mobile login/tokens, report submission, nearby tasks, task claims and review routes |
| `backend/advanced_features.py` | Cleaner applications, verification, region analytics, notification rules, authority PDF/email |
| `backend/mysql_database.py` | MySQL connection settings, schema and SQL compatibility |
| `backend/photo_privacy.py` | Privacy processing for uploaded photographs |
| `backend/photo_verification.py` | Image verification utilities |
| `backend/scheduled_authority.py` | Scheduled administrative authority exports |
| `frontend/` | Web admin dashboard: HTML, CSS, JavaScript and image assets |
| `SEED_20_DEMO_REPORTS.py` | Explicit optional demo data, never run for actual incident response |

**Mobile request flow:** iPhone (Expo screen) → `session.api(...)` with bearer token → Flask route → MySQL → JSON response → screen.

**Cleanup safety flow:** issue reported → screening + permission/eligibility check → admin or pre-authorised low-risk publication → verified cleaner claims with a site-specific safety check → evidence submission → admin outcome verification → rewards and recognition updated from verified records.

## 3. Working with source

- Search for `async function` in mobile screens to locate API actions.
- Search for `@app.route` and `@advanced.route` in backend files to locate Flask endpoints.
- Use the module and function comments as entry points to understand behaviour.
- Do not add actual SMTP passwords, API keys, database exports or personally identifying user photos to GitHub.
- Do not claim features are implemented just because an image mockup or a future roadmap mentions them.

## 4. Scope and validation

Cleaning this package was intended to preserve functionality. Syntax and structural checks do **not** establish that the API, Expo UI, SMTP delivery or MySQL workflows are live-tested. For capstone evidence, demonstrate and photograph each feature on your own test environment.
