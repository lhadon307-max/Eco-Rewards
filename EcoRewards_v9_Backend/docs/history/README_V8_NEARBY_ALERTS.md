# EcoRewards v8 — City/Suburb Nearby Alerts & Task Discovery

## What's new
- Cleaner Profile > Nearby Alerts: choose City, Suburb and 2/5/10 km radius; no latitude/longitude fields.
- Cleaner Profile > Available EcoTasks: displays published tasks within the chosen radius and explains empty results.
- Main EcoTasks screen: matching City/Suburb selectors and a distance filter; GPS remains optional.
- Named alert locations saved with existing coordinates in MySQL, without deleting existing records.
- Suburb options cover selected suburbs of Brisbane, Gold Coast and Ipswich (expandable later).

## How to use
1. Start XAMPP MySQL. Run START_ECOREWARDS.bat and log in as a normal user.
2. Open EcoCleaner Profile > Nearby Alerts.
3. Select Brisbane > South Brisbane, choose 5 km, tick alerts, and click Save alert preferences.
4. Click Show available EcoTasks. If none appear, increase distance to 10 km or try another suburb.
5. For an actual task to appear, admin must open an unassigned report and use Verify & Publish (or Publish an already approved low-risk report), with valid GPS and site safety confirmation. A submitted report alone is not an available task.
6. Cleaners require an active verified profile and a per-task safety check before claiming. If no eligible task is published within the radius, the screen intentionally shows zero results.

## Technical notes
- Suburb-centre coordinates are approximate convenience values, not official GIS property locations. Distances are straight-line from that centre. Reports require genuine coordinates to appear in the nearby search.
- In-app notifications require saved opt-in preferences and approved cleaner verification. These are not native phone push notifications.
- A small SQL migration adds optional `city` and `suburb` columns to `notification_settings`. Existing user data and reports remain intact. Back up MySQL data before updating.
- If a user's old alert setting contains only raw coordinates, select city/suburb and save once to migrate the preference.
- Cities/suburbs can be expanded in `backend/advanced_features.py` in `CITY_SUBURBS`. For production, replace the approximate coordinates with authoritative suburb geometries/geocoding.
- No demo tasks are generated just to fill the list; the list reflects actually published low-risk reports.
