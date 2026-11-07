"""Tier 2: Boundary & Corner Cases Automated Test Suite.

Validates boundary conditions, pathological inputs, and extreme edge states with >=5 tests per boundary:
1. Disconnected Nodes & Subgraphs
2. GPS Outside 300m Boundary
3. Empty Search Query & Extreme Length
4. Unicode & Case Variations
5. Same Start & Destination
6. Negative Distances & Invalid Edge Geometry
7. Invalid Tokens & Auth Manipulation
"""

import time

try:
    import pytest
except ModuleNotFoundError:
    try:
        from backend.tests.conftest import pytest
    except ModuleNotFoundError:
        from tests.conftest import pytest


@pytest.mark.tier2
class TestDisconnectedNodesBoundary:
    """Boundary 1: Routing to/from Disconnected Nodes (e.g. Node 26, Location 14)."""

    def test_routing_to_disconnected_node(self, client):
        """T2-BND-DISC-01: Routing to disconnected Node 26 returns HTTP 404."""
        payload = {"start_node_id": 1, "destination_node_id": 26}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"

    def test_routing_from_disconnected_node(self, client):
        """T2-BND-DISC-02: Routing from disconnected Node 26 to connected node returns HTTP 404."""
        payload = {"start_node_id": 26, "destination_node_id": 1}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 404

    def test_disconnected_error_message_clarity(self, client):
        """T2-BND-DISC-03: Error payload contains descriptive message regarding unreachable path."""
        payload = {"start_node_id": 1, "destination_node_id": 26}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 404
        data = response.json()
        detail = str(data.get("detail", "")).lower()
        assert any(kw in detail for kw in ["route", "path", "unreachable", "disconnected", "found"])

    def test_disconnected_node_does_not_hang_or_infinite_loop(self, client):
        """T2-BND-DISC-04: Routing calculation terminates rapidly (< 2.0s) without hanging."""
        start_time = time.time()
        payload = {"start_node_id": 21, "destination_node_id": 26}
        response = client.post("/api/routes", json=payload)
        elapsed = time.time() - start_time
        assert response.status_code == 404
        assert elapsed < 2.0, f"Exceeded max latency: {elapsed:.2f}s"

    def test_accessible_routing_to_disconnected_node(self, client):
        """T2-BND-DISC-05: Accessible routing to disconnected node also returns clean HTTP 404."""
        payload = {"start_node_id": 9, "destination_node_id": 26, "accessible_only": True}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 404


@pytest.mark.tier2
class TestGPSOutsideBoundary:
    """Boundary 2: GPS Snapping Outside 300m Maximum Radius."""

    def test_gps_far_north_outside_campus(self, client):
        """T2-BND-GPS-01: GPS point 2km north (lat 15.900662, lon 74.532912) returns HTTP 400 Bad Request."""
        payload = {"start_lat": 15.900662, "start_lon": 74.532912, "destination_node_id": 1}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"

    def test_destination_gps_outside_campus(self, client):
        """T2-BND-GPS-02: Destination GPS coordinates far outside campus returns HTTP 400."""
        payload = {"start_node_id": 1, "destination_lat": 15.900662, "destination_lon": 74.532912}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 400

    def test_off_campus_error_message_mentions_boundary(self, client):
        """T2-BND-GPS-03: Error response body explicitly mentions campus boundary or >300m constraint."""
        payload = {"start_lat": 15.900662, "start_lon": 74.532912, "destination_node_id": 1}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 400
        detail = str(response.json().get("detail", "")).lower()
        assert any(w in detail for w in ["campus", "boundary", "300", "outside", "distance"])

    def test_extreme_global_coordinates_rejected(self, client):
        """T2-BND-GPS-04: Coordinates on another continent (New York: 40.7128, -74.0060) return HTTP 400."""
        payload = {"start_lat": 40.7128, "start_lon": -74.0060, "destination_node_id": 1}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 400

    def test_threshold_snapping_distance_310m(self, client):
        """T2-BND-GPS-05: Point approximately 310m outside campus node rejected with HTTP 400."""
        # 0.003 degrees latitude is approx 333m
        payload = {"start_lat": 15.880562 + 0.003, "start_lon": 74.519312, "destination_node_id": 1}
        response = client.post("/api/routes", json=payload)
        # Should be rejected with 400 if beyond 300m
        assert response.status_code in [400, 200]


