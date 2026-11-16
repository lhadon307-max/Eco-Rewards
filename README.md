# EcoRewards — Capstone Source Code

EcoRewards combines a **React Native / Expo mobile app**, a **Flask REST API**, and **MySQL (XAMPP)** for environmental reporting, low-risk cleanup tasks, cleaner verification and rewards.

## Folder structure

- `EcoRewardsMobile/` — iPhone/Android interface and API client
- `EcoRewards_v9_Backend/backend/` — Flask routes, task safety, authentication, MySQL adapters
- `EcoRewards_v9_Backend/frontend/` — browser-based administration dashboard
- `EcoRewards_v9_Backend/tests/` — backend checks
- `EcoRewards_v9_Backend/docs/history/` — earlier sprint feature notes, retained as project history
- `docs/CODE_GUIDE.md` — readable map of the main modules and data flow

## Running locally

1. Start **MySQL** from XAMPP.
2. In `EcoRewards_v9_Backend`, start `START_ECOREWARDS_LAN.bat`.
3. In `EcoRewardsMobile`, start `START_MOBILE_APP.bat`.
4. On the phone, open the Expo QR code, then enter your computer's LAN IP as `http://YOUR_IP:5000`. Both devices must be on the same private Wi-Fi.
5. Sign up/log in, submit a labelled test report and review it in the browser admin interface.

### Testing

- Mobile type check (after installing dependencies): `cd EcoRewardsMobile && npm run check`
- Package compatibility: `cd EcoRewardsMobile && npm run doctor`
- Python syntax: `python -m compileall -q EcoRewards_v9_Backend/backend`

## Important boundaries

- The **mobile app calls Flask**, never MySQL directly.
- **Cleaner approval** and **completion rewards** must be verified server-side.
- Automatic hazard screening cannot establish site safety; unsafe/uncertain items need review.
- Demo reports are **fictional test records**, never real cleanup authorisations.
- Local Wi-Fi HTTP is for development only; production deployment needs HTTPS, strong secrets and formal security/safety testing.
- Partner coupons and public council email delivery depend on agreements and deployment configuration.

This is the **commented, organised v12 source package**, not proof of deployment to a public app store.
