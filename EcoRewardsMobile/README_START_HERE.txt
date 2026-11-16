ECOREWARDS v10 — MOBILE DEMONSTRATION FOR INF305
================================================

QUICK START ON WINDOWS
1. Extract the ZIP using Extract All.
2. Open the EcoRewardsMobile folder.
3. Double-click START_MOBILE_APP.bat.
4. Wait for the Expo QR code and scan using Expo Go on iPhone or Android.
   The phone and PC should use the same Wi-Fi.
5. If your Expo Go app reports SDK incompatibility, use a version compatible with Expo SDK 58.

WHAT TO SHOW THE LECTURER (5-MINUTE DEMO)
1. Home → photo banner, clickable features and 20 demo reports.
2. Report an Issue → select category and suburb, add photo, save sample report.
3. My Reports → find the newly added report and filter high-risk cases.
4. Nearby EcoTasks → Brisbane / South Brisbane / 10 km → show eligible jobs.
5. EcoCleaner → upload an equipment photo → tick safety acknowledgement →
   submit demo application → Simulate Admin Approval → claim a sample task →
   simulate verified completion.
6. Rewards → see 100 demo EcoPoints and achievements progress.
7. Profile → enable alerts and review matching demo jobs; reset demo as needed.

IMPORTANT CAPSTONE ACCURACY
* All 20 initial records are FICTIONAL sample records from Brisbane suburbs.
* Ten sample records are available low-risk EcoTasks.
* Cleaner approval, evidence verification and points are explicitly SIMULATED.
* No external council notification, actual AI inference, live cleaner certification,
  real reward redemption or production push notification occurs in this demo.
* The attached EcoRewards_v9_Backend is a separate Flask/MySQL web project.
  These new demo screens DO NOT sync to it automatically.
* Real deployment requires authenticated mobile API integration, secure session
  persistence, real photo upload, admin verification and full device testing.
* For real locations and hazard reports use proper authority channels.

COMMON ERRORS
If npm ERESOLVE occurs, do not use npm audit fix --force.
Run: npm install
Then: npx expo start --clear
Ensure stable Node.js LTS rather than alpha builds.

For an Expo login issue, use: npx expo login --no-browser
Then: npx expo whoami

All code is editable in VS Code. Root source files are in src/app and src/lib.
