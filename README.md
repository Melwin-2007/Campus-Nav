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

## ☁️ Deploying to Render

This project is pre-configured for automated one-click deployment on [Render](https://render.com).

### Quick Deploy via Render Blueprint
1. Push this repository to **GitHub** or **GitLab**.
2. Log in to [dashboard.render.com](https://dashboard.render.com) and click **New +** > **Blueprint**.
3. Select your repository. Render automatically reads [`render.yaml`](file:///e:/Campus-Nav/render.yaml) and executes [`build.sh`](file:///e:/Campus-Nav/build.sh), building both the React SPA and FastAPI backend into a single Web Service.
4. Click **Apply**. Your app will be live at `https://campus-navigator.onrender.com`.

For custom domains, persistent disks, and decoupled frontend/backend deployment instructions, refer to the [**Render Deployment Guide**](file:///e:/Campus-Nav/docs/RENDER_DEPLOYMENT.md).

---

## 📚 Documentation Suite

Comprehensive project documentation is available in the [`docs/`](file:///e:/Campus-Nav/docs) directory:
- [**Render Deployment Guide**](file:///e:/Campus-Nav/docs/RENDER_DEPLOYMENT.md): Step-by-step instructions for deploying to Render (Blueprint, Unified Service, or Decoupled).
- [**User Guide**](file:///e:/Campus-Nav/docs/USER_GUIDE.md): Plain-English guide for finding places, directions, accessible routing, GPS tracking, and QR codes.
- [**Administrator Guide**](file:///e:/Campus-Nav/docs/ADMIN_GUIDE.md): How to use the Visual Map Graph Editor, manage locations, upload photos, and print QR posters.
- [**REST API Documentation**](file:///e:/Campus-Nav/docs/API_DOCUMENTATION.md): Complete catalog of public and admin API endpoints with request/response schemas.
- [**System Architecture & Diagrams**](file:///e:/Campus-Nav/docs/ARCHITECTURE.md): Architecture diagrams, navigation flow sequence charts, and mathematical formulas.
- [**Database Schema Reference**](file:///e:/Campus-Nav/docs/DATABASE_SCHEMA.md): Entity-relationship diagrams, table models, and relational constraints.
- [**Production Deployment Guide**](file:///e:/Campus-Nav/docs/DEPLOYMENT_GUIDE.md): Cloud hosting steps (Vercel, Render, Neon/Supabase), environment variables, and laptop demo guide.
- [**Project Report Outline**](file:///e:/Campus-Nav/docs/PROJECT_REPORT.md): Academic capstone report format suitable for university submission.
- [**Full Verification Test Report**](file:///e:/Campus-Nav/TEST_REPORT.md): Audit table verifying all acceptance criteria against test evidence.

---

## 🧪 Automated Testing & Build Verification

### Backend Automated Test Suite (299 Tests)
```powershell
cd backend
.\.venv\Scripts\pytest -q
```

### Frontend Automated Unit Tests (92 Tests)
```powershell
cd frontend
npx tsx --test src/utils/__tests__/*.test.ts
```

### Frontend Production Build
```powershell
cd frontend
npm run build
```

---

## 📄 License
Educational, campus showcase, and portfolio demonstration platform.
