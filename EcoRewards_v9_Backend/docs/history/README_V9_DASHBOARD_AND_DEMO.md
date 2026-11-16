# EcoRewards v9 — Clickable dashboard + 20 fictional reports

## Dashboard
Sign in as admin → Operations Overview. Click **Total reports**, **Completed tasks**, **High-risk reports** or **Available EcoTasks** to open the appropriate filtered Issue Reports screen. The cards derive from actual database rows. On the normal-user dashboard, click Your Reports/Verified Reports for My Activity, EcoPoints for Rewards, or Open EcoTasks for task search.

## Populate test data
Start XAMPP MySQL. Double-click `ADD_20_DEMO_REPORTS.bat`, and answer Y. The script reads the same backend/.env MySQL settings as the app. It only adds records if they are not already present; rerunning is safe. It does not delete or replace existing records.

Adds exactly **20** clearly labelled fictional reports across **20 Brisbane suburbs**: 10 approved low-risk published EcoTasks, 4 high-risk referrals, 3 pending reviews, 3 historical resolved cleanups. The 10 demo EcoTasks include suburb-centre coordinates so Nearby Tasks can find them by City, Suburb, and 2/5/10 km search radius. Real reports are unchanged. Existing initial default records may make dashboard totals greater than 20.

**IMPORTANT:** These are training records, not real dumping incidents. `[DEMO-V9-xx]` appears in every title. Their 'approved' statuses mean *simulated for software testing*, not actual site permission, trained personnel, or verified safety. Never dispatch demo referrals to a real authority, carry out real-world tasks at the demo coordinates, or use them as proof of actual cleanup impact. Demo 'resolved' records do not award EcoPoints.

## Nearby alert conditions
When the demo reports are inserted, in-app notification records are created for existing users **only if** they are verified cleaners, have alerts enabled and saved coordinates, and their alert radius includes the report. For a cleaner without an existing suitable preference, open EcoCleaner Profile and save City/Suburb and radius first, then run this demo importer (it may skip previously imported tasks; see below). Alternatively, browse EcoTasks → choose a location → 10km → Show EcoTasks. To refresh existing notifications use a fresh demo dataset or publish a newly approved report normally; importer is intentionally idempotent.

## Safety
Demo reports have no actual photographic evidence. They should be used for navigational, database and UI testing; real completion or public-facing environmental reporting requires genuine evidence and approvals.
