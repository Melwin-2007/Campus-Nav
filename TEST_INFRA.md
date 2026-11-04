# Campus Navigator — Automated Test Infrastructure & Test Suite Specification (TEST_INFRA.md)

**Version:** 1.0.0  
**Scope:** Tiers 1–4 Automated Test Suite & Testing Framework  
**Author:** E2E Test Writer  
**Target Environment:** Python 3.11+, Pytest, FastAPI TestClient, HTTPX  

---

## 1. Executive Summary & Testing Philosophy

The Campus Navigator test infrastructure is engineered according to an **opaque-box, requirement-driven methodology**. Test suites validate observable system behavior strictly against public interface contracts, REST API specifications, database schemas, and mathematical routing invariants defined in `PROJECT.md`, `PRD.md`, and `ORIGINAL_REQUEST.md`.

### Core Architectural Principles
1. **Opaque-Box Separation**: Tests interact exclusively through HTTP interfaces (`GET`, `POST`, `PUT`, `DELETE`), HTTP status codes, and JSON response payloads. Internal database tables, private helper methods, and implementation details are treated as a black box.
2. **Dual-Mode Execution (In-Process & Live Server)**:
   - *In-Process Mode*: Tests run directly against FastAPI application instance using `fastapi.testclient.TestClient` / `starlette.testclient.TestClient` for instantaneous in-memory execution.
   - *Live Server Mode*: Tests execute against any running HTTP endpoint (e.g., `http://127.0.0.1:8000`) using `httpx.Client`, allowing seamless container, staging, and production verification.
3. **Progressive Testability**: The suite supports progressive milestone execution:
   - Milestone 1: System Health & Categories/Locations seeding verification.
   - Milestone 2: Routing engine, Dijkstra/A* parity, coordinate snapping, and accessibility filtering.
   - Milestone 3: Public REST APIs, JWT Admin authentication, CRUD management, and QR code streams.
   - Milestones 4–6: Cross-feature integrations and end-to-end user workflows.
4. **Deterministic & Self-Contained**: Tests maintain strict idempotency. Dynamic admin additions are contained within teardown blocks to restore baseline campus graph state without polluting the seed database.
5. **Authoritative Expected Output Derivation**:
   - Shortest path distances derived from verified Haversine calculations over graph edge geometry.
   - Accessibility routing guarantees that non-accessible edges (`is_accessible=False` or `edge_type='stairs'`) have zero occurrence in wheelchair routes.
   - Turn-by-turn bearings and maneuvers derived from spherical azimuth formulas ($\Delta\theta$).

---

## 2. Test Hierarchy (Tiers 1–4)

The test infrastructure is partitioned into four distinct tiers:

```
+-----------------------------------------------------------------------------------+
|                        TIER 4: REAL-WORLD USER SCENARIOS                          |
|  Full user journey workflows (Freshman arrival, Wheelchair navigation, Emergency) |
+-----------------------------------------------------------------------------------+
                                         ^
                                         |
+-----------------------------------------------------------------------------------+
|                    TIER 3: CROSS-FEATURE COMBINATIONS                             |
|  Pairwise subsystem interactions (QR -> Route, Filter -> Route, Admin -> Engine)  |
+-----------------------------------------------------------------------------------+
                                         ^
                                         |
+-----------------------------------------------------------------------------------+
|                     TIER 2: BOUNDARY & CORNER CASES                               |
|  Pathological inputs, off-campus GPS, unicode, same start/dest, self-loops, tokens|
+-----------------------------------------------------------------------------------+
                                         ^
                                         |
+-----------------------------------------------------------------------------------+
|                        TIER 1: FEATURE COVERAGE                                   |
|  >=5 test cases per feature across all 9 core functional backend subsystems       |
+-----------------------------------------------------------------------------------+
```

---

## 3. Tier 1: Feature Coverage Specifications (>=5 Tests per Feature)

Tier 1 covers all 9 foundational features with at least 5 distinct test cases each (total 45+ test cases):

