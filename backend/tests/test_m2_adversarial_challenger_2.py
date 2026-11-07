"""Milestone 2 Adversarial Verification Suite: Challenger 2.

Comprehensive empirical verification of:
1. Boundary angle testing for turn classification:
   - Exactly test angles: 0, 20, 20.001, 45, 45.001, 135, 135.001, 170, 170.001, 180, -20, -45, -135, -170, -180.
   - Verify correct categorization and instruction generation without index or KeyError exceptions.
2. Exact 300m boundary snapping threshold:
   - Coordinate at distance 295m -> MUST snap successfully (HTTP 200).
   - Coordinate at distance 305m -> MUST return HTTP 400 Bad Request.
3. Accessibility edge cases:
   - When only stairs connect source and destination, accessible_only=true MUST return descriptive 404 mentioning stairs.
   - When nodes are completely disconnected, accessible_only=true MUST return standard unreachable 404.
"""

from __future__ import annotations

import math
from typing import Generator
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.models.path_edge import PathEdge
from app.models.path_node import PathNode
from app.schemas.routing import RouteRequest, RouteStep
from app.services.routing import (
    CampusGraph,
    GraphEdge,
    GraphNode,
    RoutingService,
    calculate_angular_divergence,
    calculate_initial_bearing,
    categorize_turn,
    get_campus_graph,
    get_cardinal_direction,
    haversine_distance,
    invalidate_graph_cache,
)


# ==============================================================================
# 1. Turn Classification Boundary Angles
# ==============================================================================

