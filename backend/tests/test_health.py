"""Health endpoint verification tests."""

import pytest


@pytest.mark.tier1
def test_api_health_returns_200_and_ok(client):
    """
    Requirement AC: GET /api/health returns HTTP 200 with status ok.
    """
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data == {"status": "ok"}
    assert data["status"] == "ok"


def test_root_endpoint_operational(client):
    """
    Verify root endpoint responds with operational message and docs reference.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "operational" in data["message"].lower()


def test_root_health_alias(client):
    """
    Verify /health alias responds with HTTP 200 and status ok.
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
