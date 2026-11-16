# EcoRewards — Capstone Localhost Enhancement (October 2026)

## Start on Windows (same existing workflow)
1. Unzip this folder. Install XAMPP and start **MySQL**.
2. Run `START_ECOREWARDS.bat`. If prompted, install dependencies using `py -m pip install -r backend\requirements.txt`.
3. Open `http://127.0.0.1:5000` and sign in. If the database is brand-new, the original demo initializer creates `admin@demo.com` / `Demo123!` and sample users. **Change demo credentials before sharing.**
4. Admin intelligence: `http://127.0.0.1:5000/admin/intelligence` (admin login required).
5. Cleaner application, profile and nearby inbox: `http://127.0.0.1:5000/cleaner/portal` (user login required).
6. Data retained: existing database is not reset. Added tables are created automatically.

## Implemented code
- Area and suburb drill-down (illustrative region mapping), category filters, live KPIs, interactive report explorer, six-month report-creation trend, monthly comparison, authority CSV export.
- Individual cleaner profile, eight WHS-derived declarations, four equipment **photo uploads in private storage**, applicant review and expiry, verification gate for directly claiming approved low-risk tasks.
- In-app nearby notifications for verified cleaners within opt-in 2/5/10 km radius, generated when a new task is published. This is **NOT OS push delivery**.
- Authority address registry, manual draft/send via separately configured SMTP, recipient verification and exportable CSV audit artifacts. No council communication occurs by default. Recipients need permission and confirmation of official channels.
- Rule-based hazard-text alerts and previous SHA-256/perceptual photo comparison results are stored in AI assessment table; this is NOT a vision AI classifier.
- Uploaded issue images remove EXIF. Optional frontal-face detection+blur using OpenCV generates a redacted display copy. No non-privileged image visibility if no processed copy. Human privacy check still required; license plates/full bodies/background details may be missed.
- All existing user reporting, reviews, rewards and MySQL setup retained.

## Optional privacy face preprocessing
`py -m pip install opencv-python-headless` (optional; may require additional disk space). Without it, non-privileged users cannot see uploaded images until redaction implementation exists. With it, simple frontal-face detection is NOT guaranteed to blur all people. Production use requires visual review and a stronger privacy process.

## Email configuration (optional, no real messages by default)
Configure these **environment variables** on the machine running the Flask app before starting it: `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. Emails are sent only when an administrator presses **Send**, selects an independently verified & enabled recipient, and confirms. SMTP acceptance does not mean a council has accepted the report. **Never put secrets in GitHub.** Email settings are not entered into the public browser.

## Non-implemented / requires more development
- Actual trained computer-vision hazard recognition (glass, needles, chemicals, people) and calibrated safety risk scores.
- Full automatic task auto-publication by AI alone: deliberately gated by independent permission/site risk assessment to prevent unsafe releases.
- Scheduled background daily/weekly sends: currently manually generated daily/weekly datasets and manual send; scheduler + consent/workflow needed.
- OS-native Android/iOS push notifications: only in-app inbox; mobile app requires future React Native/API integration.
- Accurate council boundaries/authorities: illustrative suburb-region assignments only; verify official GIS and lawful communications.
- Production security: HTTPS, CSRF, anti-abuse/rate limiting, data retention, full role-based approvals, deployment security review, accessibility and comprehensive tests.
- Automated photo privacy is limited and requires human checking before external distribution.

## WHS references
- Queensland Workplace Health and Safety Codes of Practice: https://www.worksafe.qld.gov.au/laws-and-compliance/codes-of-practice
- Clean Up Australia safety resources: https://www.cleanup.org.au/safety/

The 8-question checklist is an **adaptation of published guidance**, not a government-approved form. Obtain competent WHS review and site permission before real-world cleanup.

## Authority daily and weekly scheduled exports
- Double-click `AUTHORITY_DAILY_DRAFT.bat` or `AUTHORITY_WEEKLY_DRAFT.bat` to create local CSV and audit rows for all active/verified recipients. This **does not send email**.
- To automate daily/weekly creation, schedule the batch file through **Windows Task Scheduler** at the desired time with XAMPP MySQL running. The app itself does not install or modify Task Scheduler.
- For real emails: run `py backend\scheduled_authority.py weekly --send` only after setting `ECOREWARDS_ENABLE_SCHEDULED_EMAIL=1` in the environment AND confirming approved recipient addresses and SMTP configuration. The weekly/daily `.bat` launchers intentionally never send.
