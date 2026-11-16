# EcoRewards — Professional UI refresh (v3)

This package builds on **EcoRewards_Localhost_Enhanced_v2**, preserving the Flask/MySQL backend and feature endpoints.

## What changed

- Added `frontend/static/professional.css`: unified forest/sage design tokens, Manrope typography, clean card layouts, accessible focus states, readable data tables, breakpoints for mobile and tablet.
- Reworked `/admin/intelligence`: premium dashboard navigation, hero summary, 3-column KPI grid, category distribution bars, whitespace and clearer nested pages.
- Reworked `/cleaner/portal`: standalone cleaner workspace with profile, verification, alerts and notification sections, mobile-compatible navigation, form grouping.

## How to run

1. Extract ZIP, start MySQL in XAMPP, run `START_ECOREWARDS.bat`.
2. Open `http://127.0.0.1:5000/admin/intelligence` with an admin login.
3. Open `http://127.0.0.1:5000/cleaner/portal` with a user login.
4. For unchanged existing functionality see `README_NEW_FEATURES.md`.

## What this version is NOT

This is a **UI/UX redesign**, not a claim that the backend became production-ready. The same existing prototype limitations remain for trained visual hazard AI, council delivery, actual push notifications, legal WHS approval and full end-to-end testing. The web admin console is intended for local testing; the requested native mobile app still needs development.
