"""Unit tests for Milestone 3 Admin subsystem: Auth, Dashboard, CRUD, Photo Upload, Health Check, Export."""

import io
import time
import jwt
import pytest


def test_admin_login_success(client, admin_credentials):
    """POST /api/admin/login with correct credentials returns JWT token."""
    response = client.post("/api/admin/login", json=admin_credentials)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_admin_login_invalid_password(client):
    """POST /api/admin/login with bad password returns 401."""
    response = client.post("/api/admin/login", json={"username": "admin", "password": "wrongpassword"})
    assert response.status_code == 401
    assert "WWW-Authenticate" in response.headers


def test_admin_login_nonexistent_user(client):
    """POST /api/admin/login with nonexistent user returns 401."""
    response = client.post("/api/admin/login", json={"username": "ghost_admin_999", "password": "password"})
    assert response.status_code == 401


def test_auth_dependency_missing_header(client):
    """Protected admin endpoint without Authorization header returns 401."""
    response = client.get("/api/admin/stats")
    assert response.status_code == 401
    assert "WWW-Authenticate" in response.headers


def test_auth_dependency_invalid_scheme(client):
    """Protected admin endpoint with Basic auth scheme returns 401."""
    headers = {"Authorization": "Basic YWRtaW46YWRtaW4xMjM="}
    response = client.get("/api/admin/stats", headers=headers)
    assert response.status_code == 401


