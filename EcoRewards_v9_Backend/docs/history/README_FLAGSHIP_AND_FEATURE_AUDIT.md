# EcoRewards • Flagship design refresh and feature audit (30 October 2026)

## Why this update
The previous localhost application looked like three separate prototypes. This release unifies the colour system, typography, card density, navigation and responsive composition across the community app, intelligence dashboard and verified-cleaner workspace. The inspiration is the *clarity and progressive disclosure* of Snap Send Solve, not copying its brand, proprietary illustrations or UI assets.

The main app remains at http://127.0.0.1:5000, the admin intelligence area at /admin/intelligence, the cleaner portal at /cleaner/portal. All three remain **localhost Flask web interfaces**; this package is not a native mobile APK.

## Current implementation inventory
**Present in source code** (requires live MySQL environment to validate end-to-end):
- Account login/register and role-aware core user/admin pages.
- Environmental reports with photos, issue category, description, location and coordinate fields.
- Admin review, report/task state transitions, safe task handling, unsafe stop and points ledger.
- SHA-256/perceptual hashing and photo-match records. Similarity is not proof of fraud or of the same physical incident.
- Cleaner application, WHS-derived declarations, private equipment-photo submission, administrator verification and status expiry.
- Verified eligible cleaner task claim without an additional per-task approval, subject to site-specific safety confirmation.
- User/cleaner profile and opt-in in-app proximity alerts with 2/5/10 km settings.
- Region/suburb administrative filtering, status and category insights, six-month analytics, authority export and recipient configuration.
- Manual authority draft and gated SMTP dispatch logging; daily/weekly local draft preparation.
- EXIF stripping and optional OpenCV frontal-face blurred display copy; cannot guarantee bystander anonymity.

**Prototype / limited:**
- Text/category safety indicators; no validated vision model identifying real glass, sharps, chemicals or needles.
- Non-authoritative region mapping until Brisbane boundary dataset integrated and verified.
- Conditional automatic task approval workflow requires formal permissions, safety policy and hazard validation before live use.
- Privacy blur limited; additional human redaction and access validation needed.

**Not yet delivered:**
- Native React Native Android/iOS application, APK/AAB/IPA, app-store release.
- Device push notification service (only in-app local inbox).
- Fully autonomous and validated image-based hazard recognition.
- Automatic unattended real-council emails (send deliberately restricted; draft scripts do not email).
- Legally certified checklist/cleaner, council partnership, production-grade hosting and full on-device user acceptance testing.

## Academic report
Companion artifact: `EcoRewards_Research_Standard_Capstone_Report.docx`, a research-led extended capstone proposal with critical analysis, Harvard references, WBS, 12-week sprint plan, test strategy and distinction between implementation and planned components. The unit brief specifies **2,000 words**; this extended version needs editing if the limit is enforced.

## Safe startup
1. Extract the ZIP to your own project directory (do not overwrite existing files without backing up).
2. Start MySQL in XAMPP and run `START_ECOREWARDS.bat`.
3. Use only synthetic data in lecturer-facing demonstrations; remove demo credentials before external access.
4. See `README_NEW_FEATURES.md` for requirements, safety/privacy limitations and email configuration.

## Cautions
This package has passed Python compilation, JavaScript syntax, and static/photo/adapter tests in the generation environment; Flask-based integration tests could not run because Flask and a live MySQL service were absent. No proof of fully functioning external authority email or AI hazard recognition is claimed. A qualified WHS review is required before offering real cleanup tasks.

Sources: https://www.snapsendsolve.com/how-it-works ; https://www.worksafe.qld.gov.au/laws-and-compliance/codes-of-practice ; https://www.cleanup.org.au/safety/ ; https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines
