# Project: Campus Navigator

## Architecture
Decoupled full-stack progressive web application for university campus wayfinding:
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Leaflet, React-Leaflet, Framer Motion, Lucide-React, html5-qrcode.
  - Floating Left Panel (Desktop, 400px) & Draggable Bottom Sheet with 3 snap points (Mobile, <768px).
  - Design Tokens: Primary Deep Indigo (`#4F46E5`), Accent Vibrant Teal (`#14B8A6`), Warm Amber (`#F59E0B`), Danger Red (`#EF4444`). 12 distinct color-blind friendly category tokens.
- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic v2.
  - SQLite (`campus_navigator.db`) for local development & automated test suites, structured for PostgreSQL/PostGIS DDL parity.
  - RESTful architecture with public endpoints, secure JWT admin authentication, and streaming QR code/poster generators.
- **Routing Engine**:
  - Dual graph pathfinding algorithms: Hand-crafted Dijkstra (priority queue) and A* with Haversine great-circle heuristic.
  - Distance parity guarantee: Dijkstra distance == A* distance for all connected pairs.
  - Accessibility routing (`accessible_only=true`): dynamic filtering of stairs vs ramps with friendly failure alerts.
  - Coordinate snapping to nearest active graph node within 300m (off-campus rejection with 400 Bad Request).
  - Bearing calculations ($\Delta\theta$ azimuth), collinear segment merging, and 8-tier maneuver classification.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dijkstra Shortest Path | Priority queue shortest path calculation | M2 | Prompt Kit §5 Prompt 6, R3 |
| 2 | A* Pathfinding | Heuristic search using straight-line Haversine | M2 | Prompt Kit §5 Prompt 6, R3 |
| 3 | Algorithm Parity Benchmark | Automated test ensuring Dijkstra and A* match | M2 | Prompt Kit §5 Prompt 6, R6 |
| 4 | Accessibility Route Filter | Filters graph edges to exclude stairs / non-wheelchair paths | M2 | Prompt Kit §5 Prompt 6, R3 |
| 5 | Coordinate Snapping | Snaps GPS coordinates to nearest node within 300m | M2 | Prompt Kit §5 Prompt 6, R3 |
| 6 | Turn-by-Turn Generator | Calculates bearing changes, maneuvers, merges straight segments | M2 | Prompt Kit §5 Prompt 6, R3 |
| 7 | Walking Time Estimator | Computes duration based on 1.3 m/s nominal or 1.0 m/s accessible | M2 | Prompt Kit §5 Prompt 6 |
| 8 | Full-Screen Leaflet View | Interactive map display with light/dark OSM tile support | M4 | Prompt Kit §3 Prompt 0B, §5 Prompt 4 |
| 9 | Custom Category Markers | SVG markers with category color and white Lucide icons | M4 | Prompt Kit §3 Prompt 0B, §5 Prompt 4 |
| 10 | Marker Selection Glow | Highlights marker with amber glow, scales up, pans map | M4 | Prompt Kit §3 Prompt 0B, §5 Prompt 4 |
| 11 | Animated Route Polyline | Animated drawing of teal route line with white outline border | M5 | Prompt Kit §3 Prompt 0B, §5 Prompt 7 |
| 12 | Debounced Search Input | Case-insensitive autocomplete across name, dept, category | M4 | Prompt Kit §5 Prompt 5, R4 |
| 13 | Category Filter Chips | Horizontally scrollable pill buttons filtering visible markers | M4 | Prompt Kit §3 Prompt 0B, §5 Prompt 5 |
| 14 | Location Detail Panel | Card displaying photo, name, category, hours, facilities | M4 | Prompt Kit §5 Prompt 5, R5 |
| 15 | Opening Hours Evaluator | Calculates "Open now" vs "Closed" status badge | M4 | Prompt Kit §5 Prompt 5 |
| 16 | Live GPS User Tracking | Browser Geolocation API tracking with accuracy circle | M4 | Prompt Kit §5 Prompt 8, R5 |
| 17 | Off-Campus Geolocation Fallback | Warns user if GPS is far outside campus boundary (>300m) | M4 | Prompt Kit §5 Prompt 8, R5 |
| 18 | QR Code Generator | Cryptographic tokens and PNG QR code stream | M3 | Prompt Kit §5 Prompt 9, R4 |
| 19 | Printable Poster Generator | Printable campus signage PDF with building name and QR | M3 | Prompt Kit §5 Prompt 9, R4 |
| 20 | In-Browser Camera Scanner | Mobile camera video stream scanning QR using html5-qrcode | M4 | Prompt Kit §5 Prompt 9, R5 |
| 21 | "Directions From Here" | Auto-fills scanned location as navigation start point | M4 | Prompt Kit §5 Prompt 9, R5 |
| 22 | JWT Authentication | Secure admin login with bcrypt password comparison & JWT | M3 | Prompt Kit §5 Prompt 10, R4 |
| 23 | Dashboard Statistics | Aggregates counts of locations, categories, nodes, edges | M3 | Prompt Kit §5 Prompt 10, R4 |
| 24 | Visual Map Graph Editor | Visual editor on map to click-add nodes, drag, link edges | M5 | Prompt Kit §5 Prompt 10, R5 |
| 25 | Location Management CRUD | Full CRUD operations for campus POIs with validation | M3 | Prompt Kit §5 Prompt 10, R4 |
| 26 | Photo File Upload | Uploads building photos with size and MIME enforcement | M3 | Prompt Kit §5 Prompt 10, R4 |
| 27 | Data Health Audit | Diagnostic checks detecting isolated nodes and unlinked POIs | M3 | Prompt Kit §5 Prompt 10, R4 |
| 28 | CSV/JSON Import & Export | Exports and imports campus graph data with validation | M3 | Prompt Kit §5 Prompt 10, §5 Prompt 12 |
| 29 | Draggable Bottom Sheet | Responsive drawer with 3 snap points (peek, half, full) | M4 | Prompt Kit §3 Prompt 0B, §5 Prompt 4 |
| 30 | Light & Dark Mode Toggle | Toggles Tailwind dark class and Leaflet map tile theme | M4 | Prompt Kit §3 Prompt 0B, §5 Prompt 4 |
| 31 | System Health Check | Liveness probe returning backend operational status | M1 | ORIGINAL_REQUEST.md AC |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Architecture Scaffolding & Database Engine | Backend venv, FastAPI setup, SQLite schema, 14 POIs / 12 Categories / 26 Nodes / 38 Edges seed loader, `/api/health`, root doc specs (PRD, DESIGN, RULES, PROGRESS) | none | PLANNED |
| M2 | Graph Navigation & Routing Engine | Dijkstra & A* pathfinding, Haversine heuristic, bearing, turn maneuvers, coordinate snapping, accessible routing filter, `POST /api/routes` | M1 | PLANNED |
| M3 | REST APIs, Authentication, & QR Services | Public POI/Search/Category endpoints, JWT Admin Auth, Admin CRUD, QR Code PNG & PDF poster generator, Data Health Checker | M1, M2 | PLANNED |
| M4 | Interactive Map-First Frontend Experience | React + Vite + Tailwind setup, full-screen Leaflet map, custom SVG category markers, debounced search, category chips, bottom sheet, location details, GPS tracker, QR scanner modal | M1, M3 | PLANNED |
| M5 | Directions UI & Admin Visual Map Graph Editor | Directions drawer, animated route polyline, step-by-step turn cards, zoom-to-maneuver, interactive visual graph editor for nodes/edges on Leaflet canvas | M2, M3, M4 | PLANNED |
| M6 | Full E2E Verification & Adversarial Hardening | Phase 1: 100% pass across all E2E test tiers (Tiers 1-4). Phase 2: Adversarial coverage hardening (Tier 5 challenger loop). | M1-M5, TEST_READY | PLANNED |

