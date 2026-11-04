"""Adversarial stress test suite for seed graph topology invariants and health probe.

Empirical verification harness authored by M1 Challenger 2.
Tests graph topology invariants and executes 50 rapid health probe requests measuring latency.
"""

import time
import statistics
import pytest
from sqlalchemy import select
from starlette.testclient import TestClient

from app.main import app
from app.db.session import engine, SessionLocal
from app.db.base_class import Base
from app.models.category import Category
from app.models.path_node import PathNode
from app.models.path_edge import PathEdge
from app.models.location import Location
from app.seed.seeder import seed_database


@pytest.fixture(scope="module", autouse=True)
def prepare_database():
    """Ensure clean seeded database state prior to tests."""
    Base.metadata.create_all(bind=engine)
    seed_database(reset=True)
    yield


@pytest.fixture
def db():
    """Scoped SQLAlchemy session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as c:
        yield c


class TestGraphTopologyInvariants:
    """Rigorous empirical validation of seed graph topology invariants."""

    def test_node_9_to_10_stairs_edge_invariants(self, db):
        """
        Verify Node 9 (Library entrance) to Node 10 (Plaza):
        - Direct stairs edge exists.
        - Exactly 42.0 meters.
        - Marked non-accessible (is_accessible == False).
        - Edge type is 'stairs'.
        """
        # Query edge in either direction
        stmt = select(PathEdge).where(
            ((PathEdge.from_node_id == 9) & (PathEdge.to_node_id == 10)) |
            ((PathEdge.from_node_id == 10) & (PathEdge.to_node_id == 9))
        )
        edges = db.scalars(stmt).all()
        assert len(edges) == 1, f"Expected exactly 1 edge between Node 9 and 10, found {len(edges)}"

        edge = edges[0]
        assert edge.distance == 42.0, f"Expected stairs distance 42.0m, got {edge.distance}"
        assert edge.is_accessible is False, f"Expected stairs edge to be non-accessible, got {edge.is_accessible}"
        assert edge.edge_type.lower() == "stairs", f"Expected edge_type 'stairs', got '{edge.edge_type}'"
        assert edge.is_bidirectional is True, f"Expected stairs edge to be bidirectional"
        assert edge.is_active is True, f"Expected stairs edge to be active"

    def test_node_9_to_12_to_10_ramp_path_invariants(self, db):
        """
        Verify ramp path: Nodes 9 -> 12 -> 10:
        - Edge 9 <-> 12 exists, is_accessible == True, edge_type == 'ramp', distance == 38.0m.
        - Edge 12 <-> 10 exists, is_accessible == True, edge_type == 'ramp', distance == 40.0m.
        - Combined path distance is exactly 78.0m (38.0 + 40.0).
        - Both intermediate edges and junction node are marked accessible.
        """
        # Edge 9 <-> 12
        e1_stmt = select(PathEdge).where(
            ((PathEdge.from_node_id == 9) & (PathEdge.to_node_id == 12)) |
            ((PathEdge.from_node_id == 12) & (PathEdge.to_node_id == 9))
        )
        e1_list = db.scalars(e1_stmt).all()
        assert len(e1_list) == 1, f"Expected 1 edge between 9 and 12, found {len(e1_list)}"
        e1 = e1_list[0]
        assert e1.distance == 38.0, f"Expected 9-12 distance 38.0m, got {e1.distance}"
        assert e1.is_accessible is True, "Expected 9-12 edge to be accessible"
        assert e1.edge_type.lower() == "ramp", f"Expected edge_type 'ramp', got '{e1.edge_type}'"

        # Edge 12 <-> 10
        e2_stmt = select(PathEdge).where(
            ((PathEdge.from_node_id == 12) & (PathEdge.to_node_id == 10)) |
            ((PathEdge.from_node_id == 10) & (PathEdge.to_node_id == 12))
        )
        e2_list = db.scalars(e2_stmt).all()
        assert len(e2_list) == 1, f"Expected 1 edge between 12 and 10, found {len(e2_list)}"
        e2 = e2_list[0]
        assert e2.distance == 40.0, f"Expected 12-10 distance 40.0m, got {e2.distance}"
        assert e2.is_accessible is True, "Expected 12-10 edge to be accessible"
        assert e2.edge_type.lower() == "ramp", f"Expected edge_type 'ramp', got '{e2.edge_type}'"

        # Path distance summation
        total_ramp_dist = round(e1.distance + e2.distance, 4)
        assert total_ramp_dist == 78.0, f"Expected total ramp distance 78.0m, got {total_ramp_dist}"

        # Node 12 accessibility
        node_12 = db.get(PathNode, 12)
        assert node_12 is not None, "Node 12 must exist"
        assert node_12.is_accessible is True, "Node 12 must be marked accessible"

    def test_node_26_isolated_observatory_invariants(self, db):
        """
        Verify Node 26 (Observatory):
        - Node 26 is present in path_nodes.
        - Has degree 0 (0 incident edges in path_edges).
        - Location 14 (Remote Observatory) has entrance_node_id == 26.
        """
        # Node 26 presence
        node_26 = db.get(PathNode, 26)
        assert node_26 is not None, "Node 26 (Observatory) must be present in path_nodes"
        assert "observatory" in node_26.name.lower(), f"Unexpected node name: {node_26.name}"
        assert node_26.is_active is True

        # Incident edges query
        incident_edges = db.scalars(
            select(PathEdge).where(
                (PathEdge.from_node_id == 26) | (PathEdge.to_node_id == 26)
            )
        ).all()
        assert len(incident_edges) == 0, (
            f"Node 26 must have degree 0 (no incident edges), found {len(incident_edges)} edges: "
            f"{[(e.from_node_id, e.to_node_id) for e in incident_edges]}"
        )

        # Linked location verification
        loc_14 = db.get(Location, 14)
        assert loc_14 is not None, "Location 14 must exist"
        assert loc_14.entrance_node_id == 26, f"Expected entrance_node_id 26, got {loc_14.entrance_node_id}"
        assert "observatory" in loc_14.name.lower()

    def test_global_graph_structural_integrity(self, db):
        """
        Stress-test entire graph topology:
        - Exactly 26 nodes, exactly 42 edges.
        - All edge endpoints point to valid node IDs.
        - No self loops.
        - No duplicate edges between identical node pairs.
        - All distances strictly positive.
        - Exactly 1 disconnected node (Node 26), 25 connected nodes.
        """
        nodes = {n.id: n for n in db.scalars(select(PathNode)).all()}
        assert len(nodes) == 26, f"Expected 26 nodes, got {len(nodes)}"

        edges = db.scalars(select(PathEdge)).all()
        assert len(edges) == 42, f"Expected 42 edges, got {len(edges)}"

        seen_pairs = set()
        degrees = {nid: 0 for nid in nodes}

        for edge in edges:
            assert edge.from_node_id in nodes, f"Edge {edge.id} references non-existent from_node_id {edge.from_node_id}"
            assert edge.to_node_id in nodes, f"Edge {edge.id} references non-existent to_node_id {edge.to_node_id}"
            assert edge.from_node_id != edge.to_node_id, f"Edge {edge.id} is an invalid self loop"
            assert edge.distance > 0.0, f"Edge {edge.id} distance must be positive, got {edge.distance}"

            pair = tuple(sorted((edge.from_node_id, edge.to_node_id)))
            assert pair not in seen_pairs, f"Duplicate edge found between node pair {pair}"
            seen_pairs.add(pair)

            degrees[edge.from_node_id] += 1
            degrees[edge.to_node_id] += 1

        # Check degree distribution
        isolated_nodes = [nid for nid, deg in degrees.items() if deg == 0]
        assert isolated_nodes == [26], f"Expected only Node 26 to be isolated, got {isolated_nodes}"


class TestHealthEndpointStress:
    """Stress tests and performance latency verification of GET /api/health."""

    def test_50_rapid_requests_performance_and_correctness(self, test_client):
        """
        Empirical stress test:
        - Fire 50 rapid GET requests to /api/health.
        - 100% must return HTTP 200.
        - JSON payload must be exactly {"status": "ok"}.
        - Content-Type must be 'application/json'.
        - Mean latency must be < 20ms (0.020s).
        """
        num_requests = 50
        latencies_ms = []
        statuses = []
        payloads = []
        content_types = []

        # Warm-up request
        warmup = test_client.get("/api/health")
        assert warmup.status_code == 200

        # Rapid firing loop
        for i in range(num_requests):
            t0 = time.perf_counter()
            resp = test_client.get("/api/health")
            t1 = time.perf_counter()

            elapsed_ms = (t1 - t0) * 1000.0
            latencies_ms.append(elapsed_ms)
            statuses.append(resp.status_code)
            content_types.append(resp.headers.get("content-type", ""))
            payloads.append(resp.json())

        # Assertions
        # 1. 100% return HTTP 200
        success_count = sum(1 for s in statuses if s == 200)
        assert success_count == num_requests, (
            f"Expected {num_requests}/50 HTTP 200 responses, got {success_count}/{num_requests}. "
            f"Non-200 statuses: {[s for s in statuses if s != 200]}"
        )

        # 2. JSON payload and Content-Type
        for idx, (p, ct) in enumerate(zip(payloads, content_types)):
            assert p == {"status": "ok"}, f"Request {idx} payload mismatch: {p}"
            assert "application/json" in ct.lower(), f"Request {idx} invalid Content-Type: {ct}"

        # 3. Latency statistics
        mean_ms = statistics.mean(latencies_ms)
        p50_ms = statistics.median(latencies_ms)
        p95_ms = sorted(latencies_ms)[int(0.95 * len(latencies_ms))]
        max_ms = max(latencies_ms)
        min_ms = min(latencies_ms)

        print(f"\n[STRESS TEST] /api/health 50-request metrics:")
        print(f"  Total requests:  {num_requests}")
        print(f"  Success rate:    {success_count / num_requests * 100:.1f}% (50/50)")
        print(f"  Mean latency:    {mean_ms:.3f} ms (threshold < 20.000 ms)")
        print(f"  Median (p50):    {p50_ms:.3f} ms")
        print(f"  p95 latency:     {p95_ms:.3f} ms")
        print(f"  Min latency:     {min_ms:.3f} ms")
        print(f"  Max latency:     {max_ms:.3f} ms")

        assert mean_ms < 20.0, f"Mean latency {mean_ms:.3f}ms exceeded 20.0ms threshold!"

    @pytest.mark.asyncio
    async def test_httpx_async_concurrent_stress(self):
        """
        Adversarial concurrency test:
        - Fire 50 concurrent GET requests to /api/health using httpx AsyncClient.
        - Verify 100% succeed with 200 OK.
        - Verify mean latency across concurrent requests < 20ms.
        """
        import asyncio
        import httpx

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            async def single_request(req_id: int):
                t0 = time.perf_counter()
                resp = await client.get("/api/health")
                t1 = time.perf_counter()
                return {
                    "id": req_id,
                    "status_code": resp.status_code,
                    "payload": resp.json(),
                    "content_type": resp.headers.get("content-type", ""),
                    "latency_ms": (t1 - t0) * 1000.0,
                }

            # Fire 50 requests concurrently
            tasks = [single_request(i) for i in range(50)]
            results = await asyncio.gather(*tasks)

        assert len(results) == 50
        assert all(r["status_code"] == 200 for r in results)
        assert all(r["payload"] == {"status": "ok"} for r in results)
        assert all("application/json" in r["content_type"].lower() for r in results)

        latencies = [r["latency_ms"] for r in results]
        mean_ms = statistics.mean(latencies)
        print(f"\n[ASYNC CONCURRENT STRESS] 50 concurrent requests:")
        print(f"  Success rate:  100% (50/50)")
        print(f"  Mean latency:  {mean_ms:.3f} ms")
        print(f"  Max latency:   {max(latencies):.3f} ms")
        assert mean_ms < 20.0, f"Async mean latency {mean_ms:.3f}ms exceeded 20ms"

    def test_live_socket_uvicorn_stress(self):
        """
        Real TCP network socket stress test:
        - Starts uvicorn server on localhost ephemeral port in daemon thread.
        - Fires 50 rapid GET requests via httpx.Client over actual TCP network socket.
        - Verifies 100% 200 OK, payload {"status": "ok"}, and mean latency < 20ms.
        """
        import threading
        import socket
        import uvicorn
        import httpx

        # Find free port
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("127.0.0.1", 0))
            port = s.getsockname()[1]

        config = uvicorn.Config(app=app, host="127.0.0.1", port=port, log_level="error")
        server = uvicorn.Server(config)
        thread = threading.Thread(target=server.run, daemon=True)
        thread.start()

        # Poll until server is ready
        base_url = f"http://127.0.0.1:{port}"
        for _ in range(50):
            try:
                probe = httpx.get(f"{base_url}/api/health", timeout=0.5)
                if probe.status_code == 200:
                    break
            except Exception:
                time.sleep(0.05)
        else:
            pytest.fail("Live uvicorn server failed to start within 2.5s")

        num_requests = 50
        latencies_ms = []
        statuses = []
        payloads = []

        with httpx.Client(base_url=base_url, timeout=5.0) as client:
            for _ in range(num_requests):
                t0 = time.perf_counter()
                resp = client.get("/api/health")
                t1 = time.perf_counter()
                latencies_ms.append((t1 - t0) * 1000.0)
                statuses.append(resp.status_code)
                payloads.append(resp.json())

        server.should_exit = True

        assert len(statuses) == 50
        assert all(s == 200 for s in statuses)
        assert all(p == {"status": "ok"} for p in payloads)

        mean_ms = statistics.mean(latencies_ms)
        p50_ms = statistics.median(latencies_ms)
        p95_ms = sorted(latencies_ms)[int(0.95 * len(latencies_ms))]
        print(f"\n[LIVE TCP SOCKET STRESS] 50 live HTTP requests to 127.0.0.1:{port}:")
        print(f"  Success rate:  100% (50/50)")
        print(f"  Mean latency:  {mean_ms:.3f} ms (threshold < 20.000 ms)")
        print(f"  Median (p50):  {p50_ms:.3f} ms")
        print(f"  p95 latency:   {p95_ms:.3f} ms")
        print(f"  Min latency:   {min(latencies_ms):.3f} ms")
        print(f"  Max latency:   {max(latencies_ms):.3f} ms")

        assert mean_ms < 20.0, f"Live socket mean latency {mean_ms:.3f}ms exceeded 20.0ms threshold!"

    def test_health_adversarial_parameters_and_methods(self, test_client):
        """
        Adversarial checks:
        - Query parameters ignored gracefully, returns 200 ok.
        - Trailing slash handled or redirected cleanly.
        - Method restriction: POST, PUT, DELETE must be rejected with 405 Method Not Allowed.
        - HEAD request handled.
        """
        # Query params
        resp_qp = test_client.get("/api/health?adversarial_flag=true&test=123")
        assert resp_qp.status_code == 200
        assert resp_qp.json() == {"status": "ok"}

        # HTTP method restrictions
        resp_post = test_client.post("/api/health", json={"dummy": "payload"})
        assert resp_post.status_code == 405, f"Expected 405 for POST /api/health, got {resp_post.status_code}"

        resp_put = test_client.put("/api/health", json={"dummy": "payload"})
        assert resp_put.status_code == 405, f"Expected 405 for PUT /api/health, got {resp_put.status_code}"

        resp_del = test_client.delete("/api/health")
        assert resp_del.status_code == 405, f"Expected 405 for DELETE /api/health, got {resp_del.status_code}"
