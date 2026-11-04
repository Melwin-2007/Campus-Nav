"""Unit tests for Milestone 3 Public APIs: Categories, Locations, Details, and Search."""

import pytest
from app.api.locations import evaluate_is_open, remove_accents


def test_remove_accents_helper():
    """Verify remove_accents helper correctly normalizes accented unicode strings."""
    assert remove_accents("café") == "cafe"
    assert remove_accents("crème brûlée") == "creme brulee"
    assert remove_accents("Zürich") == "Zurich"
    assert remove_accents("Standard Text") == "Standard Text"


def test_evaluate_is_open_helper():
    """Verify evaluate_is_open correctly handles various opening hours formats."""
    assert evaluate_is_open("24 Hours") is True
    assert evaluate_is_open("24/7 Access") is True
    assert evaluate_is_open("Always Open") is True
    assert evaluate_is_open("Closed for maintenance") is False
    assert evaluate_is_open("By appointment only") is False
    assert evaluate_is_open("") is None
    assert evaluate_is_open(None) is None
    # Standard format 00:00 - 23:59 should be currently open
    assert evaluate_is_open("00:00 - 23:59") is True


def test_categories_list_api(client):
    """GET /api/categories returns HTTP 200, valid schema, and aggregated location_count."""
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 12

    for cat in data:
        assert "id" in cat
        assert "name" in cat
        assert "slug" in cat
        assert "icon" in cat
        assert "color" in cat
        assert cat["color"].startswith("#")
        assert "location_count" in cat
        assert isinstance(cat["location_count"], int)
        assert cat["location_count"] >= 0


def test_locations_list_api(client):
    """GET /api/locations returns active POIs with joined category and entrance_node."""
    response = client.get("/api/locations")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 12

    for loc in data:
        assert "id" in loc
        assert "name" in loc
        assert "latitude" in loc
        assert "longitude" in loc
        assert "category_id" in loc
        assert "category" in loc
        if loc["category"]:
            assert "name" in loc["category"]
            assert "color" in loc["category"]


def test_locations_filter_by_category_id(client):
    """GET /api/locations?category_id={id} filters correctly."""
    cats_res = client.get("/api/categories")
    assert cats_res.status_code == 200
    cats = cats_res.json()
    cat_id = cats[0]["id"]

    response = client.get(f"/api/locations?category_id={cat_id}")
    assert response.status_code == 200
    locations = response.json()
    for loc in locations:
        assert loc["category_id"] == cat_id


def test_locations_filter_by_category_slug(client):
    """GET /api/locations?category={slug} filters correctly."""
    response = client.get("/api/locations?category=academic-buildings")
    assert response.status_code == 200
    locations = response.json()
    for loc in locations:
        if loc.get("category"):
            assert loc["category"]["slug"] == "academic-buildings"


def test_locations_search_route_precedence(client):
    """Ensure GET /api/locations/search is not matched as location ID 'search'."""
    response = client.get("/api/locations/search?q=Library")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_locations_search_exact_and_partial(client):
    """GET /api/locations/search finds matches by exact name and prefix."""
    res1 = client.get("/api/locations/search?q=Central Campus Library")
    assert res1.status_code == 200
    names1 = [l["name"] for l in res1.json()]
    assert any("Central Campus Library" in n for n in names1)

    res2 = client.get("/api/locations/search?q=Robo")
    assert res2.status_code == 200
    names2 = [l["name"] for l in res2.json()]
    assert any("Advanced Robotics Lab" in n for n in names2)


def test_locations_search_department_and_casing(client):
    """GET /api/locations/search matches department case-insensitively."""
    res = client.get("/api/locations/search?q=cOmPuTeR EnGiNeErInG")
    assert res.status_code == 200
    results = res.json()
    assert len(results) > 0
    assert any("Turing" in l["name"] for l in results)


def test_locations_search_accents_and_emojis(client):
    """GET /api/locations/search normalizes accents and handles unicode symbols."""
    # Café matches Canteen & Cafeteria
    res_cafe = client.get("/api/locations/search?q=café")
    assert res_cafe.status_code == 200
    assert any("Cafeteria" in l["name"] or "Canteen" in l["name"] for l in res_cafe.json())

    # Emoji + text
    res_emoji = client.get("/api/locations/search?q=🏛️ Library")
    assert res_emoji.status_code == 200
    assert any("Library" in l["name"] for l in res_emoji.json())


def test_locations_search_empty_and_whitespace(client):
    """GET /api/locations/search returns empty list on empty or whitespace queries."""
    assert client.get("/api/locations/search?q=").json() == []
    assert client.get("/api/locations/search?q=   ").json() == []
    assert client.get("/api/locations/search?q=%20%20%20").json() == []


def test_locations_search_injection_safety(client):
    """GET /api/locations/search handles SQL injection and XSS payloads cleanly."""
    res_sqli = client.get("/api/locations/search?q=' OR '1'='1' --")
    assert res_sqli.status_code == 200
    assert len(res_sqli.json()) < 14

    res_xss = client.get("/api/locations/search?q=<script>alert('xss')</script>")
    assert res_xss.status_code == 200
    assert res_xss.json() == []


def test_location_detail_by_id_success(client):
    """GET /api/locations/{id} returns detailed metadata with is_open status."""
    response = client.get("/api/locations/1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["name"] == "Main Administrative Complex"
    assert "entrance_node_id" in data
    assert "is_open" in data


def test_location_detail_not_found(client):
    """GET /api/locations/{id} returns 404 for nonexistent ID."""
    response = client.get("/api/locations/999999")
    assert response.status_code == 404
    assert "not found" in response.json().get("detail", "").lower()