### 3.1 Feature 1: Health & Liveness Probe (`GET /api/health`)
- **T1-HLTH-01**: Liveness status probe returns HTTP 200 with `status: "ok"`.
- **T1-HLTH-02**: Response payload conforms to JSON dictionary containing application metadata.
- **T1-HLTH-03**: Response headers confirm `content-type: application/json`.
- **T1-HLTH-04**: Fast response latency (< 50ms) under repeated invocations.
- **T1-HLTH-05**: Health check operates without requiring authentication or session cookies.

### 3.2 Feature 2: Category Catalog (`GET /api/categories`)
- **T1-CAT-01**: Returns HTTP 200 and a non-empty array of active campus categories.
- **T1-CAT-02**: Confirms all 12 canonical categories exist: Academic Buildings, Departments, Laboratories, Administration, Libraries, Food and Cafeteria, Sports, Medical, Parking, Washrooms, Entrances and Exits, Other.
- **T1-CAT-03**: Every category schema validates required fields: `id` (int), `name` (str), `slug` (str), `icon` (str), `color` (str), `location_count` (int >= 0).
- **T1-CAT-04**: Design system color tokens are verified (e.g. Libraries = `#10B981`, Medical = `#F43F5E`, Food = `#F97316`).
- **T1-CAT-05**: Lucide icon tokens are non-empty valid icon identifiers.

### 3.3 Feature 3: Campus Locations & POIs (`GET /api/locations`, `GET /api/locations/{id}`)
- **T1-LOC-01**: Listing returns HTTP 200 with at least 12 seeded campus locations.
- **T1-LOC-02**: Every location has valid geographic coordinates within campus bounding box (`17.6560 <= lat <= 17.6640`, `75.9020 <= lon <= 75.9110`).
- **T1-LOC-03**: Category filtering via `?category_id={id}` returns only matching locations.
- **T1-LOC-04**: Single location lookup by ID (`GET /api/locations/1`) returns complete record with `entrance_node_id`, `opening_hours`, and `facilities` array.
- **T1-LOC-05**: Non-existent location ID (`GET /api/locations/99999`) returns HTTP 404 with friendly JSON error message.

### 3.4 Feature 4: Search & Autocomplete (`GET /api/locations/search?q={query}`)
- **T1-SCH-01**: Exact name search for "Central Campus Library" returns matching location.
- **T1-SCH-02**: Partial substring search (e.g. "Robo") matches "Advanced Robotics Lab".
- **T1-SCH-03**: Case-insensitive search ("science", "SCIENCE", "ScIeNcE") consistently matches "Sir CV Raman Science Block".
- **T1-SCH-04**: Department and facility matching (e.g. "Physical Education" matches Sports Arena).
- **T1-SCH-05**: Non-matching nonsense query (e.g. "xyznonexistent999") returns HTTP 200 with empty array `[]`.

### 3.5 Feature 5: Routing Engine & Algorithm Parity (`POST /api/routes`)
- **T1-RTE-01**: Route calculation between connected nodes (Main Gate -> Admin Complex) returns HTTP 200 and positive distance.
- **T1-RTE-02**: Response schema provides required fields: `total_distance_meters`, `estimated_time_minutes`, `estimated_time_seconds`, `steps`, `coordinates`, `path_nodes`.
- **T1-RTE-03**: Route execution using explicit Dijkstra algorithm (`algorithm="dijkstra"`).
- **T1-RTE-04**: Route execution using explicit A* algorithm (`algorithm="astar"`).
- **T1-RTE-05**: Distance parity guarantee: Dijkstra total distance equals A* total distance within 0.001m tolerance.

### 3.6 Feature 6: Coordinate Snapping Logic
- **T1-SNP-01**: Origin raw coordinates (`start_lat`, `start_lon` or `start_coords`) snap to closest active graph node within 300m.
- **T1-SNP-02**: Destination raw coordinates snap to closest active graph node within 300m.
- **T1-SNP-03**: Total walking distance includes haversine snapping distance from raw coordinates to entrance node.
- **T1-SNP-04**: Snapping ignores inactive nodes (`is_active=False`).
- **T1-SNP-05**: Coordinates within acceptable campus boundary (e.g., 200m away) successfully snap and route.

