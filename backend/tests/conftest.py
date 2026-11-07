"""Global Test Configuration and Shared Fixtures for Campus Navigator E2E Suites."""

import os
import sys
import time
from typing import Generator, Dict, Any, Optional

try:
    import pytest
except ModuleNotFoundError:
    class _MockPytest:
        @staticmethod
        def fixture(*args, **kwargs):
            def decorator(func):
                return func
            return decorator
        class mark:
            @staticmethod
            def tier1(func): return func
            @staticmethod
            def tier2(func): return func
            @staticmethod
            def tier3(func): return func
            @staticmethod
            def tier4(func): return func
            @staticmethod
            def e2e(func): return func
            @staticmethod
            def parametrize(*args, **kwargs):
                def decorator(func): return func
                return decorator
    pytest = _MockPytest()

import httpx

# Ensure backend root is on python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(backend_dir)
for p in [project_root, backend_dir, current_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)


class ResilientTestClient:
    """Unified client wrapping either FastAPI TestClient or live HTTPX Client."""

    def __init__(self, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url.rstrip("/")
        self._inner_client = None
        self._is_live = False
        self._server_available = True

        # Attempt to import in-process FastAPI application
        try:
            from app.main import app
            from starlette.testclient import TestClient
            self._inner_client = TestClient(app, base_url="http://testserver")
            self._is_live = False
            self._server_available = True
            return
        except Exception:
            pass

        # Check live server with short 1.0s timeout
        try:
            self._inner_client = httpx.Client(base_url=self.base_url, timeout=5.0)
            self._is_live = True
            probe = self._inner_client.get("/api/health", timeout=1.0)
            self._server_available = True
        except Exception:
            self._server_available = False

    def get(self, url: str, **kwargs) -> httpx.Response:
        if not self._server_available and self._is_live:
            return httpx.Response(status_code=503, json={"detail": "Target server offline"})
        try:
            return self._inner_client.get(url, **kwargs)
        except Exception as e:
            return httpx.Response(status_code=503, json={"detail": f"Service unavailable: {str(e)}"})

    def post(self, url: str, **kwargs) -> httpx.Response:
        if not self._server_available and self._is_live:
            return httpx.Response(status_code=503, json={"detail": "Target server offline"})
        try:
            return self._inner_client.post(url, **kwargs)
        except Exception as e:
            return httpx.Response(status_code=503, json={"detail": f"Service unavailable: {str(e)}"})

    def put(self, url: str, **kwargs) -> httpx.Response:
        if not self._server_available and self._is_live:
            return httpx.Response(status_code=503, json={"detail": "Target server offline"})
        try:
            return self._inner_client.put(url, **kwargs)
        except Exception as e:
            return httpx.Response(status_code=503, json={"detail": f"Service unavailable: {str(e)}"})

    def delete(self, url: str, **kwargs) -> httpx.Response:
        if not self._server_available and self._is_live:
            return httpx.Response(status_code=503, json={"detail": "Target server offline"})
        try:
            return self._inner_client.delete(url, **kwargs)
        except Exception as e:
            return httpx.Response(status_code=503, json={"detail": f"Service unavailable: {str(e)}"})

    def head(self, url: str, **kwargs) -> httpx.Response:
        if not self._server_available and self._is_live:
            return httpx.Response(status_code=503, json={"detail": "Target server offline"})
        try:
            return self._inner_client.head(url, **kwargs)
        except Exception as e:
            return httpx.Response(status_code=503, json={"detail": f"Service unavailable: {str(e)}"})

    def close(self):
        if hasattr(self._inner_client, "close"):
            self._inner_client.close()


@pytest.fixture(scope="session")
def client() -> Generator[ResilientTestClient, None, None]:
    """Provides an active HTTP test client for test suites."""
    target_url = os.getenv("CAMPUS_NAV_TEST_URL", "http://127.0.0.1:8000")
    test_client = ResilientTestClient(base_url=target_url)
    try:
        yield test_client
    finally:
        test_client.close()


@pytest.fixture(scope="session")
def admin_credentials() -> Dict[str, str]:
    """Default administrative credentials defined in system specifications."""
    return {
        "username": os.getenv("ADMIN_DEFAULT_USERNAME", "admin"),
        "password": os.getenv("ADMIN_DEFAULT_PASSWORD", "admin123"),
    }


@pytest.fixture(scope="session")
def admin_auth_headers(client: ResilientTestClient, admin_credentials: Dict[str, str]) -> Dict[str, str]:
    """Generates valid Bearer authentication headers for protected admin endpoints."""
    # Attempt login via standard endpoint
    try:
        response = client.post("/api/admin/login", json=admin_credentials)
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            return {"Authorization": f"Bearer {token}"}
    except Exception:
        pass

    # Dynamic fallback token generation using PyJWT
    try:
        import jwt
        secret_key = os.getenv("SECRET_KEY", "campus-navigator-super-secret-key-change-in-production-2026")
        algorithm = os.getenv("ALGORITHM", "HS256")
        payload = {
            "sub": admin_credentials["username"],
            "exp": int(time.time()) + 3600,
            "role": "admin",
            "is_superuser": True
        }
        token = jwt.encode(payload, secret_key, algorithm=algorithm)
        return {"Authorization": f"Bearer {token}"}
    except Exception:
        return {"Authorization": "Bearer mock-admin-token"}


@pytest.fixture(scope="session")
def campus_seed_inventory() -> Dict[str, Any]:
    """Authoritative inventory of seeded campus entities and topological benchmarks."""
    return {
        "center": {"lat": 15.880562, "lon": 74.519312},
        "bounds": {
            "min_lat": 15.8750, "max_lat": 15.8860,
            "min_lon": 74.5130, "max_lon": 74.5260
        },
        "canonical_categories": [
            "Academic Buildings", "Departments", "Laboratories", "Administration",
            "Libraries", "Food and Cafeteria", "Sports", "Medical",
            "Parking", "Washrooms", "Entrances and Exits", "Other"
        ],
        "locations": {
            1: {"name": "Main Administrative Complex", "node_id": 1, "cat": "Administration"},
            2: {"name": "Sir CV Raman Science Block", "node_id": 3, "cat": "Academic Buildings"},
            3: {"name": "Turing Computer Science Dept", "node_id": 5, "cat": "Departments"},
            4: {"name": "Advanced Robotics Lab", "node_id": 7, "cat": "Laboratories"},
            5: {"name": "Central Campus Library", "node_id": 9, "cat": "Libraries"},
            6: {"name": "Garden Canteen & Cafeteria", "node_id": 11, "cat": "Food and Cafeteria"},
            7: {"name": "Campus Sports Arena", "node_id": 13, "cat": "Sports"},
            8: {"name": "University Health Center", "node_id": 15, "cat": "Medical"},
            9: {"name": "North Campus Parking", "node_id": 17, "cat": "Parking"},
            10: {"name": "Central Student Restrooms", "node_id": 19, "cat": "Washrooms"},
            11: {"name": "University Main Gate", "node_id": 21, "cat": "Entrances and Exits"},
            12: {"name": "Campus ATM & Utility Center", "node_id": 23, "cat": "Other"},
            13: {"name": "East Gate Security Post", "node_id": 25, "cat": "Entrances and Exits"},
            14: {"name": "Remote Observatory", "node_id": 26, "cat": "Academic Buildings", "disconnected": True}
        },
        "critical_nodes": {
            "main_gate": 21,
            "admin_complex": 1,
            "science_block": 3,
            "cs_dept": 5,
            "library": 9,
            "plaza": 10,
            "cafeteria": 11,
            "ramp_junction": 12,
            "sports": 13,
            "health_center": 15,
            "parking": 17,
            "restroom": 19,
            "disconnected_observatory": 26
        },
        "routing_benchmarks": {
            "library_to_plaza_stairs_dist": 42.0,
            "library_to_plaza_ramp_dist": 78.0,
            "max_snapping_radius_m": 300.0,
            "nominal_walking_speed_mps": 1.3,
            "accessible_walking_speed_mps": 1.0
        }
    }
