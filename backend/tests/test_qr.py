"""Unit tests for Milestone 3 QR code resolution, PNG image generation, and PDF poster services."""

import io
from PIL import Image


def test_qr_lookup_by_numeric_id(client):
    """GET /api/qr/{id} resolves location by integer ID."""
    response = client.get("/api/qr/1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["name"] == "Main Administrative Complex"
    assert "entrance_node_id" in data


def test_qr_lookup_by_token(client):
    """GET /api/qr/{token} resolves location by unique QR identifier string."""
    loc_res = client.get("/api/locations/1")
    assert loc_res.status_code == 200
    loc_data = loc_res.json()
    qr_id = loc_data.get("qr_identifier")
    if qr_id:
        response = client.get(f"/api/qr/{qr_id}")
        assert response.status_code == 200
        assert response.json()["id"] == 1


def test_qr_lookup_prefixed_format(client):
    """GET /api/qr/LOC-0001 or loc-1 resolves correctly."""
    response = client.get("/api/qr/LOC-0001")
    assert response.status_code == 200
    assert response.json()["id"] == 1


def test_qr_lookup_nonexistent_returns_404(client):
    """GET /api/qr/{token} returns 404 for unknown identifier."""
    response = client.get("/api/qr/nonexistent-token-xyz-12345")
    assert response.status_code == 404


def test_qr_image_stream_valid_png(client):
    """GET /api/qr/{id}/image streams a valid PNG binary with correct headers."""
    response = client.get("/api/qr/1/image")
    assert response.status_code == 200
    assert "image/png" in response.headers.get("content-type", "")
    content = response.content
    assert content.startswith(b"\x89PNG\r\n\x1a\n")

    # Verify PNG parses cleanly with PIL
    img = Image.open(io.BytesIO(content))
    assert img.format == "PNG"
    assert img.size[0] > 0 and img.size[1] > 0


def test_qr_image_custom_query_params(client):
    """GET /api/qr/{id}/image honors box_size and border parameters."""
    response = client.get("/api/qr/1/image?box_size=5&border=2")
    assert response.status_code == 200
    assert "image/png" in response.headers.get("content-type", "")
    img = Image.open(io.BytesIO(response.content))
    assert img.format == "PNG"


def test_qr_image_nonexistent_returns_404(client):
    """GET /api/qr/{id}/image returns 404 for nonexistent location."""
    response = client.get("/api/qr/999999/image")
    assert response.status_code == 404


def test_qr_poster_pdf_stream_valid_pdf(client):
    """GET /api/qr/{id}/poster streams a valid printable signage PDF."""
    response = client.get("/api/qr/1/poster")
    assert response.status_code == 200
    assert "application/pdf" in response.headers.get("content-type", "")
    assert response.content.startswith(b"%PDF")
    assert len(response.content) > 1000


def test_qr_poster_page_sizes_and_download_flag(client):
    """GET /api/qr/{id}/poster supports letter/a4 and download parameter."""
    res_a4 = client.get("/api/qr/1/poster?page_size=a4")
    assert res_a4.status_code == 200
    assert res_a4.content.startswith(b"%PDF")

    res_dl = client.get("/api/qr/1/poster?download=true")
    assert res_dl.status_code == 200
    disp = res_dl.headers.get("content-disposition", "")
    assert "attachment" in disp


def test_qr_poster_nonexistent_returns_404(client):
    """GET /api/qr/{id}/poster returns 404 for nonexistent location."""
    response = client.get("/api/qr/999999/poster")
    assert response.status_code == 404