def test_auth_dependency_expired_token(client):
    """Protected admin endpoint with expired token returns 401."""
    expired_token = jwt.encode(
        {"sub": "admin", "exp": int(time.time()) - 3600},
        "campus-navigator-super-secret-key-change-in-production-2026",
        algorithm="HS256"
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/api/admin/stats", headers=headers)
    assert response.status_code == 401


def test_auth_dependency_tampered_token(client):
    """Protected admin endpoint with invalid signature returns 401."""
    forged_token = jwt.encode(
        {"sub": "admin", "exp": int(time.time()) + 3600},
        "wrong-secret-key",
        algorithm="HS256"
    )
    headers = {"Authorization": f"Bearer {forged_token}"}
    response = client.get("/api/admin/stats", headers=headers)
    assert response.status_code == 401


def test_auth_dependency_missing_sub(client):
    """Protected admin endpoint with token missing 'sub' claim returns 401."""
    no_sub_token = jwt.encode(
        {"role": "admin", "exp": int(time.time()) + 3600},
        "campus-navigator-super-secret-key-change-in-production-2026",
        algorithm="HS256"
    )
    headers = {"Authorization": f"Bearer {no_sub_token}"}
    response = client.get("/api/admin/stats", headers=headers)
    assert response.status_code == 401


def test_admin_dashboard_stats(client, admin_auth_headers):
    """GET /api/admin/stats and /api/admin/dashboard/stats return comprehensive counts."""
    res1 = client.get("/api/admin/stats", headers=admin_auth_headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert "total_locations" in data1
    assert "total_categories" in data1
    assert "total_nodes" in data1
    assert "total_edges" in data1
    assert "total_qr_codes" in data1
    assert "total_issues" in data1
    assert "health_status" in data1

    res2 = client.get("/api/admin/dashboard/stats", headers=admin_auth_headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["total_locations"] == data1["total_locations"]


def test_admin_location_crud_cycle(client, admin_auth_headers):
    """Create, read, update, and delete a location via Admin API."""
    # 1. Create
    loc_payload = {
        "name": "Admin Test Research Hub",
        "category_id": 1,
        "description": "Dedicated testing laboratory.",
        "department": "Engineering Department",
        "latitude": 15.880762,
        "longitude": 74.519112,
        "entrance_node_id": 1,
        "opening_hours": "08:00 - 20:00",
        "facilities": ["Wi-Fi", "Accessible Restroom"],
        "is_active": True,
    }
    create_res = client.post("/api/admin/locations", json=loc_payload, headers=admin_auth_headers)
    assert create_res.status_code == 201
    created_loc = create_res.json()
    loc_id = created_loc["id"]
    assert loc_id > 0
    assert created_loc["name"] == "Admin Test Research Hub"
    assert created_loc.get("qr_identifier") is not None

    # Verify auto-created QR resolves
    qr_res = client.get(f"/api/qr/{loc_id}")
    assert qr_res.status_code == 200

    # 2. Update
    update_payload = {"name": "Admin Test Research Hub (Updated)", "opening_hours": "24 Hours"}
    update_res = client.put(f"/api/admin/locations/{loc_id}", json=update_payload, headers=admin_auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Admin Test Research Hub (Updated)"

    # 3. Delete
    delete_res = client.delete(f"/api/admin/locations/{loc_id}", headers=admin_auth_headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["status"] == "deleted"

    # Confirm 404 after deletion
    assert client.get(f"/api/locations/{loc_id}").status_code == 404
    assert client.get(f"/api/qr/{loc_id}").status_code == 404


def test_admin_location_create_invalid_category(client, admin_auth_headers):
    """POST /api/admin/locations with invalid category_id returns 400."""
    payload = {
        "name": "Invalid Category Loc",
        "category_id": 99999,
        "latitude": 15.880662,
        "longitude": 74.518912,
    }
    response = client.post("/api/admin/locations", json=payload, headers=admin_auth_headers)
    assert response.status_code == 400


def test_admin_photo_upload_success_and_validations(client, admin_auth_headers):
    """POST /api/admin/locations/{id}/photo validates MIME type, size, and saves file."""
    # Create temp location
    loc_payload = {
        "name": "Photo Test Building",
        "category_id": 1,
        "latitude": 15.881162,
        "longitude": 74.519412,
    }
    loc_id = client.post("/api/admin/locations", json=loc_payload, headers=admin_auth_headers).json()["id"]

    try:
        # Valid PNG upload
        fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        files = {"file": ("test.png", io.BytesIO(fake_png), "image/png")}
        upload_res = client.post(f"/api/admin/locations/{loc_id}/photo", files=files, headers=admin_auth_headers)
        assert upload_res.status_code == 200
        data = upload_res.json()
        assert data["status"] == "success"
        assert "/static/uploads/" in data["photo_url"]

        # Confirm photo_url updated in location model
        loc_res = client.get(f"/api/locations/{loc_id}")
        assert loc_res.status_code == 200
        assert loc_res.json()["photo_url"] == data["photo_url"]

        # Invalid MIME type rejected
        txt_files = {"file": ("notes.txt", io.BytesIO(b"just text"), "text/plain")}
        bad_mime_res = client.post(f"/api/admin/locations/{loc_id}/photo", files=txt_files, headers=admin_auth_headers)
        assert bad_mime_res.status_code == 400

        # Empty file rejected
        empty_files = {"file": ("empty.png", io.BytesIO(b""), "image/png")}
        empty_res = client.post(f"/api/admin/locations/{loc_id}/photo", files=empty_files, headers=admin_auth_headers)
        assert empty_res.status_code == 400

    finally:
        client.delete(f"/api/admin/locations/{loc_id}", headers=admin_auth_headers)


def test_admin_nodes_crud_cycle(client, admin_auth_headers):
    """Admin node creation, coordinates validation, and cascading deletion."""
    # 1. Invalid coordinates rejected (HTTP 422)
    bad_payload = {"name": "Invalid Node", "latitude": 95.0, "longitude": 74.519312, "floor": 0}
    assert client.post("/api/admin/nodes", json=bad_payload, headers=admin_auth_headers).status_code == 422

    # 2. Valid create
    valid_payload = {
        "name": "Admin Unit Test Node",
        "latitude": 15.880562,
        "longitude": 74.519312,
        "floor": 0,
        "node_type": "junction",
        "is_accessible": True,
        "is_active": True,
    }
    create_res = client.post("/api/admin/nodes", json=valid_payload, headers=admin_auth_headers)
    assert create_res.status_code == 201
    node_id = create_res.json()["id"]

    # 3. List
    list_res = client.get("/api/admin/nodes", headers=admin_auth_headers)
    assert list_res.status_code == 200
    assert any(n["id"] == node_id for n in list_res.json())

    # 4. Delete
    del_res = client.delete(f"/api/admin/nodes/{node_id}", headers=admin_auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"


def test_admin_edges_crud_and_validations(client, admin_auth_headers):
    """Admin edge creation with self-loop, negative distance, and foreign key validations."""
    # 1. Self-loop rejected (HTTP 422)
    self_loop = {"from_node_id": 1, "to_node_id": 1, "distance": 10.0, "edge_type": "footpath"}
    assert client.post("/api/admin/edges", json=self_loop, headers=admin_auth_headers).status_code == 422

    # 2. Negative distance rejected (HTTP 422)
    neg_dist = {"from_node_id": 1, "to_node_id": 2, "distance": -5.0, "edge_type": "footpath"}
    assert client.post("/api/admin/edges", json=neg_dist, headers=admin_auth_headers).status_code == 422

    # 3. Nonexistent endpoint rejected (HTTP 404)
    missing_node = {"from_node_id": 1, "to_node_id": 999999, "distance": 10.0, "edge_type": "footpath"}
    assert client.post("/api/admin/edges", json=missing_node, headers=admin_auth_headers).status_code in [404, 422]

    # 4. Valid edge create and delete
    valid_edge = {"from_node_id": 1, "to_node_id": 3, "distance": 25.0, "edge_type": "footpath"}
    create_res = client.post("/api/admin/edges", json=valid_edge, headers=admin_auth_headers)
    assert create_res.status_code == 201
    edge_id = create_res.json()["id"]

    del_res = client.delete(f"/api/admin/edges/{edge_id}", headers=admin_auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"


def test_admin_health_check_auditor(client, admin_auth_headers):
    """GET /api/admin/health-check audits graph topology and returns issue report."""
    response = client.get("/api/admin/health-check", headers=admin_auth_headers)
    assert response.status_code == 200
    report = response.json()
    assert "status" in report
    assert "total_issues" in report
    assert "isolated_nodes" in report
    assert "locations_missing_entrance" in report
    assert "suspect_edges" in report
    assert "orphaned_qr_codes" in report
    assert "summary" in report


def test_admin_export_streams(client, admin_auth_headers):
    """GET /api/admin/export/{entity} returns CSV or JSON streaming responses."""
    # CSV export
    csv_res = client.get("/api/admin/export/locations?format=csv", headers=admin_auth_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "id,name,category_id" in csv_res.text

    # JSON export
    json_res = client.get("/api/admin/export/nodes?format=json", headers=admin_auth_headers)
    assert json_res.status_code == 200
    assert "application/json" in json_res.headers.get("content-type", "")

    # Invalid entity
    bad_res = client.get("/api/admin/export/nonexistent_table", headers=admin_auth_headers)
    assert bad_res.status_code == 400
