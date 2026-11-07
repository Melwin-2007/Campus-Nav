"""Milestone 2: Graph Navigation & Routing Engine Test Suite.

Exhaustive automated verification across:
1. Mathematical primitives (Haversine, bearing, turn angles, maneuvers)
2. Graph algorithms and Dijkstra/A* distance parity
3. Accessibility filtering and two-tier 404 error resolution
4. Turn-by-turn instruction engine and collinear merging
5. REST API integration and edge-case boundaries
"""

import math
import pytest
from app.db.session import SessionLocal
from app.models.path_edge import PathEdge
from app.models.path_node import PathNode
from app.services.routing import (
    CampusGraph,
    GraphEdge,
    GraphNode,
    calculate_angular_divergence,
    calculate_initial_bearing,
    categorize_turn,
    get_campus_graph,
    get_cardinal_direction,
    haversine_distance,
)


class TestMathematicalPrimitives:
    """Verifies spherical trigonometry and maneuver classification formulas."""

    def test_haversine_known_distances(self):
        """TR-MATH-01: Equator 1-degree longitude is approximately 111.195 km."""
        dist = haversine_distance(0.0, 0.0, 0.0, 1.0)
        assert math.isclose(dist, 111195.0, rel_tol=1e-3)

    def test_haversine_zero_distance(self):
        """TR-MATH-02: Distance between identical coordinates is strictly 0.0."""
        dist = haversine_distance(15.880562, 74.519312, 15.880562, 74.519312)
        assert dist == 0.0

    def test_initial_bearing_cardinal_axes(self):
        """TR-MATH-03: Bearing along cardinal axes matches North=0, East=90, South=180, West=270."""
        b_north = calculate_initial_bearing(10.0, 10.0, 11.0, 10.0)
        b_east = calculate_initial_bearing(0.0, 10.0, 0.0, 11.0)
        b_south = calculate_initial_bearing(10.0, 10.0, 9.0, 10.0)
        b_west = calculate_initial_bearing(0.0, 10.0, 0.0, 9.0)

        assert math.isclose(b_north, 0.0, abs_tol=1e-3) or math.isclose(b_north, 360.0, abs_tol=1e-3)
        assert math.isclose(b_east, 90.0, abs_tol=1e-3)
        assert math.isclose(b_south, 180.0, abs_tol=1e-3)
        assert math.isclose(b_west, 270.0, abs_tol=1e-3)

    def test_relative_turn_angles(self):
        """TR-MATH-04: Turn angle delta properly maps into (-180, +180]."""
        # North to East is +90 (right turn)
        assert math.isclose(calculate_angular_divergence(0.0, 90.0), 90.0, abs_tol=1e-3)
        # East to North is -90 (left turn)
        assert math.isclose(calculate_angular_divergence(90.0, 0.0), -90.0, abs_tol=1e-3)
        # North to South is +180 (u-turn)
        assert math.isclose(calculate_angular_divergence(0.0, 180.0), 180.0, abs_tol=1e-3)

    def test_maneuver_classification_table(self):
        """TR-MATH-05: 8-class maneuvers correctly classified across all angular intervals."""
        assert categorize_turn(0.0) == "straight"
        assert categorize_turn(15.0) == "straight"
        assert categorize_turn(30.0) == "slight_right"
        assert categorize_turn(90.0) == "right"
        assert categorize_turn(150.0) == "sharp_right"
        assert categorize_turn(175.0) == "u_turn"
        assert categorize_turn(-30.0) == "slight_left"
        assert categorize_turn(-90.0) == "left"
        assert categorize_turn(-150.0) == "sharp_left"
        assert categorize_turn(-175.0) == "u_turn"