class TestBoundaryAngleClassification:
    """Adversarially tests angular boundaries for maneuver classification."""

    # Exact angles mandated by Challenger 2 specification:
    MANDATED_ANGLES = [
        0.0,
        20.0,
        20.001,
        45.0,
        45.001,
        135.0,
        135.001,
        170.0,
        170.001,
        180.0,
        -20.0,
        -45.0,
        -135.0,
        -170.0,
        -180.0,
    ]

    EXPECTED_MANEUVERS = {
        0.0: "straight",
        20.0: "straight",
        20.001: "slight_right",
        45.0: "slight_right",
        45.001: "right",
        135.0: "right",
        135.001: "sharp_right",
        170.0: "sharp_right",
        170.001: "u_turn",
        180.0: "u_turn",
        -20.0: "straight",
        -45.0: "slight_left",
        -135.0: "left",
        -170.0: "sharp_left",
        -180.0: "u_turn",
    }

    NEGATIVE_OFFSET_ANGLES = {
        -20.001: "slight_left",
        -45.001: "left",
        -135.001: "sharp_left",
        -170.001: "u_turn",
    }

    def test_mandated_boundary_angles_categorization(self):
        """CH2-ANG-01: Verifies all 15 mandated boundary angles are categorized accurately."""
        for angle in self.MANDATED_ANGLES:
            expected = self.EXPECTED_MANEUVERS[angle]
            actual = categorize_turn(angle)
            assert actual == expected, (
                f"Angle {angle} incorrectly categorized as '{actual}', expected '{expected}'"
            )

    def test_negative_offset_boundary_angles_categorization(self):
        """CH2-ANG-02: Verifies negative asymmetric offsets (-20.001, -45.001, -135.001, -170.001)."""
        for angle, expected in self.NEGATIVE_OFFSET_ANGLES.items():
            actual = categorize_turn(angle)
            assert actual == expected, (
                f"Angle {angle} incorrectly categorized as '{actual}', expected '{expected}'"
            )

    def test_step_generation_all_boundary_angles_no_key_or_index_error(self):
        """CH2-ANG-03: End-to-end instruction generation across all boundary angles produces valid RouteSteps without KeyError or IndexError."""
        R = 6371000.0
        d = 50.0  # 50m legs
        lat_v, lon_v = 15.880662, 74.518912
        lat_u = lat_v - (d / R) * (180.0 / math.pi)
        lon_u = lon_v

        all_angles = list(self.EXPECTED_MANEUVERS.keys()) + list(self.NEGATIVE_OFFSET_ANGLES.keys())

        for target_angle in all_angles:
            bearing_out = target_angle % 360.0
            rad_b = math.radians(bearing_out)
            lat_w = lat_v + (d / R) * math.cos(rad_b) * (180.0 / math.pi)
            lon_w = lon_v + (d / R) * math.sin(rad_b) / math.cos(math.radians(lat_v)) * (180.0 / math.pi)

            n1 = GraphNode(id=1, latitude=lat_u, longitude=lon_u, name="Node 1")
            n2 = GraphNode(id=2, latitude=lat_v, longitude=lon_v, name="Node 2")
            n3 = GraphNode(id=3, latitude=lat_w, longitude=lon_w, name="Node 3")

            edges = [
                GraphEdge(id=1, from_node_id=1, to_node_id=2, distance=d),
                GraphEdge(id=2, from_node_id=2, to_node_id=3, distance=d),
            ]

            graph = CampusGraph([n1, n2, n3], edges)

            # Must execute without KeyError or IndexError
            steps = graph._generate_steps([1, 2, 3], speed=1.3)
            assert isinstance(steps, list)
            assert len(steps) >= 2

            # Every step must conform strictly to RouteStep schema
            for step in steps:
                assert isinstance(step, RouteStep)
                assert step.instruction != ""
                assert step.action in [
                    "straight",
                    "slight_right",
                    "right",
                    "sharp_right",
                    "slight_left",
                    "left",
                    "sharp_left",
                    "u_turn",
                    "arrive",
                ]
                assert step.maneuver == step.action

            # Final step must always be arrival
            assert steps[-1].action == "arrive"
            assert steps[-1].distance_meters == 0.0

    def test_cardinal_direction_boundaries(self):
        """CH2-ANG-04: Verifies compass cardinal direction lookup at angular boundaries."""
        boundary_cardinals = [
            (0.0, "North"),
            (22.499, "North"),
            (22.500, "Northeast"),
            (45.0, "Northeast"),
            (67.499, "Northeast"),
            (67.500, "East"),
            (90.0, "East"),
            (112.5, "Southeast"),
            (135.0, "Southeast"),
            (157.5, "South"),
            (180.0, "South"),
            (202.5, "Southwest"),
            (225.0, "Southwest"),
            (247.5, "West"),
            (270.0, "West"),
            (292.5, "Northwest"),
            (315.0, "Northwest"),
            (337.499, "Northwest"),
            (337.500, "North"),
            (359.999, "North"),
            (360.0, "North"),
        ]
        for bearing, expected in boundary_cardinals:
            cardinal = get_cardinal_direction(bearing)
            assert cardinal == expected, f"Bearing {bearing} expected {expected}, got {cardinal}"


# ==============================================================================
# 2. Exact 300m Boundary Snapping Threshold
# ==============================================================================

