"""Milestone 2 Adversarial Stress Test Suite: Pathfinding Parity & Graph Stress.

Conducted by M2 Challenger 1.
Empirically stress-tests:
1. Dijkstra vs A* distance parity (abs_tol=1e-5) across all connected node pairs.
2. Arbitrary random geometric subgraphs & stress topologies.
3. Disconnected components (Node 26 & synthetic islands) termination speed (< 50ms per query).
4. Same start & destination zero-distance parity (distance == 0.0, duration == 0s).
5. 50 rapid routing requests via TestClient (100% success rate, mean latency < 30ms).
"""

from __future__ import annotations

import concurrent.futures
import math
import random
import time
from typing import Dict, List, Tuple

import pytest
from app.db.session import SessionLocal
from app.services.routing import (
    CampusGraph,
    GraphEdge,
    GraphNode,
    get_campus_graph,
    haversine_distance,
)


class TestDijkstraAStarParity:
    """Adversarially evaluates Dijkstra vs A* distance parity across graphs."""

    @pytest.fixture(scope="class")
    def campus_graph(self) -> CampusGraph:
        with SessionLocal() as db:
            return get_campus_graph(db)

    def test_all_pairs_parity_campus_graph_nominal(self, campus_graph: CampusGraph):
        """Sweeps all N x N node pairs on campus graph; verifies Dijkstra vs A* parity (abs_tol=1e-5)."""
        node_ids = sorted(campus_graph.nodes.keys())
        connected_pairs_tested = 0
        disconnected_pairs_tested = 0

        for u in node_ids:
            for v in node_ids:
                if u == v:
                    continue

                d_path, d_dist = campus_graph.find_shortest_path_dijkstra(u, v, accessible_only=False)
                a_path, a_dist = campus_graph.find_shortest_path_astar(u, v, accessible_only=False)

                if math.isinf(d_dist):
                    # Disconnected pair
                    assert math.isinf(a_dist), f"Dijkstra found inf but A* found {a_dist} for {u}->{v}"
                    assert d_path == []
                    assert a_path == []
                    disconnected_pairs_tested += 1
                else:
                    # Connected pair
                    assert not math.isinf(a_dist), f"A* returned inf for connected pair {u}->{v}"
                    assert math.isclose(d_dist, a_dist, abs_tol=1e-5), (
                        f"Parity failure on ({u} -> {v}): Dijkstra={d_dist}, A*={a_dist}, "
                        f"diff={abs(d_dist - a_dist)}"
                    )
                    assert len(d_path) >= 2
                    assert len(a_path) >= 2
                    assert d_path[0] == u and d_path[-1] == v
                    assert a_path[0] == u and a_path[-1] == v
                    connected_pairs_tested += 1

        assert connected_pairs_tested > 500, f"Expected >500 connected pairs, got {connected_pairs_tested}"
        print(f"\n[Parity Check] Nominal: {connected_pairs_tested} connected pairs verified (abs_tol=1e-5), {disconnected_pairs_tested} disconnected.")

    def test_all_pairs_parity_campus_graph_accessible(self, campus_graph: CampusGraph):
        """Sweeps all pairs with accessible_only=True; verifies parity & ensures zero stairs edges."""
        node_ids = sorted([nid for nid, n in campus_graph.nodes.items() if n.is_accessible])
        connected_pairs_tested = 0

        # Build lookup of stairs edges
        stairs_edge_pairs = set()
        for u, edges in campus_graph.adjacency.items():
            for e in edges:
                if e.edge_type.lower() == "stairs" or not e.is_accessible:
                    stairs_edge_pairs.add((e.from_node_id, e.to_node_id))
                    stairs_edge_pairs.add((e.to_node_id, e.from_node_id))

        for u in node_ids:
            for v in node_ids:
                if u == v:
                    continue

                d_path, d_dist = campus_graph.find_shortest_path_dijkstra(u, v, accessible_only=True)
                a_path, a_dist = campus_graph.find_shortest_path_astar(u, v, accessible_only=True)

                if math.isinf(d_dist):
                    assert math.isinf(a_dist)
                    assert d_path == []
                    assert a_path == []
                else:
                    assert math.isclose(d_dist, a_dist, abs_tol=1e-5), (
                        f"Accessible parity failure on ({u} -> {v}): Dijkstra={d_dist}, A*={a_dist}"
                    )
                    # Verify neither path traverses stairs
                    for p in [d_path, a_path]:
                        for i in range(len(p) - 1):
                            edge_pair = (p[i], p[i + 1])
                            assert edge_pair not in stairs_edge_pairs, (
                                f"Accessible path contains stairs edge {edge_pair}"
                            )
                    connected_pairs_tested += 1

        assert connected_pairs_tested > 400
        print(f"\n[Parity Check] Accessible: {connected_pairs_tested} connected pairs verified without stairs.")

    def test_arbitrary_random_subgraphs_parity(self):
        """Generates random geometric subgraphs with random topologies; tests Dijkstra vs A* parity."""
        rng = random.Random(42)  # Deterministic seed for reproducible stress test

        for graph_idx in range(5):
            num_nodes = rng.randint(20, 40)
            base_lat, base_lon = 15.880562, 74.519312

            # Generate random nodes in a ~1km bounding box
            nodes = [
                GraphNode(
                    id=i + 1,
                    latitude=base_lat + rng.uniform(-0.005, 0.005),
                    longitude=base_lon + rng.uniform(-0.005, 0.005),
                    is_accessible=True,
                    is_active=True,
                )
                for i in range(num_nodes)
            ]

            edges: List[GraphEdge] = []
            edge_id = 1
            # Connect in a spanning tree first to ensure some connectivity
            for i in range(1, num_nodes):
                parent = rng.randint(0, i - 1)
                u_node = nodes[parent]
                v_node = nodes[i]
                geo_dist = haversine_distance(u_node.latitude, u_node.longitude, v_node.latitude, v_node.longitude)
                # Edge weight must be >= haversine distance for A* heuristic admissibility
                weight = geo_dist * rng.uniform(1.0, 1.4) + rng.uniform(1.0, 5.0)
                edges.append(GraphEdge(
                    id=edge_id,
                    from_node_id=u_node.id,
                    to_node_id=v_node.id,
                    distance=weight,
                    is_bidirectional=True,
                ))
                edge_id += 1

            # Add random cross-edges (creating cycles and multiple alternative paths)
            for _ in range(num_nodes * 2):
                u = rng.choice(nodes)
                v = rng.choice(nodes)
                if u.id != v.id:
                    geo_dist = haversine_distance(u.latitude, u.longitude, v.latitude, v.longitude)
                    weight = geo_dist * rng.uniform(1.0, 1.5) + rng.uniform(0.5, 3.0)
                    edges.append(GraphEdge(
                        id=edge_id,
                        from_node_id=u.id,
                        to_node_id=v.id,
                        distance=weight,
                        is_bidirectional=rng.choice([True, False]),
                    ))
                    edge_id += 1

            synthetic_graph = CampusGraph(nodes, edges)

            # Test 50 random node pairs on this synthetic graph
            for _ in range(50):
                start = rng.choice(nodes).id
                dest = rng.choice(nodes).id
                d_path, d_dist = synthetic_graph.find_shortest_path_dijkstra(start, dest)
                a_path, a_dist = synthetic_graph.find_shortest_path_astar(start, dest)

                if math.isinf(d_dist):
                    assert math.isinf(a_dist)
                else:
                    assert math.isclose(d_dist, a_dist, abs_tol=1e-5), (
                        f"Synthetic graph {graph_idx} parity failure {start}->{dest}: "
                        f"Dijkstra={d_dist}, A*={a_dist}"
                    )


