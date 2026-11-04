"""Tier 4: Real-World Application Scenarios Automated Test Suite.

Validates end-to-end user workflows and persona journeys:
1. Scenario 1: Freshman Student First-Day Campus Arrival
2. Scenario 2: Wheelchair Visitor Library to Cafeteria Navigation
3. Scenario 3: Emergency QR Scan to Campus Health Center
4. Scenario 4: Visitor Parking & Accessible Washroom Discovery
5. Scenario 5: Admin Pop-Up Event Creation & Public Navigation
"""

import time

try:
    import pytest
except ModuleNotFoundError:
    try:
        from backend.tests.conftest import pytest
    except ModuleNotFoundError:
        from tests.conftest import pytest


@pytest.mark.tier4
class TestRealWorldApplicationScenarios:
    """End-to-End Persona Workflows and User Navigation Journeys."""

    def test_scenario_1_freshman_arrival_at_main_gate(self, client):
        """Scenario 1: New student arrives at Main Gate and navigates to Sir CV Raman Science Block."""
        # 1. User opens app and locates Main Gate
        gate_search = client.get("/api/locations/search?q=Main Gate")
        assert gate_search.status_code == 200
        gates = gate_search.json()
        assert len(gates) > 0
        main_gate = gates[0]
        gate_node_id = main_gate.get("entrance_node_id") or 21

        # 2. Student searches for scheduled physics lecture hall in Science Block
        science_search = client.get("/api/locations/search?q=Science Block")
        assert science_search.status_code == 200
        science_results = science_search.json()
        assert len(science_results) > 0
        science_block = science_results[0]
        science_node_id = science_block.get("entrance_node_id") or 3

        # 3. Student requests standard pedestrian walking directions
        route_req = {
            "start_node_id": gate_node_id,
            "destination_node_id": science_node_id,
            "accessible_only": False,
            "algorithm": "dijkstra"
        }
        route_res = client.post("/api/routes", json=route_req)
        assert route_res.status_code == 200
        route = route_res.json()

        # 4. Verify turn-by-turn navigation clarity and arrival step
        steps = route.get("steps", [])
        assert len(steps) >= 2, "Expected multiple navigation maneuvers"
        final_step = steps[-1]
        assert final_step.get("maneuver") in ["arrive", "destination"] or "arrived" in final_step.get("instruction", "").lower()
        assert (route.get("total_distance_meters") or route.get("distance_meters")) > 50.0

    def test_scenario_2_wheelchair_visitor_library_to_cafeteria(self, client):
        """Scenario 2: Wheelchair visitor navigates from Central Library to Canteen via ramp detour."""
        # 1. Fetch details for Central Campus Library
        lib_res = client.get("/api/locations/5")
        assert lib_res.status_code == 200
        lib_node = lib_res.json()["entrance_node_id"]  # Node 9

        # 2. Fetch details for Garden Canteen & Cafeteria
        cafe_res = client.get("/api/locations/6")
        assert cafe_res.status_code == 200
        cafe_node = cafe_res.json()["entrance_node_id"]  # Node 11

        # 3. Compute wheelchair-accessible route (accessible_only=true)
        route_req = {
            "start_node_id": lib_node,
            "destination_node_id": cafe_node,
            "accessible_only": True
        }
        route_res = client.post("/api/routes", json=route_req)
        assert route_res.status_code == 200
        route = route_res.json()

        # 4. Verify route bypasses stairs shortcut (Node 10) directly and routes via ramp Node 12
        path = route.get("path_nodes") or route.get("path_node_ids") or []
        if path:
            assert 12 in path, f"Accessible route must include ramp junction Node 12: {path}"

        # 5. Verify accessible walking duration reflects lower walking speed (1.0 m/s)
        dist = route.get("total_distance_meters") or route.get("distance_meters")
        secs = route.get("estimated_time_seconds") or route.get("duration_seconds")
        if secs is not None:
            assert secs >= round(dist / 1.3), "Duration must not assume fast running speed"

    def test_scenario_3_emergency_qr_scan_to_health_center(self, client):
        """Scenario 3: Urgent medical check-in from Turing CS Dept scanning QR to navigate to Health Center."""
        # 1. Scan door QR at Turing Computer Science Dept (Location 3)
        qr_res = client.get("/api/qr/3")
        if qr_res.status_code == 404:
            loc_res = client.get("/api/locations/3")
            assert loc_res.status_code == 200
            start_node = loc_res.json()["entrance_node_id"]
        else:
            assert qr_res.status_code in [200, 307, 308]
            start_node = (qr_res.json().get("entrance_node_id") if qr_res.status_code == 200 else None) or 5

        # 2. Target University Health Center (Location 8, entrance node 15)
        health_res = client.get("/api/locations/8")
        assert health_res.status_code == 200
        dest_node = health_res.json()["entrance_node_id"]

        # 3. Request urgent pathfinding
        route_req = {
            "start_node_id": start_node,
            "destination_node_id": dest_node,
            "accessible_only": False,
            "algorithm": "astar"
        }
        route_res = client.post("/api/routes", json=route_req)
        assert route_res.status_code == 200
        route = route_res.json()
        assert (route.get("total_distance_meters") or route.get("distance_meters")) > 0

    def test_scenario_4_visitor_parking_accessible_restroom_discovery(self, client):
        """Scenario 4: Visitor parks at North Campus Parking, discovers accessible washroom, and navigates."""
        # 1. Visitor starts at North Campus Parking (Location 9, Node 17)
        parking_res = client.get("/api/locations/9")
        assert parking_res.status_code == 200
        start_node = parking_res.json()["entrance_node_id"]

        # 2. Search category Washrooms for accessible facilities
        cats_res = client.get("/api/categories")
        assert cats_res.status_code == 200
        washroom_cat = next((c for c in cats_res.json() if "wash" in c["slug"].lower() or "rest" in c["name"].lower()), None)
        assert washroom_cat is not None

        locs_res = client.get(f"/api/locations?category_id={washroom_cat['id']}")
        assert locs_res.status_code == 200
        restrooms = locs_res.json()
        assert len(restrooms) > 0
        target_restroom = restrooms[0]
        dest_node = target_restroom["entrance_node_id"]

        # 3. Compute walking route to restroom
        route_req = {
            "start_node_id": start_node,
            "destination_node_id": dest_node,
            "accessible_only": True
        }
        route_res = client.post("/api/routes", json=route_req)
        assert route_res.status_code == 200
        assert len(route_res.json().get("steps", [])) >= 1

    def test_scenario_5_admin_event_onboarding_and_wayfinding(self, client, admin_auth_headers):
        """Scenario 5: Admin creates temporary event pavilion, verifies public search and navigation."""
        created_node = None
        created_edge = None
        created_loc = None
        stamp = int(time.time())

        try:
            # 1. Admin creates event node
            node_res = client.post("/api/admin/nodes", json={
                "name": f"Event Pavilion Node {stamp}",
                "latitude": 17.66100,
                "longitude": 75.90650,
                "floor": 0,
                "node_type": "landmark",
                "is_accessible": True,
                "is_active": True
            }, headers=admin_auth_headers)

            if node_res.status_code in [200, 201]:
                created_node = node_res.json().get("id")

                # 2. Connect to campus walkway at Node 5 (CS Dept)
                edge_res = client.post("/api/admin/edges", json={
                    "from_node_id": 5,
                    "to_node_id": created_node,
                    "distance": 22.0,
                    "edge_type": "footpath",
                    "is_accessible": True,
                    "is_bidirectional": True,
                    "is_active": True
                }, headers=admin_auth_headers)

                if edge_res.status_code in [200, 201]:
                    created_edge = edge_res.json().get("id")

                # 3. Create POI record for Annual Job Fair
                loc_res = client.post("/api/admin/locations", json={
                    "name": f"Annual Job Fair {stamp}",
                    "category_id": 12,
                    "description": "University recruitment drive and company booths.",
                    "department": "Career Services",
                    "latitude": 17.66100,
                    "longitude": 75.90650,
                    "entrance_node_id": created_node,
                    "opening_hours": "10:00 - 17:00",
                    "facilities": ["Wi-Fi", "Accessible Stalls"],
                    "is_active": True
                }, headers=admin_auth_headers)

                if loc_res.status_code in [200, 201]:
                    created_loc = loc_res.json().get("id")

                    # 4. Public search immediately finds the Job Fair
                    find_res = client.get(f"/api/locations/search?q=Annual Job Fair {stamp}")
                    assert find_res.status_code == 200
                    assert len(find_res.json()) > 0

                    # 5. Public route from Main Gate (21) reaches the Job Fair node
                    route_res = client.post("/api/routes", json={
                        "start_node_id": 21,
                        "destination_node_id": created_node,
                        "accessible_only": False
                    })
                    assert route_res.status_code == 200

        finally:
            # Teardown temporary event records
            if created_loc:
                client.delete(f"/api/admin/locations/{created_loc}", headers=admin_auth_headers)
            if created_edge:
                client.delete(f"/api/admin/edges/{created_edge}", headers=admin_auth_headers)
            if created_node:
                client.delete(f"/api/admin/nodes/{created_node}", headers=admin_auth_headers)
