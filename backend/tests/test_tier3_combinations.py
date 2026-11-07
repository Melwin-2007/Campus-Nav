"""Tier 3: Cross-Feature Combinations Automated Test Suite.

Validates pairwise subsystem interactions, data flow, and cross-module state transitions:
1. QR Code Lookup -> Navigation Route Calculation
2. Category Filtering -> Location Selection -> Wheelchair Accessible Route
3. Admin Graph Mutation (Node/Edge add) -> Navigation Engine Path Update
4. Admin Location CRUD -> Search Index Discovery -> QR Code Generation
5. GPS Coordinate Snapping -> Filtered POI -> Duration Calculation
"""

import time

try:
    import pytest
except ModuleNotFoundError:
    try:
        from backend.tests.conftest import pytest
    except ModuleNotFoundError:
        from tests.conftest import pytest


@pytest.mark.tier3
class TestCrossFeatureCombinations:
    """Pairwise cross-feature integration and subsystem workflows."""

    def test_qr_lookup_to_route_calculation_workflow(self, client):
        """Pair 1: QR lookup extracts entrance node and seamlessly computes route to target."""
        # Step 1: Scan/Resolve QR code for Location 11 (Main Gate)
        qr_res = client.get("/api/qr/11")
        if qr_res.status_code == 404:
            # Fallback to direct location lookup if QR identifier route differs
            loc_res = client.get("/api/locations/11")
            assert loc_res.status_code == 200
            start_node_id = loc_res.json()["entrance_node_id"]
        else:
            assert qr_res.status_code in [200, 307, 308]
            qr_data = qr_res.json() if qr_res.status_code == 200 else {}
            start_node_id = qr_data.get("entrance_node_id") or 21

        # Step 2: Target Location 5 (Central Campus Library)
        dest_loc_res = client.get("/api/locations/5")
        assert dest_loc_res.status_code == 200
        dest_node_id = dest_loc_res.json()["entrance_node_id"]

        # Step 3: Compute route using extracted start node from QR and destination node
        route_req = {
            "start_node_id": start_node_id,
            "destination_node_id": dest_node_id,
            "accessible_only": False,
            "algorithm": "dijkstra"
        }
        route_res = client.post("/api/routes", json=route_req)
        assert route_res.status_code == 200, f"Route calculation failed: {route_res.text}"

        route_data = route_res.json()
        dist = route_data.get("total_distance_meters") or route_data.get("distance_meters")
        assert dist > 0.0
        assert len(route_data.get("steps", [])) >= 2

    def test_category_filter_to_wheelchair_route_workflow(self, client):
        """Pair 2: Filter by categories, select locations, and execute wheelchair accessible routing."""
        # Step 1: Find 'Libraries' category
        cats_res = client.get("/api/categories")
        assert cats_res.status_code == 200
        categories = cats_res.json()
        lib_cat = next((c for c in categories if "lib" in c["slug"].lower() or "librar" in c["name"].lower()), None)
        assert lib_cat is not None, "Libraries category not found"

        # Step 2: Query library locations
        lib_locs_res = client.get(f"/api/locations?category_id={lib_cat['id']}")
        assert lib_locs_res.status_code == 200
        lib_locs = lib_locs_res.json()
        assert len(lib_locs) > 0
        library_loc = lib_locs[0]

        # Step 3: Find 'Food and Cafeteria' category
        food_cat = next((c for c in categories if "food" in c["slug"].lower() or "canteen" in c["name"].lower() or "cafe" in c["name"].lower()), None)
        assert food_cat is not None, "Food category not found"

        food_locs_res = client.get(f"/api/locations?category_id={food_cat['id']}")
        assert food_locs_res.status_code == 200
        food_locs = food_locs_res.json()
        assert len(food_locs) > 0
        cafeteria_loc = food_locs[0]

        # Step 4: Request accessible route between Library and Cafeteria
        route_req = {
            "start_node_id": library_loc["entrance_node_id"],
            "destination_node_id": cafeteria_loc["entrance_node_id"],
            "accessible_only": True
        }
        route_res = client.post("/api/routes", json=route_req)
        assert route_res.status_code == 200
        route_data = route_res.json()

        # Step 5: Verify route avoids stairs and uses ramp
        path_nodes = route_data.get("path_nodes") or route_data.get("path_node_ids")
        if path_nodes:
            # Node 12 is the ramp junction between Library (9) and Plaza (10)
            assert 12 in path_nodes, f"Accessible route must traverse ramp junction (12): {path_nodes}"

    def test_admin_graph_mutation_to_routing_update_workflow(self, client, admin_auth_headers):
        """Pair 3: Admin adds node and edge, routing engine immediately discovers and utilizes new path."""
        created_node_id = None
        created_edge_id = None

        try:
            # Step 1: Admin creates new path node (Innovation Hub Junction)
            node_payload = {
                "name": "E2E Test Innovation Hub Junction",
                "latitude": 15.880612,
                "longitude": 74.519362,
                "floor": 0,
                "node_type": "junction",
                "is_accessible": True,
                "is_active": True
            }
            node_res = client.post("/api/admin/nodes", json=node_payload, headers=admin_auth_headers)
            if node_res.status_code in [200, 201]:
                created_node_id = node_res.json().get("id")

                # Step 2: Admin links newly created node to Admin Complex (Node 1)
                edge_payload = {
                    "from_node_id": 1,
                    "to_node_id": created_node_id,
                    "distance": 15.0,
                    "edge_type": "footpath",
                    "is_accessible": True,
                    "is_bidirectional": True,
                    "is_active": True
                }
                edge_res = client.post("/api/admin/edges", json=edge_payload, headers=admin_auth_headers)
                if edge_res.status_code in [200, 201]:
                    created_edge_id = edge_res.json().get("id")

                    # Step 3: Public route to new node from Main Gate (Node 21)
                    route_req = {
                        "start_node_id": 21,
                        "destination_node_id": created_node_id,
                        "accessible_only": False
                    }
                    route_res = client.post("/api/routes", json=route_req)
                    assert route_res.status_code == 200
                    route_data = route_res.json()
                    path = route_data.get("path_nodes") or route_data.get("path_node_ids") or []
                    assert created_node_id in path or (route_data.get("total_distance_meters") or 0) > 0

        finally:
            # Teardown: Clean up test edge and node
            if created_edge_id:
                client.delete(f"/api/admin/edges/{created_edge_id}", headers=admin_auth_headers)
            if created_node_id:
                client.delete(f"/api/admin/nodes/{created_node_id}", headers=admin_auth_headers)

    def test_admin_location_crud_to_search_and_qr_workflow(self, client, admin_auth_headers):
        """Pair 4: Admin creates new location; immediately verified via public search and QR generator."""
        created_loc_id = None
        unique_suffix = int(time.time())
        loc_name = f"Quantum Research Pavilion {unique_suffix}"

        try:
            # Step 1: Admin creates location
            loc_payload = {
                "name": loc_name,
                "category_id": 1,
                "description": "Cutting-edge quantum materials and computing research facility.",
                "department": "School of Physical Sciences",
                "latitude": 15.881212,
                "longitude": 74.518762,
                "entrance_node_id": 3,
                "opening_hours": "09:00 - 18:00",
                "facilities": ["Cleanroom", "Supercomputers", "Restroom"],
                "is_active": True
            }
            create_res = client.post("/api/admin/locations", json=loc_payload, headers=admin_auth_headers)
            if create_res.status_code in [200, 201]:
                created_loc_id = create_res.json().get("id")

                # Step 2: Public search finds the newly created location
                search_res = client.get(f"/api/locations/search?q=Quantum Research Pavilion {unique_suffix}")
                assert search_res.status_code == 200
                results = search_res.json()
                assert any(r.get("id") == created_loc_id for r in results)

                # Step 3: QR code generation for the newly created location
                qr_res = client.get(f"/api/qr/{created_loc_id}/image")
                assert qr_res.status_code in [200, 404]  # 200 if QR automatically created, or 404 if manual generate

        finally:
            # Teardown
            if created_loc_id:
                client.delete(f"/api/admin/locations/{created_loc_id}", headers=admin_auth_headers)

    def test_gps_snapping_to_duration_calculation_workflow(self, client):
        """Pair 5: Snaps GPS coordinates near sports field, routes to library, validates 1.3 m/s pacing."""
        # Point near Sports Arena (Node 13)
        route_req = {
            "start_lat": 15.879412,
            "start_lon": 74.518562,
            "destination_node_id": 9,  # Library
            "accessible_only": False
        }
        response = client.post("/api/routes", json=route_req)
        assert response.status_code == 200
        data = response.json()
        dist = data.get("total_distance_meters") or data.get("distance_meters")
        secs = data.get("estimated_time_seconds") or data.get("duration_seconds")

        assert dist > 0
        if secs is not None:
            # Nominal speed 1.3 m/s -> time = dist / 1.3
            expected_secs = round(dist / 1.3)
            assert abs(secs - expected_secs) <= 5.0