### 3.7 Feature 7: Accessibility Filtering (`accessible_only=true`)
- **T1-ACC-01**: Standard routing (`accessible_only=false`) chooses shorter stairs shortcut between Library and Plaza.
- **T1-ACC-02**: Accessible routing (`accessible_only=true`) strictly bypasses stairs and selects ramp detour (Nodes 9->12->10).
- **T1-ACC-03**: Accessible route distance is strictly greater than stairs route distance (~78m vs ~42m).
- **T1-ACC-04**: All traversed edges in accessible route have `is_accessible=true` and `edge_type != 'stairs'`.
- **T1-ACC-05**: Estimated walking time calculates at nominal speed (1.3 m/s) when standard, and accessible speed (1.0 m/s) when accessible.

### 3.8 Feature 8: Admin Authentication & Security (`POST /api/admin/login`)
- **T1-SEC-01**: Valid credentials (`admin` / `admin123`) return HTTP 200 with JWT `access_token` and `token_type: "bearer"`.
- **T1-SEC-02**: Invalid password returns HTTP 401 Unauthorized.
- **T1-SEC-03**: Non-existent username returns HTTP 401 Unauthorized.
- **T1-SEC-04**: Accessing protected `/api/admin/dashboard/stats` without Authorization header returns HTTP 401.
- **T1-SEC-05**: Accessing protected endpoint with valid Bearer token returns HTTP 200 with dashboard statistics.

### 3.9 Feature 9: QR Code Services (`GET /api/qr/{identifier}`, `/image`, `/poster`)
- **T1-QRC-01**: Resolving seeded QR identifier returns HTTP 200 with location details and entrance node ID.
- **T1-QRC-02**: QR image endpoint (`GET /api/qr/{identifier}/image`) returns HTTP 200 with `content-type: image/png`.
- **T1-QRC-03**: QR image response payload starts with standard PNG file magic bytes (`\x89PNG\r\n\x1a\n`).
- **T1-QRC-04**: QR poster endpoint (`GET /api/qr/{identifier}/poster`) returns HTTP 200 with `content-type: application/pdf`.
- **T1-QRC-05**: Invalid or unrecognized QR identifier returns HTTP 404 with friendly JSON error message.

---

## 4. Tier 2: Boundary & Corner Cases Specifications (>=5 Tests per Boundary)

### 4.1 Boundary 1: Disconnected Nodes & Subgraphs
- **T2-BND-DISC-01**: Routing to intentionally disconnected Node 26 (Location 14: Remote Observatory) returns HTTP 404.
- **T2-BND-DISC-02**: Routing from intentionally disconnected Node 26 to any campus node returns HTTP 404.
- **T2-BND-DISC-03**: Error response message clearly states no walkable path exists between selected nodes.
- **T2-BND-DISC-04**: Pathfinding terminates promptly without infinite loop or server hang when destination is unreachable.
- **T2-BND-DISC-05**: Accessible routing to disconnected node returns HTTP 404 without crashing.

### 4.2 Boundary 2: Off-Campus GPS (>300m Snapping Threshold)
- **T2-BND-GPS-01**: Start GPS coordinate far off campus (lat 17.6800, lon 75.9200, >1km) returns HTTP 400 Bad Request.
- **T2-BND-GPS-02**: Destination GPS coordinate >300m outside campus returns HTTP 400 Bad Request.
- **T2-BND-GPS-03**: Error response explicitly mentions campus boundary limitation (>300m from paths).
- **T2-BND-GPS-04**: Global extreme coordinates (`0.0, 0.0` or `40.7128, -74.0060`) are rejected with HTTP 400.
- **T2-BND-GPS-05**: Coordinates just beyond boundary threshold (310m distance) are rejected with HTTP 400.

### 4.3 Boundary 3: Empty & Pathological Search Queries
- **T2-BND-SCH-01**: Empty query string `?q=` returns HTTP 200 with empty list or HTTP 422 validation error.
- **T2-BND-SCH-02**: Whitespace-only query `?q=%20%20%20` is handled gracefully without error.
- **T2-BND-SCH-03**: Extreme query string (500+ characters) is safely handled without buffer overflow.
- **T2-BND-SCH-04**: SQL injection strings (`' OR '1'='1' --`, `admin'--`) do not cause 500 error or bypass search filters.
- **T2-BND-SCH-05**: HTML/script injection tags (`<script>alert(1)</script>`) return empty list without reflection.

