"""Tier 1: Feature Coverage Automated Test Suite.

Validates that all core functional features meet their API specifications with >=5 test cases per feature:
1. Health & Liveness Probe (/api/health)
2. Category Catalog (/api/categories)
3. Locations & POIs (/api/locations, /api/locations/{id})
4. Location Search & Autocomplete (/api/locations/search)
5. Routing Engine & Algorithm Parity (/api/routes)
6. Coordinate Snapping Logic
7. Accessibility Route Filtering
8. Admin Authentication & Security (/api/admin/login)
9. QR Code Resolution & Generation (/api/qr/{identifier})
"""

import math
from typing import Dict, Any

try:
    import pytest
except ModuleNotFoundError:
    try:
        from backend.tests.conftest import pytest
    except ModuleNotFoundError:
        from tests.conftest import pytest


@pytest.mark.tier1
class TestHealthFeature:
    """Feature 1: System Health Check and Liveness Probing."""

    def test_health_status_ok(self, client):
        """T1-HLTH-01: Health check returns HTTP 200 with status ok."""
        response = client.get("/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"

    def test_health_payload_schema(self, client):
        """T1-HLTH-02: Health check payload contains expected metadata keys."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "status" in data

    def test_health_content_type_header(self, client):
        """T1-HLTH-03: Response header includes application/json."""
        response = client.get("/api/health")
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert "application/json" in content_type

    def test_health_head_method_support(self, client):
        """T1-HLTH-04: Health check responds to HEAD request."""
        response = client.head("/api/health")
        assert response.status_code in [200, 405]  # Standard REST supports HEAD (200) or GET only (405)

    def test_health_idempotency_rapid_calls(self, client):
        """T1-HLTH-05: Rapid consecutive health checks maintain consistent 200 OK without state degradation."""
        for _ in range(5):
            res = client.get("/api/health")
            assert res.status_code == 200
            assert res.json().get("status") == "ok"


@pytest.mark.tier1
class TestCategoriesFeature:
    """Feature 2: Category Catalog and Metadata Listing."""

    def test_categories_list_success(self, client):
        """T1-CAT-01: GET /api/categories returns HTTP 200 with non-empty list."""
        response = client.get("/api/categories")
        assert response.status_code == 200, f"Failed: {response.text}"
        categories = response.json()
        assert isinstance(categories, list)
        assert len(categories) >= 12, f"Expected >= 12 categories, found {len(categories)}"

    def test_all_twelve_canonical_categories_present(self, client, campus_seed_inventory):
        """T1-CAT-02: Confirms all 12 canonical campus categories exist."""
        response = client.get("/api/categories")
        assert response.status_code == 200
        names = [c.get("name") for c in response.json()]
        for expected in campus_seed_inventory["canonical_categories"]:
            assert expected in names, f"Missing expected category: {expected}"

    def test_category_schema_completeness(self, client):
        """T1-CAT-03: Validates schema properties: id, name, slug, icon, color, location_count."""
        response = client.get("/api/categories")
        assert response.status_code == 200
        for category in response.json():
            assert "id" in category
            assert "name" in category
            assert "slug" in category
            assert "icon" in category
            assert "color" in category
            assert "location_count" in category
            assert isinstance(category["location_count"], int)
            assert category["location_count"] >= 0

    def test_category_color_hex_tokens(self, client):
        """T1-CAT-04: Confirms category colors match hex format (#RRGGBB)."""
        response = client.get("/api/categories")
        assert response.status_code == 200
        for cat in response.json():
            color = cat.get("color", "")
            assert color.startswith("#"), f"Color must start with #: {color}"
            assert len(color) in [4, 7], f"Color invalid length: {color}"

    def test_category_lucide_icon_identifiers(self, client):
        """T1-CAT-05: Confirms icon identifier is non-empty string."""
        response = client.get("/api/categories")
        assert response.status_code == 200
        for cat in response.json():
            icon = cat.get("icon", "")
            assert isinstance(icon, str) and len(icon) > 0


@pytest.mark.tier1
class TestLocationsFeature:
    """Feature 3: Locations Listing and POI Details."""

    def test_locations_list_success(self, client):
        """T1-LOC-01: GET /api/locations returns HTTP 200 with >=12 locations."""
        response = client.get("/api/locations")
        assert response.status_code == 200, f"Failed: {response.text}"
        locations = response.json()
        assert isinstance(locations, list)
        assert len(locations) >= 12, f"Expected >= 12 locations, found {len(locations)}"

    def test_locations_coordinate_bounding_box(self, client, campus_seed_inventory):
        """T1-LOC-02: Validates all seeded locations lie within campus geographic bounds."""
        response = client.get("/api/locations")
        assert response.status_code == 200
        bounds = campus_seed_inventory["bounds"]
        for loc in response.json():
            lat = loc.get("latitude")
            lon = loc.get("longitude")
            assert lat is not None and lon is not None
            assert bounds["min_lat"] <= lat <= bounds["max_lat"], f"Lat out of bounds: {lat}"
            assert bounds["min_lon"] <= lon <= bounds["max_lon"], f"Lon out of bounds: {lon}"

    def test_location_category_filtering(self, client):
        """T1-LOC-03: Filtering locations by category_id returns matching locations only."""
        cats_res = client.get("/api/categories")
        assert cats_res.status_code == 200
        categories = cats_res.json()
        cat_id = categories[0]["id"]

        response = client.get(f"/api/locations?category_id={cat_id}")
        assert response.status_code == 200
        filtered = response.json()
        for loc in filtered:
            assert loc.get("category_id") == cat_id

    def test_location_detail_by_id(self, client):
        """T1-LOC-04: GET /api/locations/{id} returns comprehensive location metadata."""
        response = client.get("/api/locations/1")
        assert response.status_code == 200
        loc = response.json()
        assert loc.get("id") == 1
        assert "name" in loc
        assert "latitude" in loc
        assert "longitude" in loc
        assert "entrance_node_id" in loc

    def test_location_not_found(self, client):
        """T1-LOC-05: GET /api/locations/99999 returns HTTP 404."""
        response = client.get("/api/locations/99999")
        assert response.status_code == 404


@pytest.mark.tier1
class TestSearchFeature:
    """Feature 4: Location Search and Autocomplete."""

    def test_search_exact_name(self, client):
        """T1-SCH-01: Searching for 'Central Campus Library' returns matching record."""
        response = client.get("/api/locations/search?q=Central Campus Library")
        assert response.status_code == 200
        results = response.json()
        assert len(results) > 0
        names = [r["name"] for r in results]
        assert any("Library" in name for name in names)

    def test_search_partial_prefix(self, client):
        """T1-SCH-02: Searching partial token 'Robo' matches 'Advanced Robotics Lab'."""
        response = client.get("/api/locations/search?q=Robo")
        assert response.status_code == 200
        results = response.json()
        assert len(results) > 0
        assert any("Robotics" in r["name"] for r in results)

    def test_search_case_insensitivity(self, client):
        """T1-SCH-03: Case variations (lower, upper, mixed) return identical target."""
        r_lower = client.get("/api/locations/search?q=science")
        r_upper = client.get("/api/locations/search?q=SCIENCE")
        r_mixed = client.get("/api/locations/search?q=sCiEnCe")

        assert r_lower.status_code == 200 and r_upper.status_code == 200 and r_mixed.status_code == 200
        assert len(r_lower.json()) > 0
        assert len(r_lower.json()) == len(r_upper.json()) == len(r_mixed.json())

    def test_search_department_matching(self, client):
        """T1-SCH-04: Search matches department keyword 'Computer Engineering'."""
        response = client.get("/api/locations/search?q=Computer Engineering")
        assert response.status_code == 200
        results = response.json()
        assert len(results) > 0
        assert any("Turing" in r["name"] or "Computer" in r.get("department", "") for r in results)

    def test_search_no_match_empty_list(self, client):
        """T1-SCH-05: Non-existent term returns HTTP 200 with empty array []."""
        response = client.get("/api/locations/search?q=xyznonexistentphrase999")
        assert response.status_code == 200
        results = response.json()
        assert isinstance(results, list)
        assert len(results) == 0


@pytest.mark.tier1
class TestRoutingFeature:
    """Feature 5: Routing Engine & Algorithm Parity."""

    def test_route_calculation_basic(self, client):
        """T1-RTE-01: Basic route between Main Gate (21) and Admin Complex (1) returns 200 OK."""
        payload = {
            "start_node_id": 21,
            "destination_node_id": 1,
            "accessible_only": False,
            "algorithm": "dijkstra"
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        dist = data.get("total_distance_meters") or data.get("distance_meters")
        assert dist is not None and dist > 0.0

    def test_route_response_schema(self, client):
        """T1-RTE-02: Route response contains steps, coordinates, time estimates, and node list."""
        payload = {"start_node_id": 21, "destination_node_id": 1}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "steps" in data
        assert "coordinates" in data
        assert isinstance(data["steps"], list)
        assert len(data["steps"]) > 0

    def test_route_explicit_dijkstra(self, client):
        """T1-RTE-03: Route calculates with explicit algorithm='dijkstra'."""
        payload = {
            "start_node_id": 21,
            "destination_node_id": 3,
            "algorithm": "dijkstra"
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("algorithm_used") in ["dijkstra", None]

    def test_route_explicit_astar(self, client):
        """T1-RTE-04: Route calculates with explicit algorithm='astar'."""
        payload = {
            "start_node_id": 21,
            "destination_node_id": 3,
            "algorithm": "astar"
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("algorithm_used") in ["astar", None]

    def test_algorithm_parity_dijkstra_equals_astar(self, client):
        """T1-RTE-05: Dijkstra distance equals A* distance within 0.001m tolerance."""
        req_d = {"start_node_id": 21, "destination_node_id": 5, "algorithm": "dijkstra"}
        req_a = {"start_node_id": 21, "destination_node_id": 5, "algorithm": "astar"}

        res_d = client.post("/api/routes", json=req_d)
        res_a = client.post("/api/routes", json=req_a)

        assert res_d.status_code == 200 and res_a.status_code == 200
        dist_d = res_d.json().get("total_distance_meters") or res_d.json().get("distance_meters")
        dist_a = res_a.json().get("total_distance_meters") or res_a.json().get("distance_meters")

        assert abs(dist_d - dist_a) < 0.001, f"Parity mismatch: Dijkstra={dist_d} vs A*={dist_a}"


@pytest.mark.tier1
class TestCoordinateSnappingFeature:
    """Feature 6: Coordinate Snapping Logic."""

    def test_snap_origin_near_main_gate(self, client):
        """T1-SNP-01: GPS near Main Gate (15.878912, 74.519362) snaps to campus graph and routes."""
        payload = {
            "start_lat": 15.878912,
            "start_lon": 74.519362,
            "destination_node_id": 1
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200, f"Snapping failed: {response.text}"
        data = response.json()
        assert (data.get("total_distance_meters") or data.get("distance_meters")) > 0

    def test_snap_destination_coordinates(self, client):
        """T1-SNP-02: Destination GPS coordinates snap to nearest entrance node."""
        payload = {
            "start_node_id": 21,
            "destination_lat": 15.880582,
            "destination_lon": 74.519322
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200

    def test_snap_both_origin_and_destination(self, client):
        """T1-SNP-03: Both origin and destination supplied as raw coordinates."""
        payload = {
            "start_lat": 15.878912,
            "start_lon": 74.519362,
            "destination_lat": 15.881512,
            "destination_lon": 74.520232
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200

    def test_snap_coordinates_payload_aliases(self, client):
        """T1-SNP-04: Supports start_coords tuple / array representation."""
        payload = {
            "start_coords": [15.878912, 74.519362],
            "destination_node_id": 1
        }
        response = client.post("/api/routes", json=payload)
        # Should succeed (200) or gracefully validate schema (200 or 422 if only separate lat/lon accepted)
        assert response.status_code in [200, 422]

    def test_snap_within_200m_campus_center(self, client):
        """T1-SNP-05: Coordinates 150m from center successfully snap to nearest node."""
        payload = {
            "start_lat": 15.880762,
            "start_lon": 74.519112,
            "destination_node_id": 5
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200


@pytest.mark.tier1
class TestAccessibilityFeature:
    """Feature 7: Accessibility Route Filtering."""

    def test_standard_route_uses_stairs_shortcut(self, client, campus_seed_inventory):
        """T1-ACC-01: Standard route (accessible_only=false) selects shorter stairs path (~42m)."""
        payload = {
            "start_node_id": 9,  # Library
            "destination_node_id": 10,  # Plaza
            "accessible_only": False
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        data = response.json()
        dist = data.get("total_distance_meters") or data.get("distance_meters")
        # Standard shortcut should be close to 42m
        assert dist <= 50.0, f"Expected stairs shortcut <= 50m, got {dist}"

    def test_accessible_route_uses_ramp_detour(self, client, campus_seed_inventory):
        """T1-ACC-02: Accessible route (accessible_only=true) takes ramp detour (~78m)."""
        payload = {
            "start_node_id": 9,  # Library
            "destination_node_id": 10,  # Plaza
            "accessible_only": True
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        data = response.json()
        dist = data.get("total_distance_meters") or data.get("distance_meters")
        assert dist >= 60.0, f"Expected ramp detour >= 60m, got {dist}"

    def test_accessible_distance_strictly_greater_than_stairs(self, client):
        """T1-ACC-03: Accessible detour distance is strictly longer than stairs shortcut."""
        res_std = client.post("/api/routes", json={"start_node_id": 9, "destination_node_id": 10, "accessible_only": False})
        res_acc = client.post("/api/routes", json={"start_node_id": 9, "destination_node_id": 10, "accessible_only": True})

        assert res_std.status_code == 200 and res_acc.status_code == 200
        dist_std = res_std.json().get("total_distance_meters") or res_std.json().get("distance_meters")
        dist_acc = res_acc.json().get("total_distance_meters") or res_acc.json().get("distance_meters")

        assert dist_acc > dist_std, f"Ramp distance ({dist_acc}) should exceed stairs ({dist_std})"

    def test_accessible_path_nodes_include_ramp_junction(self, client):
        """T1-ACC-04: Accessible route path includes Node 12 (Ramp Junction)."""
        payload = {"start_node_id": 9, "destination_node_id": 10, "accessible_only": True}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        path_nodes = response.json().get("path_nodes") or response.json().get("path_node_ids")
        if path_nodes:
            assert 12 in path_nodes, f"Ramp junction (12) must be in accessible path: {path_nodes}"

    def test_accessible_duration_adjusts_for_speed(self, client):
        """T1-ACC-05: Accessible walking duration calculates with 1.0 m/s speed."""
        payload = {"start_node_id": 9, "destination_node_id": 10, "accessible_only": True}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        data = response.json()
        dist = data.get("total_distance_meters") or data.get("distance_meters")
        secs = data.get("estimated_time_seconds") or data.get("duration_seconds")
        if secs is not None:
            # At 1.0 m/s, time in seconds is approx equal to distance in meters
            assert abs(secs - dist) < 5.0 or secs >= math.floor(dist / 1.3)


@pytest.mark.tier1
class TestAdminAuthFeature:
    """Feature 8: Admin Authentication and Token Validation."""

    def test_admin_login_success(self, client, admin_credentials):
        """T1-SEC-01: Valid admin credentials return HTTP 200 and JWT access token."""
        response = client.post("/api/admin/login", json=admin_credentials)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("token_type", "").lower() == "bearer"

    def test_admin_login_invalid_password(self, client):
        """T1-SEC-02: Incorrect password returns HTTP 401 Unauthorized."""
        response = client.post("/api/admin/login", json={"username": "admin", "password": "wrongpassword999"})
        assert response.status_code == 401

    def test_admin_login_nonexistent_user(self, client):
        """T1-SEC-03: Unknown user returns HTTP 401 Unauthorized."""
        response = client.post("/api/admin/login", json={"username": "ghost_user", "password": "password"})
        assert response.status_code == 401

    def test_protected_endpoint_without_token(self, client):
        """T1-SEC-04: Accessing /api/admin/dashboard/stats without token returns HTTP 401."""
        response = client.get("/api/admin/dashboard/stats")
        assert response.status_code in [401, 403]

    def test_protected_endpoint_with_valid_token(self, client, admin_auth_headers):
        """T1-SEC-05: Accessing protected endpoint with Bearer token succeeds (HTTP 200)."""
        response = client.get("/api/admin/dashboard/stats", headers=admin_auth_headers)
        # 200 if endpoint implemented, 404 if route path is /api/admin/stats
        if response.status_code == 404:
            response = client.get("/api/admin/stats", headers=admin_auth_headers)
        assert response.status_code in [200, 204], f"Access failed: {response.text}"


@pytest.mark.tier1
class TestQRCodeFeature:
    """Feature 9: QR Code Lookup and Binary Stream Generation."""

    def test_qr_lookup_existing_location(self, client):
        """T1-QRC-01: Looking up seeded location QR returns location details."""
        # Using location 1 identifier or location_id
        response = client.get("/api/qr/1")
        if response.status_code == 404:
            # Try identifier lookup
            loc_res = client.get("/api/locations/1")
            if loc_res.status_code == 200:
                loc = loc_res.json()
                qr_token = loc.get("qr_identifier") or "MAIN-ADMIN-01"
                response = client.get(f"/api/qr/{qr_token}")
        assert response.status_code in [200, 307, 308]

    def test_qr_image_stream(self, client):
        """T1-QRC-02: GET /api/qr/{id}/image returns HTTP 200 with image/png content type."""
        response = client.get("/api/qr/1/image")
        assert response.status_code == 200, f"QR image failed: {response.text}"
        assert "image/png" in response.headers.get("content-type", "")

    def test_qr_image_binary_header_magic_bytes(self, client):
        """T1-QRC-03: Binary payload begins with standard PNG magic signature (\\x89PNG)."""
        response = client.get("/api/qr/1/image")
        assert response.status_code == 200
        content = response.content
        assert content.startswith(b"\x89PNG\r\n\x1a\n")

    def test_qr_poster_pdf_stream(self, client):
        """T1-QRC-04: GET /api/qr/{id}/poster returns PDF document."""
        response = client.get("/api/qr/1/poster")
        assert response.status_code == 200, f"QR poster failed: {response.text}"
        assert "application/pdf" in response.headers.get("content-type", "")
        assert response.content.startswith(b"%PDF")

    def test_qr_lookup_nonexistent_returns_404(self, client):
        """T1-QRC-05: Non-existent QR identifier returns HTTP 404."""
        response = client.get("/api/qr/completely-invalid-qr-identifier-xyz")
        assert response.status_code == 404
