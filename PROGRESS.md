# Project Progress — Campus Navigator

## Milestone Status Overview

| # | Milestone Name | Scope | Status | Completed Date |
|---|---|---|---|---|
| **M1** | Architecture Scaffolding & Database Engine | Git, root docs, FastAPI, SQLite schema, 14 POIs / 12 Categories / 26 Nodes seed, `/api/health` | IN PROGRESS | — |
| **M2** | Graph Navigation & Routing Engine | Dijkstra & A* pathfinding, Haversine, bearing, turn maneuvers, snapping, accessible filter, `POST /api/routes` | PLANNED | — |
| **M3** | REST APIs, Authentication, & QR Services | Public POI/Search/Category APIs, JWT Admin Auth, Admin CRUD, QR Code PNG & PDF poster, Health Checker | PLANNED | — |
| **M4** | Interactive Map-First Frontend Experience | React + Vite + Tailwind, Leaflet map, custom SVG category markers, search, category chips, bottom sheet, GPS | PLANNED | — |
| **M5** | Directions UI & Admin Visual Map Graph Editor | Directions drawer, animated route polyline, turn cards, zoom maneuver, interactive visual graph editor | PLANNED | — |
| **M6** | Full E2E Verification & Adversarial Hardening | Tier 1-4 full test suites, Tier 5 adversarial coverage hardening, performance audits | PLANNED | — |

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
API Documentation will be accessible at: `http://localhost:8000/docs`  
Health check probe will be accessible at: `http://localhost:8000/api/health`  

**Terminal 2 — Frontend (M4+):**
```powershell
cd e:\Campus-Nav\frontend
npm run dev
```
Web application will be accessible at: `http://localhost:5173`

---

## Running Tests
To execute backend automated tests:
```powershell
cd e:\Campus-Nav\backend
.\.venv\Scripts\pytest -v
```