class TestDisconnectedComponents:
    """Verifies prompt termination and bounded latency (< 50ms) on disconnected components."""

    @pytest.fixture(scope="class")
    def campus_graph(self) -> CampusGraph:
        with SessionLocal() as db:
            return get_campus_graph(db)

    def test_node_26_disconnected_prompt_termination_speed(self, campus_graph: CampusGraph):
        """TR-STRESS-DISC-01: Querying Node 26 terminates in < 50ms without infinite loops."""
        node_26 = 26
        assert node_26 in campus_graph.nodes, "Node 26 must exist in campus graph"
        connected_node_ids = [nid for nid in campus_graph.nodes.keys() if nid != node_26]

        max_allowed_duration_sec = 0.050  # 50 milliseconds

        for other_id in connected_node_ids:
            # Test direction: Node 26 -> other
            t0 = time.perf_counter()
            d_path, d_dist = campus_graph.find_shortest_path_dijkstra(node_26, other_id)
            d_elapsed = time.perf_counter() - t0

            t0 = time.perf_counter()
            a_path, a_dist = campus_graph.find_shortest_path_astar(node_26, other_id)
            a_elapsed = time.perf_counter() - t0

            assert math.isinf(d_dist) and d_path == []
            assert math.isinf(a_dist) and a_path == []
            assert d_elapsed < max_allowed_duration_sec, f"Dijkstra took {d_elapsed*1000:.2f}ms (>50ms)"
            assert a_elapsed < max_allowed_duration_sec, f"A* took {a_elapsed*1000:.2f}ms (>50ms)"

            # Test direction: other -> Node 26
            t0 = time.perf_counter()
            d_path_rev, d_dist_rev = campus_graph.find_shortest_path_dijkstra(other_id, node_26)
            d_elapsed_rev = time.perf_counter() - t0

            t0 = time.perf_counter()
            a_path_rev, a_dist_rev = campus_graph.find_shortest_path_astar(other_id, node_26)
            a_elapsed_rev = time.perf_counter() - t0

            assert math.isinf(d_dist_rev) and d_path_rev == []
            assert math.isinf(a_dist_rev) and a_path_rev == []
            assert d_elapsed_rev < max_allowed_duration_sec
            assert a_elapsed_rev < max_allowed_duration_sec

    def test_synthetic_isolated_islands_termination_speed(self):
        """TR-STRESS-DISC-02: Isolated graph clusters terminate in < 50ms."""
        # Island 1: Nodes 100-110, Island 2: Nodes 200-210 (No edges connecting them)
        nodes = []
        edges = []
        for i in range(10):
            nodes.append(GraphNode(id=100 + i, latitude=17.65 + i * 0.0001, longitude=75.90))
            nodes.append(GraphNode(id=200 + i, latitude=17.67 + i * 0.0001, longitude=75.92))
            if i > 0:
                edges.append(GraphEdge(id=i, from_node_id=100 + i - 1, to_node_id=100 + i, distance=15.0))
                edges.append(GraphEdge(id=10 + i, from_node_id=200 + i - 1, to_node_id=200 + i, distance=15.0))

        island_graph = CampusGraph(nodes, edges)

        t0 = time.perf_counter()
        d_path, d_dist = island_graph.find_shortest_path_dijkstra(105, 205)
        d_elapsed = time.perf_counter() - t0

        t0 = time.perf_counter()
        a_path, a_dist = island_graph.find_shortest_path_astar(105, 205)
        a_elapsed = time.perf_counter() - t0

        assert d_path == [] and math.isinf(d_dist)
        assert a_path == [] and math.isinf(a_dist)
        assert d_elapsed < 0.050
        assert a_elapsed < 0.050

    def test_disconnected_node_api_returns_404_promptly(self, client):
        """TR-STRESS-DISC-03: API query involving Node 26 returns HTTP 404 in < 50ms."""
        # Warmup to ensure app routes and graph cache are active
        client.post("/api/routes", json={"start_node_id": 1, "destination_node_id": 3})

        payload = {"start_node_id": 26, "destination_node_id": 1}
        t0 = time.perf_counter()
        response = client.post("/api/routes", json=payload)
        elapsed = time.perf_counter() - t0

        assert response.status_code == 404
        assert "unreachable" in response.json()["detail"].lower()
        assert elapsed < 0.050, f"API disconnected query took {elapsed*1000:.2f}ms (>50ms)"


