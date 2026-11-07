# Campus Navigator — System Architecture & Design

This document details the architectural design, component interactions, and algorithmic principles of the Campus Navigator wayfinding platform.

---

## 1. High-Level System Architecture

Campus Navigator is architected as a decoupled, modern full-stack web application with strict separation between user presentation, business logic, routing computation, and persistent storage:

```mermaid
graph TD
    subgraph Client["Frontend Client (React 18 + Vite + Tailwind CSS)"]
        UI["UI Layer: SearchBar, CategoryChips, BottomSheet, DirectionsPanel"]
        MapCanvas["Leaflet Map Canvas: Carto Light/Dark, Custom Markers, RoutePolyline"]
        Scanner["Camera Stream: html5-qrcode Native QR Scanner"]
        AdminStudio["Admin Studio: Visual Map Graph Editor (Add, Link, Move Nodes)"]
        NavContext["Navigation & Theme Context State"]
    end

    subgraph Server["Backend Server (FastAPI + Python 3.11)"]
        API["REST API Router: Public Catalogs, Search, Health"]
        AuthMid["JWT Authentication & Middleware (RFC 6750)"]
        AdminRouter["Admin CRUD Router (Locations, Nodes, Edges)"]
        QRGen["QR Code PNG & PDF Poster Engine"]
        
        subgraph Engine["Navigation Engine (services/routing.py)"]
            GraphCache["In-Memory Graph Topology Cache"]
            Dijkstra["Hand-Crafted Dijkstra Algorithm (Heap Queue)"]
            AStar["A* Pathfinding Algorithm (Haversine Heuristic)"]
            Snapper["Spatial Coordinate Snapper (300m Threshold)"]
            Maneuver["Azimuth Bearing & Turn Maneuver Classifier"]
        end
    end

    subgraph Data["Persistence Layer"]
        DB[("SQLite / PostgreSQL Database")]
        ORM["SQLAlchemy 2.0 ORM Models & Session Factory"]
        StaticUploads["Static Photo Uploads (/static/uploads)"]
    end

    UI --> NavContext
    MapCanvas --> NavContext
    NavContext --> API
    Scanner --> API
    AdminStudio --> AuthMid
    AuthMid --> AdminRouter
    AdminRouter --> DB
    API --> Engine
    Engine --> GraphCache
    GraphCache --> ORM
    ORM --> DB
```

---

## 2. Navigation & Routing Sequence Flow

The following sequence illustrates the turn-by-turn routing process from user query to animated map visualization:

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Student
    participant Frontend as Frontend UI (React + Leaflet)
    participant API as FastAPI Router (/api/routes)
    participant Snapper as Spatial Snapper
    participant Routing as Navigation Engine (Dijkstra / A*)
    participant Maneuvers as Turn Maneuver Engine
    participant DB as Database (campus_navigator.db)

    User->>Frontend: Selects Origin & Destination (or toggles "Accessible Route")
    Frontend->>API: POST /api/routes {start, dest, accessible_only: true}
    
    alt Raw GPS Coordinates Supplied
        API->>Snapper: Check Haversine distance to nearest active node
        alt Distance > 300m
            Snapper-->>Frontend: HTTP 400 Bad Request ("Outside campus perimeter")
        else Distance <= 300m
            Snapper-->>Routing: Snapped Entrance Node ID
        end
    end

    API->>Routing: Compute Shortest Path on Graph
    Routing->>DB: Fetch active nodes & edges (if cache dirty)
    
    opt Accessible Only == True
        Routing->>Routing: Filter out all edges where is_accessible == false (stairs)
    end

    Routing->>Routing: Execute Dijkstra / A* with priority queue
    
    alt No Path Exists
        Routing-->>Frontend: HTTP 404 Not Found ("No step-free route available")
    else Path Found
        Routing->>Maneuvers: Pass ordered node coordinates
        Maneuvers->>Maneuvers: Calculate Azimuth Bearings: θ = atan2(sin Δλ cos φ2, ...)
        Maneuvers->>Maneuvers: Classify maneuvers (depart, straight, turn_left, turn_right, arrive)
        Maneuvers->>Maneuvers: Merge consecutive collinear straight segments
        Maneuvers-->>API: Total distance, walking minutes, coordinates, and step cards
        API-->>Frontend: HTTP 200 OK Route Response
        Frontend->>Frontend: Animate teal polyline drawing on Leaflet canvas
        Frontend->>User: Display route summary and clickable step-by-step cards
    end
```

---

## 3. Algorithmic Principles & Formulas

### 3.1 Haversine Great-Circle Distance
To measure accurate path lengths and distances between geographic coordinates $(\phi_1, \lambda_1)$ and $(\phi_2, \lambda_2)$ on the spherical Earth:

$$\Delta\phi = \phi_2 - \phi_1, \quad \Delta\lambda = \lambda_2 - \lambda_1$$

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$

$$d = R \cdot c \quad (\text{where } R = 6{,}371{,}000\text{ meters})$$

### 3.2 Turn-by-Turn Bearing & Maneuvers
Forward azimuth bearing $\theta$ from point 1 to point 2:

$$y = \sin(\Delta\lambda) \cdot \cos(\phi_2)$$

$$x = \cos(\phi_1)\sin(\phi_2) - \sin(\phi_1)\cos(\phi_2)\cos(\Delta\lambda)$$

$$\theta = \left(\text{atan2}(y, x) \cdot \frac{180}{\pi} + 360\right) \pmod{360}$$

The change in bearing at junction point $B$ between incoming vector $A \to B$ ($\theta_1$) and outgoing vector $B \to C$ ($\theta_2$):

$$\Delta\theta = (\theta_2 - \theta_1 + 540) \pmod{360} - 180$$

Maneuvers are classified as:
- **Straight**: $|\Delta\theta| \le 20^\circ$
- **Slight Right**: $20^\circ < \Delta\theta \le 45^\circ$
- **Turn Right**: $45^\circ < \Delta\theta \le 135^\circ$
- **Sharp Right**: $135^\circ < \Delta\theta \le 175^\circ$
- **U-Turn**: $|\Delta\theta| > 175^\circ$
- **Slight Left**: $-45^\circ \le \Delta\theta < -20^\circ$
- **Turn Left**: $-135^\circ \le \Delta\theta < -45^\circ$
- **Sharp Left**: $-175^\circ \le \Delta\theta < -135^\circ$