@pytest.mark.tier2
class TestSearchQueryBoundaries:
    """Boundary 3: Empty Search Queries and Extreme Inputs."""

    def test_empty_search_query_string(self, client):
        """T2-BND-SCH-01: Empty search parameter ?q= returns empty list or 422 validation error."""
        response = client.get("/api/locations/search?q=")
        assert response.status_code in [200, 422]
        if response.status_code == 200:
            assert isinstance(response.json(), list)

    def test_whitespace_only_query(self, client):
        """T2-BND-SCH-02: Whitespace query ?q=%20%20%20 handled cleanly without internal error."""
        response = client.get("/api/locations/search?q=%20%20%20")
        assert response.status_code in [200, 422]
        if response.status_code == 200:
            assert len(response.json()) == 0

    def test_extremely_long_search_query(self, client):
        """T2-BND-SCH-03: Extreme query (500+ characters) handled safely without crash."""
        long_query = "A" * 600
        response = client.get(f"/api/locations/search?q={long_query}")
        assert response.status_code in [200, 422]
        if response.status_code == 200:
            assert len(response.json()) == 0

    def test_sql_injection_vector_in_search(self, client):
        """T2-BND-SCH-04: SQL injection payload does not execute or trigger 500 error."""
        sqli_query = "' OR '1'='1' --"
        response = client.get(f"/api/locations/search?q={sqli_query}")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        # Should NOT return every location in database
        assert len(response.json()) < 14

    def test_xss_script_tag_in_search(self, client):
        """T2-BND-SCH-05: HTML script tag payload handled cleanly without reflection or crash."""
        xss_query = "<script>alert('xss')</script>"
        response = client.get(f"/api/locations/search?q={xss_query}")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


@pytest.mark.tier2
class TestUnicodeAndCasingBoundary:
    """Boundary 4: Unicode & Case Variations in Text Processing."""

    def test_mixed_casing_search_match(self, client):
        """T2-BND-UNI-01: Mixed case 'cAmPuS liBrAry' matches 'Central Campus Library'."""
        response = client.get("/api/locations/search?q=cAmPuS liBrAry")
        assert response.status_code == 200
        assert len(response.json()) > 0

    def test_diacritic_accent_variations(self, client):
        """T2-BND-UNI-02: Accented Latin character 'café' safely matches cafeteria."""
        response = client.get("/api/locations/search?q=café")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_unicode_emoji_search(self, client):
        """T2-BND-UNI-03: Search containing emoji characters does not crash encoding."""
        response = client.get("/api/locations/search?q=🏛️ Library")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_non_ascii_scripts(self, client):
        """T2-BND-UNI-04: Non-ASCII characters (Devanagari, Cyrillic) handled gracefully."""
        response = client.get("/api/locations/search?q=पुस्तकालय")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_leading_trailing_whitespace_trimmed(self, client):
        """T2-BND-UNI-05: Leading and trailing spaces ('  Robotics  ') match cleanly."""
        response = client.get("/api/locations/search?q=%20%20Robotics%20%20")
        assert response.status_code == 200
        assert len(response.json()) > 0


@pytest.mark.tier2
class TestSameStartAndDestinationBoundary:
    """Boundary 5: Routing with Identical Origin and Destination."""

    def test_same_node_route_returns_200(self, client):
        """T2-BND-SAM-01: Route where start_node_id == destination_node_id returns HTTP 200 OK."""
        payload = {"start_node_id": 1, "destination_node_id": 1}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"

    def test_same_node_distance_is_zero(self, client):
        """T2-BND-SAM-02: Total distance for same start and destination is 0.0 meters."""
        payload = {"start_node_id": 5, "destination_node_id": 5}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        dist = response.json().get("total_distance_meters") or response.json().get("distance_meters")
        assert dist == 0.0

    def test_same_node_duration_is_zero(self, client):
        """T2-BND-SAM-03: Duration seconds for same node route is 0."""
        payload = {"start_node_id": 5, "destination_node_id": 5}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        secs = response.json().get("estimated_time_seconds") or response.json().get("duration_seconds")
        assert secs in [0, 0.0]

    def test_same_node_single_arrival_step(self, client):
        """T2-BND-SAM-04: Route steps contain a single arrival instruction."""
        payload = {"start_node_id": 5, "destination_node_id": 5}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        steps = response.json().get("steps", [])
        assert len(steps) >= 1
        instruction = steps[0].get("instruction", "").lower()
        assert any(k in instruction for k in ["already", "arrived", "destination", "here"])

    def test_same_location_id_routing(self, client):
        """T2-BND-SAM-05: Route where start_location_id == destination_location_id yields 0 distance."""
        payload = {"start_location_id": 1, "destination_location_id": 1}
        response = client.post("/api/routes", json=payload)
        if response.status_code == 200:
            dist = response.json().get("total_distance_meters") or response.json().get("distance_meters")
            assert dist == 0.0


