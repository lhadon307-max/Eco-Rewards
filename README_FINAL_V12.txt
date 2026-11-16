EcoRewards v12 — Professional API-connected mobile project

WHAT YOU GET
- Branded welcome screen with Sign Up / Login BEFORE dashboard.
- Real Flask/MySQL authentication and secure stored session token.
- Visual Brisbane dashboard, real approved nearby tasks, My Impact (reports, completed tasks, nearby tasks) and EcoPoints. No maps or CO2 calculations.
- Single bottom navigation: Home, Report, EcoTasks, Rewards, Profile. No duplicate shortcut tiles.
- Report form with image, city/suburb, category, and GPS; cleaner application, required safety acknowledgement, real admin approval, task claims, completion evidence, unsafe stop; MySQL reports and recognition.
- Original v9 web admin / MySQL backend included for admin review, approvals, and PDF authority reports.

IMPORTANT STATUS
This is an API-connected development app, NOT a published App Store application. The UI is built in source, but end-to-end device and live MySQL tests require your computer and phone. The screenshot used as visual inspiration is not a working UI itself. Real partner redemptions and push notifications are NOT implemented. Do not perform real cleanups based on fictional demo seed reports.

HOW TO START
1. Extract ZIP to a new folder (do not overwrite your previous project).
2. Start XAMPP MySQL.
3. In EcoRewards_v9_Backend run START_ECOREWARDS_LAN.bat. If needed install backend requirements first: py -m pip install -r backend\requirements.txt
4. In EcoRewardsMobile run START_MOBILE_APP.bat (Node.js stable LTS recommended). If npm has React dependency errors use: npx expo install --fix ; do not run npm audit fix --force.
5. Scan Expo QR code on iPhone using Expo Go.
6. At welcome screen enter your computer's IP as http://192.168.x.x:5000 (use ipconfig in Windows CMD for your IPv4 address). Sign up once, or log in with your account.
7. Test reporting -> admin review in web dashboard -> approved low-risk task -> cleaner verification -> claim -> completion review -> points.

DEVELOPMENT SECURITY
Local HTTP is suitable only for trusted LAN testing. Never expose Flask dev server publicly; public deployment requires HTTPS, secure server and privacy/safety audits. Admin must approve cleaner applications and completed evidence. Badges are not safety credentials.

NOTES
The demo figures in generated design mockups were fictional. This app reads counts and EcoPoints from APIs and does not display false CO2 or waste-weight estimates. At this stage, milestone progress uses completed tasks visible in the API report feed; backend recognition route supplies the official verified task badge.
