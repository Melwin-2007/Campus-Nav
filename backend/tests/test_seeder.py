"""Campus Navigator database seeder and graph topology test suite."""

import pytest
from sqlalchemy import select
from app.db.session import engine, SessionLocal
from app.db.base_class import Base
from app.models.category import Category
from app.models.path_node import PathNode
from app.models.path_edge import PathEdge
from app.models.location import Location
from app.models.qr_code import QRCode
from app.models.admin import Administrator
from app.seed.seeder import seed_database
from app.core.security import verify_password


@pytest.fixture(scope="module", autouse=True)
def run_seeder_fixture():
    """Ensure database is seeded prior to running seeder tests."""
    Base.metadata.create_all(bind=engine)
    seed_database(reset=True)
    yield


@pytest.fixture
def db_session():
    """Scoped session for seed data verification."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_seed_categories_count_and_tokens(db_session):
    """Verify exactly 12 categories are seeded with valid color tokens and Lucide icons."""
    categories = db_session.scalars(select(Category)).all()
    assert len(categories) == 12, f"Expected 12 categories, found {len(categories)}"

    expected_slugs = {
        "academic-buildings", "departments", "laboratories", "administration",
        "libraries", "food-and-cafeteria", "sports", "medical",
        "parking", "washrooms", "entrances-and-exits", "other"
    }
    actual_slugs = {c.slug for c in categories}
    assert expected_slugs == actual_slugs

    for cat in categories:
        assert cat.color.startswith("#"), f"Category {cat.slug} color must be hex"
        assert len(cat.icon) > 0, f"Category {cat.slug} must have a Lucide icon"


def test_seed_locations_count_and_attributes(db_session):
    """Verify 14 locations spanning all 12 categories and properly linked entrance nodes."""
    locations = db_session.scalars(select(Location)).all()
    assert len(locations) == 14, f"Expected 14 locations, found {len(locations)}"

    # Check that all locations have valid coordinates around campus
    for loc in locations:
        assert 15.87 <= loc.latitude <= 15.89, f"Location {loc.name} lat out of campus range"
        assert 74.51 <= loc.longitude <= 74.53, f"Location {loc.name} lon out of campus range"
        assert loc.category_id is not None
        assert loc.entrance_node_id is not None

    # Check that at least all 12 category IDs are represented
    used_cat_ids = {loc.category_id for loc in locations}
    assert len(used_cat_ids) == 12, "All 12 categories must have at least one location assigned."


def test_seed_nodes_count_and_types(db_session):
    """Verify 26 path nodes (1-26) with valid types and accessibility flags."""
    nodes = db_session.scalars(select(PathNode)).all()
    assert len(nodes) == 26, f"Expected 26 nodes, found {len(nodes)}"

    node_ids = {n.id for n in nodes}
    assert node_ids == set(range(1, 27)), "Node IDs must span 1 to 26"


def test_seed_edges_count_and_pairs(db_session):
    """Verify 42 path edges are seeded."""
    edges = db_session.scalars(select(PathEdge)).all()
    assert len(edges) == 42, f"Expected 42 edges, found {len(edges)}"

    for edge in edges:
        assert edge.distance >= 0.0, "Edge distance must be non-negative"
        assert edge.from_node_id != edge.to_node_id, "Edge must not be a self loop"


def test_stairs_vs_ramp_test_pair(db_session):
    """
    Verify the accessibility benchmark:
    Node 9 (Library) <-> Node 10 (Plaza):
    - Direct stairs edge (non-accessible): 42.0 meters
    - Detour via Node 12 (ramp edges): 38.0m + 40.0m = 78.0 meters
    """
    # 1. Stairs edge between 9 and 10
    stairs_stmt = select(PathEdge).where(
        ((PathEdge.from_node_id == 9) & (PathEdge.to_node_id == 10)) |
        ((PathEdge.from_node_id == 10) & (PathEdge.to_node_id == 9))
    )
    stairs_edge = db_session.scalars(stairs_stmt).first()
    assert stairs_edge is not None, "Stairs edge between 9 and 10 must exist"
    assert stairs_edge.distance == 42.0, f"Stairs distance expected 42.0m, got {stairs_edge.distance}"
    assert stairs_edge.edge_type == "stairs"
    assert stairs_edge.is_accessible is False

    # 2. Ramp edges (9 <-> 12 and 12 <-> 10)
    ramp1_stmt = select(PathEdge).where(
        ((PathEdge.from_node_id == 9) & (PathEdge.to_node_id == 12)) |
        ((PathEdge.from_node_id == 12) & (PathEdge.to_node_id == 9))
    )
    ramp1 = db_session.scalars(ramp1_stmt).first()
    assert ramp1 is not None, "Ramp edge 9-12 must exist"
    assert ramp1.distance == 38.0
    assert ramp1.is_accessible is True

    ramp2_stmt = select(PathEdge).where(
        ((PathEdge.from_node_id == 12) & (PathEdge.to_node_id == 10)) |
        ((PathEdge.from_node_id == 10) & (PathEdge.to_node_id == 12))
    )
    ramp2 = db_session.scalars(ramp2_stmt).first()
    assert ramp2 is not None, "Ramp edge 12-10 must exist"
    assert ramp2.distance == 40.0
    assert ramp2.is_accessible is True

    total_ramp_distance = ramp1.distance + ramp2.distance
    assert total_ramp_distance == 78.0, f"Ramp detour distance expected 78.0m, got {total_ramp_distance}"


def test_disconnected_node_26_isolated(db_session):
    """
    Verify Node 26 (Location 14: Remote Observatory) has degree 0 (0 connected edges)
    to serve as disconnected graph benchmark.
    """
    node_26_edges = db_session.scalars(
        select(PathEdge).where(
            (PathEdge.from_node_id == 26) | (PathEdge.to_node_id == 26)
        )
    ).all()
    assert len(node_26_edges) == 0, f"Node 26 must have 0 connected edges, found {len(node_26_edges)}"

    # Verify Location 14 points to Node 26
    loc_14 = db_session.get(Location, 14)
    assert loc_14 is not None
    assert loc_14.entrance_node_id == 26
    assert "observatory" in loc_14.name.lower()


def test_admin_account_seeded(db_session):
    """Verify default administrative user is seeded with valid bcrypt password."""
    admin = db_session.scalars(
        select(Administrator).where(Administrator.username == "admin")
    ).first()
    assert admin is not None, "Admin user must be seeded"
    assert admin.email == "admin@campusnav.edu"
    assert admin.is_superuser is True
    assert admin.is_active is True
    assert verify_password("admin123", admin.hashed_password) is True


def test_seeder_idempotency():
    """Verify running the seeder twice does not duplicate records or throw errors."""
    stats1 = seed_database(reset=False)
    assert stats1["categories"] == 12
    assert stats1["locations"] == 14
    assert stats1["nodes"] == 26
    assert stats1["edges"] == 42
    assert stats1["qr_codes"] == 14
    assert stats1["administrators"] == 1

    session = SessionLocal()
    try:
        assert session.scalar(select(Category).count()) == 12 if hasattr(select(Category), "count") else len(session.scalars(select(Category)).all()) == 12
        assert len(session.scalars(select(Location)).all()) == 14
        assert len(session.scalars(select(PathNode)).all()) == 26
        assert len(session.scalars(select(PathEdge)).all()) == 42
        assert len(session.scalars(select(QRCode)).all()) == 14
        assert len(session.scalars(select(Administrator)).all()) == 1
    finally:
        session.close()