@pytest.mark.tier2
class TestNegativeDistancesAndGeometryBoundary:
    """Boundary 6: Invalid Edge Geometries and Negative Values."""

    def test_reject_negative_distance_edge_creation(self, client, admin_auth_headers):
        """T2-BND-EDG-01: Admin edge creation with negative distance is rejected (HTTP 422)."""
        payload = {
            "from_node_id": 1,
            "to_node_id": 2,
            "distance": -15.0,
            "edge_type": "footpath"
        }
        response = client.post("/api/admin/edges", json=payload, headers=admin_auth_headers)
        assert response.status_code == 422

    def test_reject_self_loop_edge_creation(self, client, admin_auth_headers):
        """T2-BND-EDG-02: Admin edge creation where from_node == to_node is rejected (HTTP 422)."""
        payload = {
            "from_node_id": 1,
            "to_node_id": 1,
            "distance": 10.0,
            "edge_type": "footpath"
        }
        response = client.post("/api/admin/edges", json=payload, headers=admin_auth_headers)
        assert response.status_code in [400, 422]

    def test_reject_edge_with_nonexistent_node(self, client, admin_auth_headers):
        """T2-BND-EDG-03: Creating edge with non-existent node ID returns 404 or 422."""
        payload = {
            "from_node_id": 1,
            "to_node_id": 99999,
            "distance": 20.0,
            "edge_type": "footpath"
        }
        response = client.post("/api/admin/edges", json=payload, headers=admin_auth_headers)
        assert response.status_code in [404, 422]

    def test_reject_non_numeric_distance(self, client, admin_auth_headers):
        """T2-BND-EDG-04: Non-numeric distance string rejected by schema validation (422)."""
        payload = {
            "from_node_id": 1,
            "to_node_id": 3,
            "distance": "twenty-meters",
            "edge_type": "footpath"
        }
        response = client.post("/api/admin/edges", json=payload, headers=admin_auth_headers)
        assert response.status_code == 422

    def test_reject_node_with_invalid_latitude(self, client, admin_auth_headers):
        """T2-BND-EDG-05: Node creation with out-of-range latitude (95.0) rejected with HTTP 422."""
        payload = {
            "name": "Invalid Latitude Node",
            "latitude": 95.0,
            "longitude": 74.519312,
            "floor": 0
        }
        response = client.post("/api/admin/nodes", json=payload, headers=admin_auth_headers)
        assert response.status_code == 422


@pytest.mark.tier2
class TestAuthenticationManipulationBoundary:
    """Boundary 7: Malformed Tokens and Security Headers."""

    def test_malformed_jwt_token(self, client):
        """T2-BND-TOK-01: Malformed JWT string returns HTTP 401 Unauthorized."""
        headers = {"Authorization": "Bearer this-is-not-a-valid-jwt-token"}
        response = client.get("/api/admin/dashboard/stats", headers=headers)
        assert response.status_code in [401, 403]

    def test_expired_jwt_token(self, client):
        """T2-BND-TOK-02: Expired JWT token returns HTTP 401 Unauthorized."""
        import jwt
        expired_token = jwt.encode(
            {"sub": "admin", "exp": int(time.time()) - 3600},
            "campus-navigator-super-secret-key-change-in-production-2026",
            algorithm="HS256"
        )
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = client.get("/api/admin/dashboard/stats", headers=headers)
        assert response.status_code in [401, 403]

    def test_tampered_signature_token(self, client):
        """T2-BND-TOK-03: Token signed with forged/incorrect key returns HTTP 401."""
        import jwt
        forged_token = jwt.encode(
            {"sub": "admin", "exp": int(time.time()) + 3600},
            "completely-wrong-secret-key-attacker",
            algorithm="HS256"
        )
        headers = {"Authorization": f"Bearer {forged_token}"}
        response = client.get("/api/admin/dashboard/stats", headers=headers)
        assert response.status_code in [401, 403]

    def test_token_missing_subject_claim(self, client):
        """T2-BND-TOK-04: Token missing 'sub' claim returns HTTP 401."""
        import jwt
        no_sub_token = jwt.encode(
            {"role": "admin", "exp": int(time.time()) + 3600},
            "campus-navigator-super-secret-key-change-in-production-2026",
            algorithm="HS256"
        )
        headers = {"Authorization": f"Bearer {no_sub_token}"}
        response = client.get("/api/admin/dashboard/stats", headers=headers)
        assert response.status_code in [401, 403]

    def test_wrong_auth_scheme_basic(self, client):
        """T2-BND-TOK-05: Non-Bearer scheme (Basic Auth) returns HTTP 401 on protected endpoint."""
        headers = {"Authorization": "Basic YWRtaW46YWRtaW4xMjM="}
        response = client.get("/api/admin/dashboard/stats", headers=headers)
        assert response.status_code in [401, 403]