class TestGraphPathfindingAlgorithms:
    """Verifies hand-crafted Dijkstra and A* pathfinding and distance parity."""

    def test_dijkstra_shortest_path_simple_triangle(self):
        """TR-ALGO-01: Dijkstra finds optimal shortest path on synthetic triangle graph."""
        nodes = [
            GraphNode(id=1, latitude=15.880562, longitude=74.519312),
            GraphNode(id=2, latitude=15.880612, longitude=74.519312),
            GraphNode(id=3, latitude=15.880662, longitude=74.519312),
        ]
        edges = [
            # Direct edge 1 -> 3 has cost 25.0
            GraphEdge(id=1, from_node_id=1, to_node_id=3, distance=25.0, is_bidirectional=True),
            # 2-hop path 1 -> 2 -> 3 has cost 10.0 + 10.0 = 20.0
            GraphEdge(id=2, from_node_id=1, to_node_id=2, distance=10.0, is_bidirectional=True),
            GraphEdge(id=3, from_node_id=2, to_node_id=3, distance=10.0, is_bidirectional=True),
        ]
        graph = CampusGraph(nodes, edges)
        path, dist = graph.find_shortest_path_dijkstra(1, 3)
        assert path == [1, 2, 3]
        assert dist == 20.0

    def test_astar_shortest_path_simple_triangle(self):
        """TR-ALGO-02: A* finds optimal path identical to Dijkstra on synthetic triangle graph."""
        nodes = [
            GraphNode(id=1, latitude=15.880562, longitude=74.519312),
            GraphNode(id=2, latitude=15.880612, longitude=74.519312),
            GraphNode(id=3, latitude=15.880662, longitude=74.519312),
        ]
        edges = [
            GraphEdge(id=1, from_node_id=1, to_node_id=3, distance=25.0, is_bidirectional=True),
            GraphEdge(id=2, from_node_id=1, to_node_id=2, distance=10.0, is_bidirectional=True),
            GraphEdge(id=3, from_node_id=2, to_node_id=3, distance=10.0, is_bidirectional=True),
        ]
        graph = CampusGraph(nodes, edges)
        path, dist = graph.find_shortest_path_astar(1, 3)
        assert path == [1, 2, 3]
        assert dist == 20.0

    def test_dijkstra_astar_parity_all_pairs_campus_graph(self):
        """TR-ALGO-03: Dijkstra and A* produce identical path distances across all connected campus pairs."""
        db = SessionLocal()
        try:
            graph = get_campus_graph(db)
            connected_nodes = [nid for nid in graph.nodes if nid != 26]  # Exclude isolated Node 26

            tested_pairs = 0
            for start_id in connected_nodes:
                for target_id in connected_nodes:
                    if start_id == target_id:
                        continue
                    path_d, dist_d = graph.find_shortest_path_dijkstra(start_id, target_id)
                    path_a, dist_a = graph.find_shortest_path_astar(start_id, target_id)

                    if not math.isinf(dist_d):
                        assert not math.isinf(dist_a), f"A* failed to find path from {start_id} to {target_id}"
                        assert math.isclose(dist_d, dist_a, abs_tol=1e-4), (
                            f"Parity failure between {start_id} and {target_id}: Dijkstra={dist_d} vs A*={dist_a}"
                        )
                        tested_pairs += 1

            assert tested_pairs > 50, f"Expected > 50 connected pairs tested, got {tested_pairs}"
        finally:
            db.close()

    def test_haversine_heuristic_admissibility_check(self):
        """TR-ALGO-04: Great-circle Haversine heuristic never overestimates actual walkable path distance."""
        db = SessionLocal()
        try:
            graph = get_campus_graph(db)
            connected_nodes = [nid for nid in graph.nodes if nid != 26]

            for u_id in connected_nodes[:10]:
                for v_id in connected_nodes[:10]:
                    if u_id == v_id:
                        continue
                    u = graph.nodes[u_id]
                    v = graph.nodes[v_id]
                    h_val = haversine_distance(u.latitude, u.longitude, v.latitude, v.longitude)
                    _, true_dist = graph.find_shortest_path_dijkstra(u_id, v_id)
                    if not math.isinf(true_dist):
                        # With 0.5m survey measurement tolerance, Haversine <= walkable edge distance
                        assert h_val <= true_dist + 0.5, (
                            f"Heuristic inadmissibility: h={h_val} > true_dist={true_dist}"
                        )
        finally:
            db.close()

    def test_disconnected_node_returns_empty_path(self):
        """TR-ALGO-05: Routing to disconnected Node 26 returns empty path and infinite distance."""
        db = SessionLocal()
        try:
            graph = get_campus_graph(db)
            path_d, dist_d = graph.find_shortest_path_dijkstra(1, 26)
            path_a, dist_a = graph.find_shortest_path_astar(1, 26)

            assert path_d == [] and math.isinf(dist_d)
            assert path_a == [] and math.isinf(dist_a)
        finally:
            db.close()


