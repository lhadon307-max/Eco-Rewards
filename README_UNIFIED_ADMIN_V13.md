# EcoRewards v13 — Unified Admin Dashboard

Admin entry URL: `/admin` (redirects to `/admin/intelligence`). The previous two competing admin interfaces are combined into the Design 5-inspired Intelligence Studio shell.

## Features
- One left navigation, scrollable content and uncluttered overview
- Reports and decisions (verify/publish, refer, reject, inspect local photo matches)
- Task operations, evidence approval and safe task holds
- Regions/suburbs, six-month analytics, AI exception review
- Cleaner verification, authority exports and PDF/email history
- Community members, per-user activity, EcoPoints ledger and audit log
- Admin profile and sign-out

## Key code files
- `frontend/templates/intelligence.html`: unified page structure
- `frontend/static/unified_dashboard.css`: responsive Design 5 layout
- `frontend/static/unified_operations.js`: database-backed controls and safe decisions
- `frontend/static/intelligence.js`: existing analytics / authorities / cleaner flows
- `backend/app.py`: `/admin` redirect, existing secure decision APIs

## Safety / security
No AI-based automatic hazard approval has been added. The existing Flask backend still validates role, permission, risk and site confirmation; unsafe-suspended tasks remain blocked. Authority referrals are not represented as successfully delivered unless a real dispatch was made.

Run the existing backend startup batch file, then sign in as admin and open `/admin`. Testing with your configured MySQL database is still recommended.
