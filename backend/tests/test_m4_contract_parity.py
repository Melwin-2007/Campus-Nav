"""Adversarial contract verification test for Milestone 4 frontend-backend parity."""

import pytest
from app.schemas.location import LocationOut
from app.schemas.admin import DataHealthReport


def test_qr_endpoint_contract_structure(client):
    """
    Verify GET /api/qr/{identifier} response schema.
    FastAPI returns LocationOut directly, NOT an object with a 'location' property.
    This empirically confirms why QRScannerModal's 'if (qrResult.location)' fails.
    """
    res = client.get("/api/qr/1")
    assert res.status_code == 200
    data = res.json()

    # The payload is the location itself:
    assert "id" in data
    assert "name" in data
    assert "latitude" in data
    assert "longitude" in data

    # There is NO nested 'location' key:
    assert "location" not in data, "FastAPI response does NOT have a 'location' wrapper key!"


def test_admin_health_endpoint_contract_discrepancy(client):
    """
    Verify /api/admin/health vs /api/admin/health-check.
    api.ts line 197 calls GET /admin/health, but the backend router defines /health-check.
    """
    # 1. Calling /api/admin/health (as in frontend api.ts) returns 404 Not Found
    res_front = client.get("/api/admin/health")
    assert res_front.status_code in [404, 401], f"GET /api/admin/health returned {res_front.status_code}"

    # 2. Even when authenticated, /api/admin/health is 404 Not Found
    login_res = client.post("/api/admin/login", json={"username": "admin", "password": "admin123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res_auth_health = client.get("/api/admin/health", headers=headers)
    assert res_auth_health.status_code == 404, (
        f"Expected 404 for /api/admin/health because backend router registers /health-check. Got {res_auth_health.status_code}"
    )

    # 3. The actual registered endpoint is /api/admin/health-check
    res_actual = client.get("/api/admin/health-check", headers=headers)
    assert res_actual.status_code == 200
    health_data = res_actual.json()
    assert "status" in health_data
    assert "total_issues" in health_data


def test_root_health_endpoint_response_fields(client):
    """
    Verify GET /api/health returns {'status': 'ok'} without 'timestamp'.
    Frontend api.ts types it as Promise<{ status: string; timestamp: string }>.
    """
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "timestamp" not in data, "Backend /api/health does not supply 'timestamp'"