## Interface Contracts

### Backend ↔ Frontend API Contract
- `GET /api/health`: `{"status": "ok"}`
- `GET /api/categories`: Array of `Category` objects with `id`, `name`, `slug`, `color`, `icon`, `location_count`.
- `GET /api/locations`: Array of `Location` objects with nested `category`, `entrance_node_id`, coordinates, hours, facilities.
- `GET /api/locations/search?q={query}`: Array of matched `Location` objects.
- `GET /api/locations/{id}`: Detailed `Location` object.
- `POST /api/routes`:
  - Request: `{"start_node_id": int | null, "destination_node_id": int, "start_lat": float | null, "start_lon": float | null, "accessible_only": bool, "algorithm": "dijkstra" | "astar"}`
  - Response: `{"distance_meters": float, "duration_minutes": int, "duration_seconds": int, "algorithm_used": str, "accessible_only": bool, "path_node_ids": [int], "coordinates": [[lat, lon]], "steps": [{"instruction": str, "distance_meters": float, "maneuver": str, "bearing": float, "lat": float, "lon": float, "location_name": str | null}]}`
  - Errors: 400 (Off-campus snapping > 300m), 404 (Disconnected / no route), 422 (Invalid input).
- `GET /api/qr/{identifier}`: Redirects or returns Location details.
- `GET /api/qr/{location_id}/image`: PNG binary stream.
- `GET /api/qr/{location_id}/poster`: PDF binary stream.
- `POST /api/admin/login`: `{"username": str, "password": str}` -> `{"access_token": str, "token_type": "bearer"}`.
- `GET /api/admin/stats`: Aggregate counts and health warnings.
- `POST /api/admin/nodes`, `POST /api/admin/edges`, `POST /api/admin/locations`: CRUD endpoints protected by Bearer JWT.

## Code Layout
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
└── TEST_INFRA.md
```