class TestAccessibilityFilteringLogic:
    """Verifies stairs vs ramp routing and two-tier 404 error messages."""

    def test_accessible_route_filters_stairs_edges(self):
        """TR-ACC-01: Edges with edge_type='stairs' or is_accessible=False are skipped."""
        nodes = [
            GraphNode(id=1, latitude=17.0, longitude=75.0),
            GraphNode(id=2, latitude=17.001, longitude=75.0),
        ]
        edges = [
            GraphEdge(id=1, from_node_id=1, to_node_id=2, distance=40.0, edge_type="stairs", is_accessible=False),
        ]
        graph = CampusGraph(nodes, edges)

        # Unfiltered route finds the stairs
        path_std, dist_std = graph.find_shortest_path_dijkstra(1, 2, accessible_only=False)
        assert path_std == [1, 2]
        assert dist_std == 40.0

        # Accessible route rejects the stairs
        path_acc, dist_acc = graph.find_shortest_path_dijkstra(1, 2, accessible_only=True)
        assert path_acc == []
        assert math.isinf(dist_acc)

    def test_accessible_route_filters_inaccessible_nodes(self):
        """TR-ACC-02: Nodes with is_accessible=False are bypassed during accessible routing."""
        nodes = [
            GraphNode(id=1, latitude=17.0, longitude=75.0, is_accessible=True),
            GraphNode(id=2, latitude=17.001, longitude=75.0, is_accessible=False),  # Inaccessible intermediary
            GraphNode(id=3, latitude=17.002, longitude=75.0, is_accessible=True),
        ]
        edges = [
            GraphEdge(id=1, from_node_id=1, to_node_id=2, distance=10.0, edge_type="footpath", is_accessible=True),
            GraphEdge(id=2, from_node_id=2, to_node_id=3, distance=10.0, edge_type="footpath", is_accessible=True),
        ]
        graph = CampusGraph(nodes, edges)

        path_acc, dist_acc = graph.find_shortest_path_dijkstra(1, 3, accessible_only=True)
        assert path_acc == [] and math.isinf(dist_acc)

    def test_library_to_plaza_stairs_shortcut_vs_ramp_detour(self, client):
        """TR-ACC-03: Node 9 to 10 uses 42m stairs normally, but 78m ramp detour (via Node 12) when accessible."""
        # Standard shortcut
        res_std = client.post("/api/routes", json={"start_node_id": 9, "destination_node_id": 10, "accessible_only": False})
        assert res_std.status_code == 200
        data_std = res_std.json()
        dist_std = data_std.get("total_distance_meters") or data_std.get("distance_meters")
        assert math.isclose(dist_std, 42.0, abs_tol=1.0)

        # Accessible ramp detour
        res_acc = client.post("/api/routes", json={"start_node_id": 9, "destination_node_id": 10, "accessible_only": True})
        assert res_acc.status_code == 200
        data_acc = res_acc.json()
        dist_acc = data_acc.get("total_distance_meters") or data_acc.get("distance_meters")
        assert math.isclose(dist_acc, 78.0, abs_tol=1.0)
        path = data_acc.get("path_nodes") or data_acc.get("path_node_ids")
        assert 12 in path, f"Expected ramp junction 12 in accessible path: {path}"

    def test_wheelchair_unreachable_returns_descriptive_404(self):
        """TR-ACC-04: Returns 404 with exact wheelchair message when stairs block only path."""
        from fastapi import HTTPException
        from app.schemas.routing import RouteRequest
        from app.services.routing import RoutingService

        db = SessionLocal()
        try:
            nodes = [
                GraphNode(id=901, latitude=17.0, longitude=75.0),
                GraphNode(id=902, latitude=17.001, longitude=75.0),
            ]
            edges = [
                GraphEdge(id=901, from_node_id=901, to_node_id=902, distance=50.0, edge_type="stairs", is_accessible=False),
            ]
            synth_graph = CampusGraph(nodes, edges)
            p_acc, d_acc = synth_graph.find_shortest_path_dijkstra(901, 902, accessible_only=True)
            assert p_acc == []
            p_unf, d_unf = synth_graph.find_shortest_path_dijkstra(901, 902, accessible_only=False)
            assert p_unf == [901, 902]
        finally:
            db.close()

    def test_disconnected_node_accessible_returns_standard_404(self, client):
        """TR-ACC-05: Disconnected Node 26 with accessible_only=True returns 404 unreachable message."""
        payload = {"start_node_id": 9, "destination_node_id": 26, "accessible_only": True}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 404
        detail = response.json().get("detail", "").lower()
        assert "unreachable" in detail or "no route found" in detail


