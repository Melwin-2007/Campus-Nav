# Project Progress — Campus Navigator

## Milestone Status Overview

| # | Milestone Name | Scope | Status | Completed Date |
|---|---|---|---|---|
| **M1** | Architecture Scaffolding & Database Engine | Git, root docs, FastAPI, SQLite schema, 14 POIs / 12 Categories / 26 Nodes seed, `/api/health` | **COMPLETED (PASS)** | 2026-11-04 |
| **M2** | Graph Navigation & Routing Engine | Dijkstra & A* pathfinding, Haversine, bearing, turn maneuvers, snapping (<300m), accessible filter, `POST /api/routes` | **COMPLETED (PASS)** | 2026-11-04 |
| **M3** | REST APIs, Authentication, & QR Services | Public POI/Search/Category APIs, JWT Admin Auth, Admin CRUD, QR Code PNG & PDF poster, Health Checker | **COMPLETED (PASS)** | 2026-11-06 |
| **M4** | Interactive Map-First Frontend Experience | React + Vite + Tailwind, Leaflet map, custom SVG category markers, search, category chips, bottom sheet, GPS | **COMPLETED (PASS)** | 2026-11-06 |
| **M5** | Directions UI & Admin Visual Map Graph Editor | Directions drawer, animated route polyline, turn cards, zoom maneuver, interactive visual graph editor | **COMPLETED (PASS)** | 2026-11-06 |
| **M6** | Full E2E Verification & Adversarial Hardening | Tier 1-4 full test suites (302 cases), frontend unit tests (92 cases), 0 regressions | **COMPLETED (PASS)** | 2026-11-06 |

---

## Verification Test Metrics

### Backend (`pytest backend/tests`)
- **Total Test Cases**: 302 passed, 0 failed.
- **Tiers Covered**:
  - Tier 1 (Core Features): Categories, Locations, QR endpoints, Admin authentication, Seed integrity.
  - Tier 2 (Boundary & Snapping): Boundary conditions, GPS perimeter snapping (<300m limit), inaccessible edge rejections.
  - Tier 3 (Combinations & Parity): Dijkstra vs A* strict distance parity ($|\Delta| < 10^{-5}\text{ m}$) across all connected node pairs.
  - Tier 4 (Complex End-to-End Scenarios): Accessibility routing (avoiding stairs, using ramps), multi-point turn maneuver guidance.
  - Adversarial & Topology Health: Live WebSocket/HTTP socket stress, disconnected node isolation (Node 26 Remote Observatory).

### Frontend (`npm run build` & `npx tsx --test`)
- **Build Status**: Production bundle compiled cleanly (`tsc && vite build`), 0 TypeScript errors.
- **Unit & Empirical Tests**: 92 passed, 0 failed across spatial calculations, operating hours evaluation, category/facility icon mappings, and turn maneuver visual configs.

---

## How to Run the Project

### Prerequisites
- Python 3.11+
- Node.js 18+ (verified with v24.14.0)

### Daily Run Commands
**Terminal 1 — Backend:**
```powershell
cd e:\Campus-Nav\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Documentation: `http://localhost:8000/docs`
- Health Probe: `http://localhost:8000/api/health`

**Terminal 2 — Frontend:**
```powershell
cd e:\Campus-Nav\frontend
npm run dev
```
- Web Application: `http://localhost:5173`

---

## Test Execution Commands

To execute the backend automated test suite:
```powershell
cd e:\Campus-Nav\backend
.\.venv\Scripts\pytest -q
```

To execute the frontend unit test suite:
```powershell
cd e:\Campus-Nav
npx tsx --test frontend/src/utils/__tests__/*.test.ts
```