class TestExact300mBoundarySnapping:
    """Adversarially validates coordinate snapping threshold at 295m vs 305m."""

    @classmethod
    def _compute_geodesic_offset(cls, base_lat: float, base_lon: float, target_dist: float) -> tuple[float, float]:
        """Binary search geodetic coordinates due South to achieve exact distance."""
        low = base_lat - 0.01
        high = base_lat
        for _ in range(100):
            mid = (low + high) / 2.0
            d = haversine_distance(mid, base_lon, base_lat, base_lon)
            if d > target_dist:
                low = mid
            else:
                high = mid
        return high, base_lon

    def test_unit_snap_coordinate_threshold_295m_vs_305m(self):
        """CH2-SNAP-01: Unit level snap_coordinate: 295m snaps successfully, 305m raises HTTP 400."""
        # Node 21: southernmost active node at (15.878862, 74.519412)
        lat_295, lon_295 = self._compute_geodesic_offset(15.878862, 74.519412, 295.0)
        lat_305, lon_305 = self._compute_geodesic_offset(15.878862, 74.519412, 305.0)

        db = SessionLocal()
        try:
            graph = get_campus_graph(db)

            # 295m: MUST succeed
            node_id, snap_dist = graph.snap_coordinate(lat_295, lon_295)
            assert node_id == 21, f"Expected snap to Node 21, got {node_id}"
            assert math.isclose(snap_dist, 295.0, abs_tol=0.01)

            # 305m: MUST raise HTTP 400
            with pytest.raises(HTTPException) as exc_info:
                graph.snap_coordinate(lat_305, lon_305)
            assert exc_info.value.status_code == 400
            assert "outside the campus boundary" in str(exc_info.value.detail).lower()
        finally:
            db.close()

    def test_unit_snap_coordinate_exact_300m_boundary_limit(self):
        """CH2-SNAP-02: Unit level snap_coordinate: exactly 300.0m succeeds; 300.001m fails with 400."""
        lat_300_000, lon = self._compute_geodesic_offset(15.878862, 74.519412, 300.0)
        lat_300_001, _ = self._compute_geodesic_offset(15.878862, 74.519412, 300.001)

        db = SessionLocal()
        try:
            graph = get_campus_graph(db)

            # Exactly 300.0m snaps successfully
            nid, d = graph.snap_coordinate(lat_300_000, lon)
            assert nid == 21
            assert d <= 300.0

            # 300.001m strictly exceeds threshold -> HTTP 400
            with pytest.raises(HTTPException) as exc:
                graph.snap_coordinate(lat_300_001, lon)
            assert exc.value.status_code == 400
        finally:
            db.close()

    def test_api_routes_snap_start_295m_success(self, client: TestClient):
        """CH2-SNAP-03: POST /api/routes with start coordinate at 295m distance returns HTTP 200."""
        lat_295, lon_295 = self._compute_geodesic_offset(15.878862, 74.519412, 295.0)
        payload = {
            "start_lat": round(lat_295, 7),
            "start_lon": round(lon_295, 7),
            "destination_node_id": 1,
            "algorithm": "astar",
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["start_node_id"] == 21
        assert data["snapped_distance_meters"] is not None
        assert math.isclose(data["snapped_distance_meters"], 295.0, abs_tol=0.1)

    def test_api_routes_snap_start_305m_returns_400(self, client: TestClient):
        """CH2-SNAP-04: POST /api/routes with start coordinate at 305m distance returns HTTP 400 Bad Request."""
        lat_305, lon_305 = self._compute_geodesic_offset(15.878862, 74.519412, 305.0)
        payload = {
            "start_lat": round(lat_305, 7),
            "start_lon": round(lon_305, 7),
            "destination_node_id": 1,
            "algorithm": "astar",
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        detail = response.json().get("detail", "").lower()
        assert "outside the campus boundary" in detail or "away from campus" in detail

    def test_api_routes_snap_destination_295m_success_and_305m_failure(self, client: TestClient):
        """CH2-SNAP-05: Destination snapping at 295m succeeds (200) and at 305m fails (400)."""
        lat_295, lon_295 = self._compute_geodesic_offset(15.878862, 74.519412, 295.0)
        lat_305, lon_305 = self._compute_geodesic_offset(15.878862, 74.519412, 305.0)

        # 295m destination: Success
        res_295 = client.post(
            "/api/routes",
            json={
                "start_node_id": 1,
                "destination_lat": round(lat_295, 7),
                "destination_lon": round(lon_295, 7),
            },
        )
        assert res_295.status_code == 200
        assert res_295.json()["destination_node_id"] == 21

        # 305m destination: HTTP 400
        res_305 = client.post(
            "/api/routes",
            json={
                "start_node_id": 1,
                "destination_lat": round(lat_305, 7),
                "destination_lon": round(lon_305, 7),
            },
        )
        assert res_305.status_code == 400
        assert "destination coordinates are outside the campus boundary" in res_305.json().get("detail", "").lower()


# ==============================================================================
# 3. Accessibility Edge Cases (Stairs-only vs Disconnected)
# ==============================================================================

class TestAccessibilityEdgeCases:
    """Adversarially validates wheelchair accessibility diagnostics."""

    @pytest.fixture
    def stairs_only_topology(self) -> Generator[tuple[int, int], None, None]:
        """Temporarily introduces a pair of nodes connected ONLY by stairs."""
        db = SessionLocal()
        n_start_id = 981
        n_dest_id = 982
        edge_id = 981

        try:
            n_start = PathNode(
                id=n_start_id,
                latitude=15.877662,
                longitude=74.518912,
                name="Stairs Tower Base",
                is_accessible=True,
                is_active=True,
            )
            n_dest = PathNode(
                id=n_dest_id,
                latitude=15.877762,
                longitude=74.518912,
                name="Stairs Tower Summit",
                is_accessible=True,
                is_active=True,
            )
            edge = PathEdge(
                id=edge_id,
                from_node_id=n_start_id,
                to_node_id=n_dest_id,
                distance=35.0,
                edge_type="stairs",
                is_accessible=False,
                is_bidirectional=True,
                is_active=True,
            )
            db.add_all([n_start, n_dest, edge])
            db.commit()
            invalidate_graph_cache()
            yield n_start_id, n_dest_id
        finally:
            db.rollback()
            db.query(PathEdge).filter(PathEdge.id == edge_id).delete()
            db.query(PathNode).filter(PathNode.id.in_([n_start_id, n_dest_id])).delete()
            db.commit()
            invalidate_graph_cache()
            db.close()

    def test_accessible_only_with_only_stairs_returns_descriptive_404(
        self, client: TestClient, stairs_only_topology: tuple[int, int]
    ):
        """CH2-ACC-01: When only stairs connect source and destination, accessible_only=true returns 404 mentioning stairs."""
        start_id, dest_id = stairs_only_topology

        # Standard route exists and succeeds via stairs
        res_std = client.post(
            "/api/routes",
            json={
                "start_node_id": start_id,
                "destination_node_id": dest_id,
                "accessible_only": False,
            },
        )
        assert res_std.status_code == 200
        assert math.isclose(res_std.json()["distance_meters"], 35.0, abs_tol=0.1)

        # Accessible route fails with descriptive 404 mentioning stairs
        res_acc = client.post(
            "/api/routes",
            json={
                "start_node_id": start_id,
                "destination_node_id": dest_id,
                "accessible_only": True,
            },
        )
        assert res_acc.status_code == 404
        detail = res_acc.json().get("detail", "")
        assert "stairs" in detail.lower(), f"Expected 'stairs' in error message: {detail}"
        assert "wheelchair-accessible" in detail.lower()

    def test_accessible_only_disconnected_node_returns_standard_unreachable_404(
        self, client: TestClient
    ):
        """CH2-ACC-02: When nodes are completely disconnected, accessible_only=true returns standard unreachable 404 without mentioning stairs."""
        # Node 1 is connected; Node 26 (Observatory) has zero connecting edges
        payload = {
            "start_node_id": 1,
            "destination_node_id": 26,
            "accessible_only": True,
        }
        response = client.post("/api/routes", json=payload)
        assert response.status_code == 404
        detail = response.json().get("detail", "")
        assert "unreachable" in detail.lower() or "no route found" in detail.lower()
        # MUST NOT claim stairs when there is simply no physical edge at all
        assert "stairs" not in detail.lower(), (
            f"Expected standard unreachable 404, but message falsely blamed stairs: {detail}"
        )

    def test_accessible_only_dijkstra_and_astar_error_consistency(
        self, client: TestClient, stairs_only_topology: tuple[int, int]
    ):
        """CH2-ACC-03: Both Dijkstra and A* pathfinding algorithms return identical descriptive 404s."""
        start_id, dest_id = stairs_only_topology

        for algo in ["dijkstra", "astar"]:
            res = client.post(
                "/api/routes",
                json={
                    "start_node_id": start_id,
                    "destination_node_id": dest_id,
                    "accessible_only": True,
                    "algorithm": algo,
                },
            )
            assert res.status_code == 404
            assert "stairs" in res.json().get("detail", "").lower()