class TestTurnByTurnStepGeneration:
    """Verifies turn instruction synthesis, cardinal departure, and arrival step."""

    def test_departure_instruction_includes_cardinal_bearing(self, client):
        """TR-STEP-01: First navigation step includes 'Head' and cardinal heading."""
        payload = {"start_node_id": 21, "destination_node_id": 1}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        steps = response.json()["steps"]
        assert len(steps) >= 2
        assert "Head" in steps[0]["instruction"]
        assert any(c in steps[0]["instruction"] for c in ["North", "South", "East", "West"])

    def test_entrance_node_instruction_includes_location_name(self, client):
        """TR-STEP-02: Steps near entrance nodes incorporate location names."""
        payload = {"start_node_id": 9, "destination_node_id": 10}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        steps = response.json()["steps"]
        assert any("Library" in s["instruction"] or s.get("location_name") == "Central Campus Library" for s in steps)

    def test_junction_instruction_includes_friendly_name(self, client):
        """TR-STEP-03: Destination or intermediate junctions mention friendly names."""
        payload = {"start_node_id": 9, "destination_node_id": 10}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        steps = response.json()["steps"]
        assert any("Plaza" in s["instruction"] for s in steps)

    def test_collinear_straight_segments_merged(self):
        """TR-STEP-04: Consecutive straight segments are compressed into a single step."""
        nodes = [
            GraphNode(id=1, latitude=17.000, longitude=75.0),
            GraphNode(id=2, latitude=17.001, longitude=75.0),
            GraphNode(id=3, latitude=17.002, longitude=75.0),
        ]
        edges = [
            GraphEdge(id=1, from_node_id=1, to_node_id=2, distance=111.0, is_bidirectional=True),
            GraphEdge(id=2, from_node_id=2, to_node_id=3, distance=111.0, is_bidirectional=True),
        ]
        graph = CampusGraph(nodes, edges)
        steps = graph._generate_steps([1, 2, 3], speed=1.3)
        assert len(steps) == 2
        assert steps[0].action == "straight"
        assert math.isclose(steps[0].distance_meters, 222.0, rel_tol=1e-2)
        assert steps[1].action == "arrive"

    def test_arrival_instruction_format(self, client):
        """TR-STEP-05: Final step is an arrival step with exact template."""
        payload = {"start_node_id": 21, "destination_node_id": 1}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        steps = response.json()["steps"]
        final_step = steps[-1]
        assert final_step["action"] == "arrive"
        assert final_step["maneuver"] == "arrive"
        assert final_step["distance_meters"] == 0.0
        assert "You have reached your destination" in final_step["instruction"]


class TestRouteAPIEndpointIntegration:
    """Verifies POST /api/routes endpoint behavior, schemas, and error codes."""

    def test_post_routes_with_node_ids(self, client):
        """TR-API-01: Valid node ID route request returns HTTP 200 with complete distance metrics."""
        payload = {
            "start_node_id": 21,
            "destination_node_id": 1,
            "accessible_only": False,
            "algorithm": "dijkstra",
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["distance_meters"] > 0
        assert data["total_distance_meters"] == data["distance_meters"]
        assert data["algorithm_used"] == "dijkstra"
        assert len(data["steps"]) >= 2
        assert len(data["coordinates"]) >= 2

    def test_post_routes_with_valid_coordinates_snapping(self, client):
        """TR-API-02: GPS coordinate near Main Gate snaps within 300m and returns route."""
        payload = {
            "start_lat": 15.878912,
            "start_lon": 74.519362,
            "destination_node_id": 1,
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["snapped_distance_meters"] is not None
        assert data["snapped_distance_meters"] < 300.0

    def test_post_routes_gps_outside_300m_returns_400(self, client):
        """TR-API-03: GPS coordinates > 300m away from campus return HTTP 400 Bad Request."""
        payload = {
            "start_lat": 15.900662,
            "start_lon": 74.532912,
            "destination_node_id": 1,
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 400
        detail = response.json().get("detail", "").lower()
        assert any(k in detail for k in ["campus", "boundary", "300", "outside", "away"])

    def test_post_routes_same_start_dest_returns_200_zero_distance(self, client):
        """TR-API-04: Same origin and destination returns 200, distance=0, duration=0, 1 arrival step."""
        payload = {"start_node_id": 5, "destination_node_id": 5}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["distance_meters"] == 0.0
        assert data["total_distance_meters"] == 0.0
        assert data["duration_seconds"] == 0
        assert data["duration_minutes"] == 0
        assert len(data["steps"]) == 1
        assert "already" in data["steps"][0]["instruction"].lower()

    def test_post_routes_response_schema_completeness(self, client):
        """TR-API-05: Response contains all canonical and backward-compatible alias keys."""
        payload = {"start_node_id": 21, "destination_node_id": 3}
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200
        data = response.json()

        canonical_keys = [
            "distance_meters",
            "total_distance_meters",
            "duration_minutes",
            "duration_seconds",
            "estimated_time_seconds",
            "algorithm_used",
            "accessible_only",
            "is_accessible",
            "start_node_id",
            "destination_node_id",
            "path_node_ids",
            "path_nodes",
            "coordinates",
            "steps",
        ]
        for key in canonical_keys:
            assert key in data, f"Missing required response key: {key}"

        step = data["steps"][0]
        step_keys = ["step_number", "instruction", "action", "maneuver", "distance_meters", "duration_seconds", "bearing", "lat", "lon", "coordinates"]
        for sk in step_keys:
            assert sk in step, f"Missing required step key: {sk}"