### 4.4 Boundary 4: Unicode & Case Variations
- **T2-BND-UNI-01**: Mixed casing ("cAmPuS liBrAry") correctly matches "Central Campus Library".
- **T2-BND-UNI-02**: Accented Latin characters ("café") safely match "Cafeteria".
- **T2-BND-UNI-03**: Unicode emojis in query string ("📚", "🏛️") are handled safely returning empty list or match.
- **T2-BND-UNI-04**: Non-ASCII scripts (Devanagari, Cyrillic, Chinese) do not trigger encoding/decoding crashes.
- **T2-BND-UNI-05**: Leading and trailing whitespace is trimmed cleanly during search parsing.

### 4.5 Boundary 5: Same Start & Destination
- **T2-BND-SAM-01**: Routing where `start_node_id == destination_node_id` returns HTTP 200 OK.
- **T2-BND-SAM-02**: Returned `total_distance_meters` is exactly 0.0.
- **T2-BND-SAM-03**: Returned `estimated_time_seconds` is 0.
- **T2-BND-SAM-04**: Step-by-step directions list contains a single arrival instruction ("You are already at your destination").
- **T2-BND-SAM-05**: Route request where start and destination location IDs are identical returns 0 distance and 1 path node.

### 4.6 Boundary 6: Negative Distances & Invalid Edge Geometries
- **T2-BND-EDG-01**: Admin attempt to create edge with negative distance (`-25.0m`) returns HTTP 422 Unprocessable Entity.
- **T2-BND-EDG-02**: Admin attempt to create self-loop edge (`from_node_id == to_node_id`) returns HTTP 422.
- **T2-BND-EDG-03**: Admin attempt to create edge referencing non-existent node IDs returns HTTP 404 or 422.
- **T2-BND-EDG-04**: Edge creation with non-numeric string for distance fails Pydantic schema validation (422).
- **T2-BND-EDG-05**: Node creation with invalid latitude (> 90.0 or < -90.0) returns HTTP 422.

### 4.7 Boundary 7: Authentication Tokens & Header Manipulation
- **T2-BND-TOK-01**: Malformed JWT string in Authorization header returns HTTP 401 Unauthorized.
- **T2-BND-TOK-02**: Expired JWT token returns HTTP 401 Unauthorized.
- **T2-BND-TOK-03**: JWT token signed with an invalid/forged signature returns HTTP 401 Unauthorized.
- **T2-BND-TOK-04**: JWT token missing essential `sub` claim returns HTTP 401.
- **T2-BND-TOK-05**: Non-Bearer schemes (e.g. `Basic admin:pass` or `Token xyz`) to protected routes return HTTP 401.

---

## 5. Tier 3: Cross-Feature Combinations (Pairwise Workflows)

Tier 3 tests verify that disparate subsystems interact cleanly and pass state accurately:

1. **Pair 1: QR Code Lookup -> Navigation Route Calculation**
   - Query seeded QR token -> Extract location details and `entrance_node_id`.
   - Issue `POST /api/routes` starting from that entrance node to a target building.
   - Verify continuous navigation data flow and accurate distance calculation.
2. **Pair 2: Category Filter -> Location Pick -> Wheelchair Accessible Route**
   - Query categories to find "Libraries" and "Food and Cafeteria".
   - Retrieve location IDs and coordinates for each.
   - Request route with `accessible_only=true`.
   - Verify route exclusively uses ramp path and contains zero stairs steps.
3. **Pair 3: Admin Graph Mutation -> Routing Engine Discovery**
   - Authenticate as admin via JWT.
   - Create a new path node and connect it via a new edge.
   - Request public route utilizing the newly added node.
   - Verify pathfinder immediately traverses the updated graph.
   - Cleanup: delete created edge and node.
4. **Pair 4: Admin Location CRUD -> Search Index Reflection -> QR Code Generation**
   - Create new POI location "Quantum Research Pavilion" via admin API.
   - Verify public search immediately discovers the new POI.
   - Verify QR code generator renders valid PNG for new location ID.
   - Cleanup: delete temporary location record.
5. **Pair 5: GPS Coordinate Snapping -> Filtered POI -> Duration Calculation**
   - Provide GPS coordinates near athletic grounds.
   - Snap coordinates to Sports Arena entrance node.
   - Route to Central Library.
   - Verify estimated walking duration accurately reflects $t = d / 1.3$ seconds.

