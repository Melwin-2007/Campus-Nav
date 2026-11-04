# Product Requirements Document (PRD) — Campus Navigator

**Version:** 1.0.0  
**Status:** Approved Architecture Baseline  
**Project:** Campus Navigator  

---

## 1. Executive Summary & Vision
Campus Navigator is a modern, responsive, progressive web application engineered for university wayfinding, point-of-interest (POI) discovery, and pedestrian route navigation. Built with a map-first aesthetic ("Google Maps meets Airbnb"), the application provides accessible turn-by-turn directions, QR code location check-in, real-time GPS tracking, and a visual administrative graph editor for campus operators.

---

## 2. User Personas
- **Students & Faculty:** Rapidly locate classrooms, faculty departments, dining facilities, and restrooms with walking time estimates.
- **Visitors & Guests:** Discover campus landmarks, access building descriptions and operating hours, and scan physical signage QR codes to initiate immediate navigation.
- **Mobility-Impaired Users:** Calculate wheelchair-accessible paths that strictly eliminate stairs, steep grades, and curb barriers in favor of paved ramps and elevators.
- **Campus Administrators:** Visually maintain campus nodes, paths, and building metadata directly on an interactive map without database coding.

---

## 3. System Architecture & Tech Stack
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Leaflet, React-Leaflet, Framer Motion, Lucide-React, Axios, html5-qrcode.
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2, PyJWT, passlib/bcrypt, ReportLab, qrcode.
- **Database:** SQLite (`campus_navigator.db`) for zero-config local development and testing, structured with full PostgreSQL/PostGIS DDL portability.
- **Algorithms:** Dual hand-crafted routing engine (Dijkstra and A* with Haversine distance heuristic) with strict distance parity.

---

## 4. Geographic Model & Campus Topology
- **Campus Identity:** Apex Institute of Technology (AIT Central Campus)
- **Geographic Center:** Latitude `17.659900`, Longitude `75.906400`
- **Campus Bounding Box:** `[17.6560, 75.9020]` to `[17.6640, 75.9110]` (radius ~500m)
- **Walking Speed Standards:** Nominal pedestrian walking speed = 1.3 m/s; Accessible speed = 1.0 m/s.
- **GPS Snapping Radius:** Maximum allowable snapping distance to nearest graph node = 300 meters.

---

## 5. Functional Requirements (FR)
- **FR-01: Full-Screen Interactive Map:** Vector map tiles with light/dark theme switching, centered on campus with zoom constraints.
- **FR-02: Debounced Search & Autocomplete:** Real-time search across location names, departments, categories, and descriptions with keyboard navigation.
- **FR-03: Category Filtering:** 12 distinct category filter chips with live location counters.
- **FR-04: Location Details Panel:** Comprehensive building cards displaying photos, opening hours with calculated "Open Now / Closed" badges, facilities, and a "Directions" trigger.
- **FR-05: Dual Routing Engine:** Graph pathfinding with Dijkstra and A*, generating distance in meters, walking time, ordered coordinates, and turn-by-turn maneuvers.
- **FR-06: Accessibility Routing:** Filter paths to exclude stairs when `accessible_only=true`, gracefully notifying users if no accessible alternative exists.
- **FR-07: GPS Tracking & Snapping:** Geolocation tracker with dynamic accuracy circle and snapping to the nearest campus entrance node within 300m.
- **FR-08: QR Code System:** URL-safe location tokens, on-demand PNG QR codes, printable PDF signage posters, and in-browser camera scanning.
- **FR-09: Secure Admin Authentication:** JWT-based login with bcrypt password hashing and 24-hour token expiry.
- **FR-10: Visual Map Graph Editor:** Administrative canvas enabling interactive clicking to place nodes, drag coordinates, and link walkable edges.
- **FR-11: Data Health Auditor:** Diagnostic checks identifying disconnected nodes, isolated POIs, and edges with suspicious distance.
- **FR-12: Data Import & Export:** Bulk CSV/JSON import and export with validation before committing.

---

