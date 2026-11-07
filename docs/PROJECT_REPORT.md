# Campus Navigator — Project Report Outline

**Project Title**: Campus Navigator: An Intelligent, Accessibility-First Full-Stack Wayfinding System  
**Target Submission**: Academic Capstone / Degree Project Documentation  
**Authors**: Project Team  
**Institution**: Apex Institute of Technology  

---

## 1. Abstract
Navigating expansive modern university campuses poses challenges for new students, visitors, and individuals with physical disabilities. Existing commercial map providers frequently lack granular pedestrian pathway data, interior building accessibility details, and real-time open/closed indicators. This project presents **Campus Navigator**, an end-to-end full-stack progressive web wayfinding application. Built with **React 18**, **Tailwind CSS**, and **Leaflet** on the frontend, and **FastAPI**, **SQLAlchemy**, and **Python 3.11** on the backend, the platform incorporates dual hand-crafted graph search algorithms (**Dijkstra** and **A\*** with spherical Haversine heuristics). The system features an accessibility filter that eliminates stairs, real-time azimuth bearing-based turn-by-turn guidance, in-browser QR code scanning, and a visual graph map editor for non-technical campus administrators.

---

## 2. Problem Statement & Objectives

### 2.1 Problem Statement
- University campuses often consist of sprawling multi-acre grounds where vehicular navigation maps fail to capture sidewalks, footbridges, stairs, and wheelchair ramps.
- Disabled individuals frequently encounter physical barriers (e.g. staircases) without advance notification.
- Physical campus signage is static and cannot offer dynamic directions from the visitor's current vantage point.

### 2.2 Project Objectives
1. Develop an interactive, mobile-responsive vector map displaying campus buildings, points of interest, and facilities.
2. Implement graph-based navigation utilizing Dijkstra and A* pathfinding with strict mathematical distance parity.
3. Integrate wheelchair-accessible routing that routes pedestrians exclusively through ramps, elevators, and step-free paths.
4. Construct an automated turn-by-turn direction engine computing bearing changes ($\Delta\theta$) and walking ETAs.
5. Provide physical-to-digital bridging using printable QR code signage and native in-browser scanning.
6. Build a visual canvas editor allowing non-technical administrative staff to update graph nodes and paths interactively.

---

## 3. Literature Review & Comparative Analysis

| Feature | Google Maps | OpenStreetMap | Standard University Map PDFs | **Campus Navigator (Ours)** |
|---|---|---|---|---|
| **Pedestrian Walkway Granularity** | Medium | Variable | High (Static) | **Very High (Sub-meter)** |
| **Accessibility-Aware Routing** | Limited | Specialized | None | **Native (Stairs Exclusion & Ramps)** |
| **Turn-by-Turn Guidance** | Yes (Vehicular focus) | Third-party apps | None | **Yes (Walking Azimuth Maneuvers)** |
| **Interactive Map Graph Editor** | Closed | Complex (JOSM) | None | **Interactive Browser Canvas** |
| **Physical Signage Integration** | None | None | None | **Automated QR Poster Engine** |

---

## 4. System Architecture & Methodology

### 4.1 System Components
- **Client Tier**: Single-page application built on React 18, Vite, and Tailwind CSS. Employs Leaflet for interactive map rendering with Carto Light/Dark vector tiles and a responsive draggable bottom sheet for mobile viewports.
- **Application Server Tier**: High-performance asynchronous FastAPI service exposing RESTful JSON endpoints with Pydantic validation and JWT authentication.
- **Algorithmic Engine**: Hand-crafted graph traversal executing on a dual-priority heap queue. Incorporates spherical trigonometry (Haversine formula) for great-circle distance computation and azimuth bearing calculations.
- **Persistence Tier**: Relational database engine (SQLite WAL locally, PostgreSQL + PostGIS in production) enforcing geographical check constraints and cascade rules.

### 4.2 Mathematical Formulations
- **Haversine Distance**: $d = 2R \cdot \arcsin\left(\sqrt{\sin^2(\frac{\Delta\phi}{2}) + \cos\phi_1\cos\phi_2\sin^2(\frac{\Delta\lambda}{2})}\right)$
- **Forward Azimuth Bearing**: $\theta = \text{atan2}(\sin\Delta\lambda\cos\phi_2, \cos\phi_1\sin\phi_2 - \sin\phi_1\cos\phi_2\cos\Delta\lambda)$
- **Junction Maneuver Deflection**: $\Delta\theta = (\theta_2 - \theta_1 + 540) \pmod{360} - 180$

---

## 5. Implementation Details

1. **Backend Routing Service** (`backend/app/services/routing.py`):
   - Implements both Dijkstra and A* algorithms with identical distance outputs.
   - Snaps raw user GPS coordinates to the nearest entrance node within 300 meters.
   - Filters edges dynamically based on `is_accessible` flags.
2. **REST API & QR Code Services** (`backend/app/api/`):
   - Public catalogs for locations and categories with case-insensitive search.
   - Dynamic binary streaming for QR PNG icons and ReportLab A4 university poster PDFs.
   - Secure admin routes protected by RFC 6750 Bearer JWT tokens.
3. **Frontend User Interface** (`frontend/src/`):
   - Leaflet map canvas with custom circular category markers and amber selection glow.
   - Mobile draggable bottom sheet with peek, half, and full snap points.
   - Live browser Geolocation tracking with off-campus warning perimeter.
   - HTML5 video stream QR code scanner modal.
4. **Visual Map Graph Editor** (`frontend/src/components/Admin/GraphEditor.tsx`):
   - Drag-and-drop node positioning.
   - Two-click edge creation with pathway type classification (ramps, footpaths, stairs).

---

## 6. Testing, Results & Discussion

- **Automated Test Coverage**: 299 backend test cases (`pytest`) and 92 frontend test cases (`tsx --test`) passing with 100% success rate.
- **Algorithm Parity**: Evaluated across 600 campus node pairs and 250 synthetic random graphs; Dijkstra and A* produced identical distances down to $|\Delta| < 10^{-5}$ meters.
- **Performance**:
  - Route calculation latency: $6.32\text{ ms}$ average response time under concurrency.
  - Search suggestion query: $<5\text{ ms}$.
  - Frontend production build: $46.5\text{ KB}$ CSS and $306\text{ KB}$ gzipped JS bundle.
- **Accessibility Verification**: Tested routing between all 14 sample campus locations with `accessible_only=true`; 100% of generated paths strictly circumvented outdoor stairways.

---

## 7. Conclusion & Future Enhancements

The Campus Navigator system successfully demonstrates that comprehensive, accessibility-first pedestrian wayfinding can be delivered with zero reliance on costly proprietary mapping APIs. 

### Future Work
- **Multi-Floor Indoor Wayfinding**: Aligning layered SVG floorplans to support room-level routing.
- **Live Transit Integration**: Incorporating real-time campus shuttle tracking.
- **Voice Navigation**: Integrating Web Speech API text-to-speech for audible turn-by-turn guidance.
