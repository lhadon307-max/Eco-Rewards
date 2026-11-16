# EcoRewards v6 — visual refresh and cleaner verification interface

## Changes
- User accounts see **EcoCleaner Profile**, not Admin Intelligence.
- Admin accounts see **Admin Intelligence**, not the personal cleaner registration portal.
- Direct visits to `/cleaner/portal` as an admin redirect to `/admin/intelligence`.
- Admin cleaner review shows equipment photo previews, checklist completion, training notes, decisions and clear error/success messages.
- Cleaner portal has an explicit **Refresh status** control after administrator decisions.
- Brighter dashboard: photographic banner, blue/violet/teal/gold KPI accents, stronger text contrast, responsive cards and subtle motion with reduced-motion support.
- Existing Flask/MySQL schema, report history, and authority PDF/email routes retained.

## How to check approval
1. Sign in as a normal user. Open **EcoCleaner Profile**, complete all WHS-aligned declarations and upload four equipment photographs. Press **Submit for administrator verification**. Status should say *Awaiting administrator review*.
2. Sign out and sign in as an administrator. Open **Admin Intelligence → Cleaner verification**. Review equipment photos. Click **Approve 180 days** and confirm the evidence check. A success message should appear and the application should show *approved*.
3. Sign out of admin and sign in as the cleaner. Return to EcoCleaner Profile and click **Refresh status**. It should say *Verified EcoCleaner — active*. Only eligible published low-risk tasks may be claimed, with the task-specific safety check.

Note: 'Verified EcoCleaner' is an internal platform verification, not a government certification.

## Setup / cache
- Keep XAMPP MySQL running. Run `START_ECOREWARDS.bat`. Then press **Ctrl + Shift + R** in your browser to refresh assets.
- If Python reports a missing module, run `py -m pip install -r backend\requirements.txt` from the EcoRewards folder.
- The update includes code and static-test checks. Full real-device and live XAMPP/SMTP end-to-end tests were not possible in this environment.
- Your existing database is not intentionally reset or deleted by this package. Keep a backup of your earlier folder and database before replacing code.