class TestSameStartDestinationParity:
    """Verifies same start & destination boundary behavior across all nodes."""

    @pytest.fixture(scope="class")
    def campus_graph(self) -> CampusGraph:
        with SessionLocal() as db:
            return get_campus_graph(db)

    def test_same_start_dest_all_nodes_graph_engine(self, campus_graph: CampusGraph):
        """TR-STRESS-ZERO-01: For every single node in graph, start==dest returns distance exactly 0.0."""
        for nid in campus_graph.nodes:
            d_path, d_dist = campus_graph.find_shortest_path_dijkstra(nid, nid)
            a_path, a_dist = campus_graph.find_shortest_path_astar(nid, nid)

            assert d_path == [nid], f"Dijkstra expected [{nid}], got {d_path}"
            assert a_path == [nid], f"A* expected [{nid}], got {a_path}"
            assert d_dist == 0.0, f"Dijkstra distance {d_dist} != 0.0"
            assert a_dist == 0.0, f"A* distance {a_dist} != 0.0"

    def test_same_start_dest_api_endpoint(self, client):
        """TR-STRESS-ZERO-02: API returns 200, distance=0.0, duration=0, 1 arrive step for same node."""
        for test_node in [1, 5, 9, 21, 26]:
            payload = {"start_node_id": test_node, "destination_node_id": test_node}
            response = client.post("/api/routes", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert data["distance_meters"] == 0.0
            assert data["total_distance_meters"] == 0.0
            assert data["duration_seconds"] == 0
            assert data["duration_minutes"] == 0
            assert data["path_node_ids"] == [test_node]
            assert len(data["steps"]) == 1
            assert data["steps"][0]["action"] == "arrive"
            assert data["steps"][0]["distance_meters"] == 0.0


class TestConcurrentRoutingRequestsStress:
    """Stress tests concurrent and rapid routing requests: 50 requests, 100% success rate, mean latency < 30ms."""

    def test_fifty_rapid_routing_requests_latency_and_success(self, client):
        """TR-STRESS-CONC-01: 50 rapid routing requests must have 100% success rate and mean latency < 30ms."""
        # Query pairs between key campus POIs
        queries = [
            {"start_node_id": 21, "destination_node_id": 1, "algorithm": "dijkstra"},
            {"start_node_id": 1, "destination_node_id": 3, "algorithm": "astar"},
            {"start_node_id": 3, "destination_node_id": 9, "algorithm": "dijkstra"},
            {"start_node_id": 9, "destination_node_id": 10, "algorithm": "astar", "accessible_only": True},
            {"start_node_id": 9, "destination_node_id": 10, "algorithm": "dijkstra", "accessible_only": False},
            {"start_node_id": 5, "destination_node_id": 13, "algorithm": "astar"},
            {"start_node_id": 13, "destination_node_id": 15, "algorithm": "dijkstra"},
            {"start_node_id": 15, "destination_node_id": 17, "algorithm": "astar"},
            {"start_node_id": 17, "destination_node_id": 19, "algorithm": "dijkstra"},
            {"start_node_id": 19, "destination_node_id": 21, "algorithm": "astar"},
        ]

        # Generate 50 request payloads
        payloads = [queries[i % len(queries)] for i in range(50)]

        latencies: List[float] = []
        statuses: List[int] = []

        # Warm-up request to ensure graph cache is populated
        warmup = client.post("/api/routes", json=payloads[0])
        assert warmup.status_code == 200

        # Rapidly fire 50 routing requests
        t_batch_start = time.perf_counter()
        for p in payloads:
            t0 = time.perf_counter()
            resp = client.post("/api/routes", json=p)
            lat_ms = (time.perf_counter() - t0) * 1000.0
            statuses.append(resp.status_code)
            latencies.append(lat_ms)

        total_batch_time_ms = (time.perf_counter() - t_batch_start) * 1000.0

        # Calculations
        success_count = sum(1 for s in statuses if s == 200)
        success_rate = (success_count / len(statuses)) * 100.0
        mean_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        sorted_latencies = sorted(latencies)
        p50_latency = sorted_latencies[len(sorted_latencies) // 2]
        p95_latency = sorted_latencies[int(len(sorted_latencies) * 0.95)]

        print(f"\n================ RAPID ROUTING STRESS REPORT ================")
        print(f"Total Requests: {len(statuses)}")
        print(f"Successful (200 OK): {success_count}/{len(statuses)} ({success_rate:.1f}%)")
        print(f"Total Batch Wall Time: {total_batch_time_ms:.2f} ms")
        print(f"Latency Min: {min_latency:.2f} ms")
        print(f"Latency Max: {max_latency:.2f} ms")
        print(f"Latency P50: {p50_latency:.2f} ms")
        print(f"Latency P95: {p95_latency:.2f} ms")
        print(f"Latency Mean: {mean_latency:.2f} ms")
        print(f"Throughput: {len(statuses) / (total_batch_time_ms / 1000.0):.1f} req/s")
        print(f"===========================================================")

        # Assertions
        assert success_rate == 100.0, f"Success rate was {success_rate}%, expected 100%"
        assert mean_latency < 30.0, f"Mean latency was {mean_latency:.2f}ms, expected < 30ms"

    def test_concurrent_pool_routing_throughput_and_success(self, client):
        """TR-STRESS-CONC-02: 50 requests dispatched across concurrent worker pool with < 30ms mean latency."""
        payloads = [
            {"start_node_id": 1 + (i % 20), "destination_node_id": 1 + ((i + 7) % 20)}
            for i in range(50)
        ]

        # Warmup
        client.post("/api/routes", json=payloads[0])

        latencies = []
        statuses = []

        def send_request(p: dict) -> Tuple[int, float]:
            t0 = time.perf_counter()
            resp = client.post("/api/routes", json=p)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            return resp.status_code, elapsed_ms

        t_start = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(send_request, p) for p in payloads]
            for future in concurrent.futures.as_completed(futures):
                s, lat = future.result()
                statuses.append(s)
                latencies.append(lat)

        total_wall_time = (time.perf_counter() - t_start) * 1000.0
        success_count = sum(1 for s in statuses if s == 200)
        mean_latency = sum(latencies) / len(latencies)

        print(f"\n[Concurrent Pool Stress] 50 requests across 3 workers: 100% ({success_count}/50) 200 OK")
        print(f"Mean Latency: {mean_latency:.2f}ms, Total Wall Time: {total_wall_time:.2f}ms ({50/(total_wall_time/1000.0):.1f} req/s)")

        assert success_count == 50
        assert mean_latency < 50.0

    def test_burst_mixed_workload_rapid_firing(self, client):
        """TR-STRESS-CONC-03: Mixed workload burst with GPS snapping, accessible routes, and same start/dest."""
        mixed_payloads = []
        for i in range(50):
            case = i % 4
            if case == 0:
                # GPS snapping query
                mixed_payloads.append({
                    "start_lat": 15.878912,
                    "start_lon": 74.519362,
                    "destination_node_id": 1,
                    "algorithm": "astar",
                })
            elif case == 1:
                # Accessible detour query
                mixed_payloads.append({
                    "start_node_id": 9,
                    "destination_node_id": 10,
                    "accessible_only": True,
                    "algorithm": "dijkstra",
                })
            elif case == 2:
                # Same start/destination zero-distance query
                mixed_payloads.append({
                    "start_node_id": 3,
                    "destination_node_id": 3,
                    "algorithm": "astar",
                })
            else:
                # Standard routing query
                mixed_payloads.append({
                    "start_node_id": 21,
                    "destination_node_id": 13,
                    "algorithm": "dijkstra",
                })

        latencies = []
        statuses = []

        for p in mixed_payloads:
            t0 = time.perf_counter()
            resp = client.post("/api/routes", json=p)
            lat = (time.perf_counter() - t0) * 1000.0
            statuses.append(resp.status_code)
            latencies.append(lat)

        success_count = sum(1 for s in statuses if s == 200)
        mean_latency = sum(latencies) / len(latencies)

        print(f"\n[Mixed Burst Rapid] 50 requests: 100% ({success_count}/50) returned 200, Mean Latency: {mean_latency:.2f}ms")
        assert success_count == 50
        assert mean_latency < 50.0
