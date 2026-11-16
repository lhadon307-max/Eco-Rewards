# EcoRewards v7 — Cleaner recognition and searchable filters

Cleaner recognition is calculated directly from approved completion records (`reports` rows with `status=resolved`, `task_status=completed`, `assignee_id=current user`). No fabricated points or progress are stored. Milestones: 10 Eco Explorer, 50 Community Champion, 100 Eco Legend. An unverified user can see historical achievements, but recognition does not grant cleaner approval or allow hazardous work. Cleaner verification rules remain unchanged.

Cleaner portal `/cleaner/portal` includes live achievements, progression and badges. Endpoint: `GET /api/advanced/cleaner/recognition` (authenticated).

All select controls with at least four choices gain type-to-filter, arrow keys, Enter and Escape support with original select values and change events preserved. Especially useful for report category and admin category filters. The original selects remain the source of truth; no server-side category rules are changed.

Run using the existing `START_ECOREWARDS.bat` after starting MySQL in XAMPP. Use Ctrl+Shift+R in the browser after replacing files. These changes do not modify or delete existing MySQL tables.
