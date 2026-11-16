EcoRewards — API-connected Mobile App (Capstone Integration Build)
===============================================================
This project contains TWO separate folders:
  EcoRewardsMobile/         Expo app for Android/iPhone
  EcoRewards_v9_Backend/    Updated Flask + MySQL web/admin/API service

REAL MODE (MySQL, NO FAKE APPROVALS)
----------------------------------
1. On Windows, install Python 3, Node.js LTS, XAMPP MySQL and Expo Go.
2. Extract this zip. Keep both folders together.
3. In XAMPP, Start MySQL.
4. Inside EcoRewards_v9_Backend, run START_ECOREWARDS_LAN.bat.
   If Python packages are missing, run:
     py -m pip install -r backend\requirements.txt
   If MySQL config is missing, follow the existing backend/.env.example and
   existing README / AUTO_SETUP_MYSQL.py instructions.
5. In a DIFFERENT CMD window on your Windows computer, type ipconfig.
   Find the IPv4 address of your Wi-Fi (example 192.168.1.20).
6. On the iPhone (on the SAME PRIVATE Wi-Fi), open Safari:
     http://192.168.1.20:5000/api/mobile/health
   Replace 192.168.1.20 with YOUR computer's IPv4 address.
   You should get JSON with ok:true. If not, check Windows Firewall/private network.
7. Inside EcoRewardsMobile, run START_MOBILE_APP.bat (or npm install, then npx expo start).
   Scan Expo's QR code with your iPhone and open it in Expo Go.
8. On the app home screen, tap "Connect to real MySQL app".
9. Enter http://YOUR-PC-IP:5000, press Test and save server, and register or sign in.
10. Choose REAL screens in the Live EcoRewards menu. All real screens call Flask API.

TO TEST TASKS AND APPROVAL
--------------------------
1. Submit a report. Submission does not publish a cleanup task.
2. On a separate admin account in a desktop browser, review/approve and
   publish a genuinely eligible LOW-RISK task in the Admin Dashboard.
3. In phone Real Mode, open EcoCleaner, upload four required equipment photos,
   accept the safety declarations and submit the application.
4. Sign into the Admin Dashboard as admin to review/approve the cleaner.
5. On the phone, refresh cleaner verification, find an eligible nearby task,
   complete the safety confirmation and claim.
6. Submit AFTER-cleanup photo. The backend queues it for admin verification.
   Points are only earned after appropriate admin approval; no phone-side points.
7. EcoPoints and milestone recognition are read from MySQL.

ABOUT OFFLINE DEMO MODE
-----------------------
The original colourful v10 demo screens remain on the home screen and are
CLEARLY marked DEMO. They use fictional sample data, not real MySQL records.
The NEW green connection card opens the separate real integration experience.
Do not treat demo tasks as real cleanup sites.

TECHNOLOGY
----------
Expo SDK 58, React Native, expo-router, expo-secure-store,
Flask REST API, MySQL/MariaDB via XAMPP, Python and PIL/photo screening.
Mobile login uses random 14-day bearer tokens. Token hashes are stored in
MySQL and tokens are kept in iOS Keychain/Android Keystore via SecureStore.
Live API is for trusted local Wi-Fi only, using HTTP during development.
A publicly deployed service requires HTTPS, access control/security testing,
privacy review, safe authorisation and a reliable hosting environment.

CURRENT SCOPE / LIMITATIONS
---------------------------
- REAL integrated: user registration/login/logout, real report photo upload,
  MySQL report list, published nearby tasks, cleaner application/equipment
  upload, admin-reviewed cleaner status, claim, unsafe stop, after-photo
  submission for review, EcoPoints balance and cleaner achievement title.
- Existing WEB admin dashboard includes review, authority reporting and
  area analytics. These are not rebuilt as native admin phone screens.
- AI screening in the inherited backend uses prototype rule/image matching;
  it is NOT a certified hazard detector or independently validated model.
- Demo-only: fictional demo task creation, simulated approval and fake points.
- Not implemented: real mobile push notifications, real partner rewards
  redemption, a production server/HTTPS and live council integration.
- No real field cleanup should be authorised based solely on this prototype.

TEST STATUS
-----------
Python source syntax checks and TypeScript transpilation syntax checks passed.
A live MySQL + Expo Go integration test could not be completed in the packaging
container. Please run the 10-step device test before showing a lecturer.