---

## 6. Tier 4: Real-World Application Scenarios (End-to-End User Workflows)

Tier 4 tests model realistic end-to-end user journeys:

1. **Scenario 1: Freshman Student First-Day Campus Arrival**
   - Arrives at University Main Gate (Location 11).
   - Searches for lecture hall "Sir CV Raman Science Block" (Location 2).
   - Computes standard pedestrian route.
   - Confirms navigation directions guide past Admin lawn and conclude with destination arrival.
2. **Scenario 2: Wheelchair Visitor Library to Cafeteria Navigation**
   - Visitor in wheelchair starts at Central Campus Library (Location 5).
   - Requests accessible navigation to Garden Canteen & Cafeteria (Location 6).
   - Verifies path strictly takes ramp detour (Nodes 9->12->10, 78m) and eliminates stairs shortcut (42m).
   - Verifies walking duration is estimated at accessible speed ($1.0\text{ m/s}$).
3. **Scenario 3: Emergency QR Scan to Campus Infirmary**
   - Student at Turing Computer Science Dept (Location 3) requires medical assistance.
   - Scans physical door QR code.
   - Application sets origin to CS Dept and selects University Health Center (Location 8).
   - Computes urgent shortest route to medical center entrance.
4. **Scenario 4: Campus Visitor Parking & Accessible Washroom Discovery**
   - Visitor parks at North Campus Parking (Location 9).
   - Filters category "Washrooms" and selects Central Student Restrooms (Location 10).
   - Verifies restroom has accessible facilities tag and routes directly to entrance node.
5. **Scenario 5: Admin Pop-Up Event Creation & Public Navigation**
   - Event coordinator logs into admin console.
   - Creates temporary node and edge for "Annual Career Fair Expo".
   - Verifies public user can immediately find it via search and navigate from any campus entrance.
   - Teardown restores pristine graph state.

---

## 7. Test Suite File Structure & Implementation Layout

```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py                   # Pytest fixtures, test client, auth helpers, seed validator
│   ├── test_tier1_features.py        # Tier 1: 45+ feature coverage tests across 9 features
│   ├── test_tier2_boundaries.py      # Tier 2: 35+ boundary & edge case tests across 7 boundaries
│   ├── test_tier3_combinations.py    # Tier 3: 5 pairwise cross-feature integration tests
│   ├── test_tier4_scenarios.py       # Tier 4: 5 realistic end-to-end user workflows
│   ├── test_e2e_tiers.py             # Unified entry point aggregating Tiers 1-4
│   └── runner.py                     # Standalone CLI test runner with diagnostic reporting
├── pytest.ini                        # Pytest configuration, testpaths, markers, timeouts
└── requirements.txt
```

---

## 8. Execution Commands & CLI Reference

### Run Entire Test Suite via Pytest
```powershell
# From backend directory with virtual environment active
cd e:\Campus-Nav\backend
pytest -v
```

### Run by Specific Tier
```powershell
# Tier 1: Feature Coverage
pytest tests/test_tier1_features.py -v

# Tier 2: Boundary & Corner Cases
pytest tests/test_tier2_boundaries.py -v

# Tier 3: Cross-Feature Combinations
pytest tests/test_tier3_combinations.py -v

# Tier 4: Real-World Scenarios
pytest tests/test_tier4_scenarios.py -v
```

### Run by Marker
```powershell
pytest -m tier1 -v
pytest -m tier2 -v
pytest -m tier3 -v
pytest -m tier4 -v
```

### Run via Standalone Test Runner (Instant Diagnostics)
```powershell
python backend/tests/runner.py
```

---

## 9. Failure Escalation & Defect Reporting Protocol

In adherence to the **Test Writer Persona**:
1. Test writers do not modify backend implementation code (`backend/app/*`).
2. When a test fails due to an implementation defect:
   - Document exact endpoint, request payload, expected status/output vs actual response.
   - Classify defect severity (Critical, Major, Minor).
   - Escalate to the implementation agent with reproducing test case reference.
3. Test failures attributable to test bugs (e.g., incorrect fixture, invalid expected contract) are corrected directly by the QA agent.