## 6. Non-Functional Requirements (NFR)
- **NFR-01 (Performance):** Route calculation response time $< 200\text{ms}$; UI search autocomplete $< 100\text{ms}$.
- **NFR-02 (Reliability):** Zero raw unhandled error dumps; user-friendly alerts with retry actions for all network or routing failures.
- **NFR-03 (Security):** Strict separation of secrets in `.env`; `.env` excluded from version control; rate limiting on authentication attempts.
- **NFR-04 (Accessibility):** WCAG AA compliance, high text contrast, full keyboard navigability, and minimum 44px tap targets.

---

## 7. Database Entity Specifications
1. **`categories`:** `id`, `name` (unique), `slug` (unique), `description`, `icon`, `color`, `is_active`, `created_at`.
2. **`locations`:** `id`, `name`, `category_id` (FK), `description`, `department`, `latitude`, `longitude`, `entrance_node_id` (FK), `opening_hours`, `facilities` (JSON), `photo_url`, `is_active`, `created_at`, `updated_at`.
3. **`path_nodes`:** `id`, `name`, `latitude`, `longitude`, `floor`, `node_type`, `is_accessible`, `is_active`, `created_at`.
4. **`path_edges`:** `id`, `from_node_id` (FK), `to_node_id` (FK), `distance` (float $\ge 0$), `edge_type` (`footpath`/`ramp`/`stairs`), `is_accessible`, `is_bidirectional`, `is_active`, `created_at`.
5. **`qr_codes`:** `id`, `location_id` (FK), `identifier` (unique UUID), `code_url`, `created_at`.
6. **`administrators`:** `id`, `username` (unique), `email` (unique), `hashed_password`, `is_active`, `is_superuser`, `created_at`.

---

## 8. REST API Specifications
- `GET /api/health` -> `{"status": "ok"}`
- `GET /api/categories` -> List of categories with location counts
- `GET /api/locations` -> List of active campus locations
- `GET /api/locations/{id}` -> Detailed location record
- `GET /api/locations/search?q={query}` -> Search results
- `POST /api/routes` -> Computed shortest route with maneuvers and coordinates
- `GET /api/qr/{identifier}` -> Location redirection / detail lookup
- `GET /api/qr/{location_id}/image` -> PNG QR code image stream
- `GET /api/qr/{location_id}/poster` -> PDF printable signage poster
- `POST /api/admin/login` -> Bearer JWT access token
- `GET /api/admin/stats` -> Aggregate dashboard metrics
- `POST /api/admin/nodes`, `POST /api/admin/edges`, `POST /api/admin/locations` -> Protected CRUD endpoints

---

## 9. Folder Layout (Section 12 Compliance)
```
e:\Campus-Nav\
├── backend\
│   ├── app\
│   │   ├── api\
│   │   ├── core\
│   │   ├── db\
│   │   ├── models\
│   │   ├── schemas\
│   │   ├── services\
│   │   ├── seed\
│   │   └── main.py
│   ├── tests\
│   ├── requirements.txt
│   └── pytest.ini
├── frontend\
│   ├── src\
│   │   ├── components\
│   │   ├── context\
│   │   ├── services\
│   │   ├── types\
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── PRD.md
├── DESIGN.md
├── RULES.md
├── PROGRESS.md
├── PROJECT.md
└── README.md
```

---

## 10. Acceptance Criteria Checklist
- [ ] Backend health probe `GET /api/health` returns HTTP 200 and `{"status": "ok"}`.
- [ ] Database schema initializes and populates with 12 categories, 14 locations, 26 nodes, and 42 edges.
- [ ] Dual algorithms (Dijkstra and A*) return mathematically identical distances for all connected pairs.
- [ ] Route planner selects stairs shortcut for normal requests and ramps detour when `accessible_only=true`.
- [ ] Disconnected location (Node 26) fails gracefully with HTTP 404 without crashing.
- [ ] Off-campus snapping beyond 300m rejects with HTTP 400.
- [ ] Admin endpoints reject unauthenticated calls with HTTP 401.
