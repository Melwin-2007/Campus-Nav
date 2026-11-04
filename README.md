# 🧭 Campus Navigator

> A modern, responsive, map-first university wayfinding progressive web application designed for campus exploration, accessible pathfinding, and interactive point-of-interest discovery.

---

## 🌟 Key Features
- **Map-First Experience:** Full-screen Leaflet interactive map with custom SVG markers, light/dark mode tiles, and fluid Framer Motion animations.
- **Dual Routing Engine:** Shortest path computation via Dijkstra's algorithm and A* with a Haversine great-circle distance heuristic, guaranteed to yield identical distance metrics.
- **Wheelchair Accessibility:** Real-time routing filters that bypass stairs, steep terrain, and obstacles in favor of wheelchair ramps and elevators.
- **Smart GPS Snapping:** Dynamic device geolocation snapping to the nearest campus path node within 300 meters with off-campus fallback guidance.
- **Turn-by-Turn Maneuvers:** Azimuth bearing calculation, straight segment merging, and pedestrian turn instructions.
- **QR Signage Ecosystem:** Generates cryptographic location tokens, downloadable PNG QR codes, and printable PDF posters for campus signage.
- **Interactive Visual Graph Editor:** Built-in administrative dashboard allowing administrators to click-add nodes, drag coordinates, and draw walkable edges directly on the map canvas.

---

## 🏗️ Architecture & Tech Stack

```
Campus-Nav/
├── backend/          # Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic v2, PyJWT
│   ├── app/
│   │   ├── api/      # REST API endpoints (health, locations, routes, admin, qr)
│   │   ├── core/     # Configuration, settings, and JWT security
│   │   ├── db/       # SQLAlchemy engine, session maker, base model
│   │   ├── models/   # Declarative database models (PostgreSQL & SQLite)
│   │   ├── schemas/  # Pydantic validation schemas
│   │   ├── services/ # Dijkstra, A*, Haversine, bearing, and snapping logic
│   │   └── seed/     # Campus seed data and loader
│   └── tests/        # Pytest test suites
└── frontend/         # React 18, Vite, TypeScript, Tailwind CSS, Leaflet, Framer Motion
```

---

## 🚀 Quick Start Guide

### 1. Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Test health probe:
```powershell
curl http://localhost:8000/api/health
```

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Automated Testing
Run the automated test suite:
```powershell
cd backend
.\.venv\Scripts\pytest -v
```

---

## 📄 License
Educational and portfolio showcase application.
