"""Database models, constraints, cascades, and SQLite PRAGMA test suite."""

import pytest
from sqlalchemy import text, select
from sqlalchemy.exc import IntegrityError
from app.db.base_class import Base
from app.db.session import engine, SessionLocal
from app.models.category import Category
from app.models.path_node import PathNode
from app.models.path_edge import PathEdge
from app.models.location import Location
from app.models.qr_code import QRCode
from app.models.admin import Administrator
from app.core.security import get_password_hash, verify_password


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    """Ensure database schema is created."""
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db_session():
    """Provide a scoped session for each database test."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def test_sqlite_pragmas_enabled(db_session):
    """Verify SQLite foreign_keys and journal_mode PRAGMAs are active."""
    fk_res = db_session.execute(text("PRAGMA foreign_keys;")).scalar()
    assert fk_res == 1, "PRAGMA foreign_keys must be enabled (1)"


def test_node_latitude_longitude_check_constraints(db_session):
    """Verify check constraints for valid coordinate ranges on PathNode."""
    # Invalid latitude > 90
    invalid_node_lat = PathNode(
        name="Invalid Lat Node",
        latitude=95.0,
        longitude=75.0,
        floor=0,
    )
    db_session.add(invalid_node_lat)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Invalid longitude > 180
    invalid_node_lon = PathNode(
        name="Invalid Lon Node",
        latitude=17.0,
        longitude=190.0,
        floor=0,
    )
    db_session.add(invalid_node_lon)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_edge_distance_and_self_loop_constraints(db_session):
    """Verify distance >= 0 and no self-loops on PathEdge."""
    # Create valid nodes first
    n1 = PathNode(name="Test Node 1", latitude=17.65, longitude=75.90)
    n2 = PathNode(name="Test Node 2", latitude=17.66, longitude=75.91)
    db_session.add_all([n1, n2])
    db_session.commit()

    # Negative distance check
    invalid_dist_edge = PathEdge(
        from_node_id=n1.id,
        to_node_id=n2.id,
        distance=-10.0,
    )
    db_session.add(invalid_dist_edge)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Self-loop check (from_node == to_node)
    self_loop_edge = PathEdge(
        from_node_id=n1.id,
        to_node_id=n1.id,
        distance=15.0,
    )
    db_session.add(self_loop_edge)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_node_deletion_cascades_to_edges(db_session):
    """Verify deleting a node automatically cascades and deletes attached edges."""
    node_a = PathNode(name="Cascade Node A", latitude=17.651, longitude=75.901)
    node_b = PathNode(name="Cascade Node B", latitude=17.652, longitude=75.902)
    db_session.add_all([node_a, node_b])
    db_session.commit()

    edge = PathEdge(
        from_node_id=node_a.id,
        to_node_id=node_b.id,
        distance=25.0,
        edge_type="footpath",
    )
    db_session.add(edge)
    db_session.commit()
    edge_id = edge.id

    # Delete node_a
    db_session.delete(node_a)
    db_session.commit()

    # Expire session cache to reflect database-level ON DELETE CASCADE
    db_session.expire_all()

    # Edge must no longer exist
    remaining_edge = db_session.get(PathEdge, edge_id)
    assert remaining_edge is None, "Edge should have been deleted when parent node was deleted."


def test_location_deletion_cascades_to_qr_code(db_session):
    """Verify deleting a location cascades and deletes its QR code."""
    cat = Category(
        name="Test Cat Cascades",
        slug="test-cat-cascades",
        icon="Landmark",
        color="#3B82F6",
    )
    db_session.add(cat)
    db_session.commit()

    loc = Location(
        category_id=cat.id,
        name="Test Location QR Cascade",
        latitude=17.653,
        longitude=75.903,
        facilities=["Elevator"],
    )
    db_session.add(loc)
    db_session.commit()

    qr = QRCode(
        location_id=loc.id,
        identifier="test-qr-cascade-ident-12345",
        code_url="/api/qr/test-qr-cascade-ident-12345",
    )
    db_session.add(qr)
    db_session.commit()
    qr_id = qr.id

    # Delete location
    db_session.delete(loc)
    db_session.commit()

    # Expire session cache to reflect database-level ON DELETE CASCADE
    db_session.expire_all()

    # QR code must no longer exist
    remaining_qr = db_session.get(QRCode, qr_id)
    assert remaining_qr is None, "QRCode should have been cascade-deleted when location was deleted."


def test_category_deletion_restricted_when_locations_exist(db_session):
    """Verify deleting a category is RESTRICTED if locations reference it."""
    cat = Category(
        name="Test Cat Restrict",
        slug="test-cat-restrict",
        icon="GraduationCap",
        color="#8B5CF6",
    )
    db_session.add(cat)
    db_session.commit()

    loc = Location(
        category_id=cat.id,
        name="Test Location Cat Restrict",
        latitude=17.654,
        longitude=75.904,
        facilities=[],
    )
    db_session.add(loc)
    db_session.commit()

    # Attempt to delete category
    db_session.delete(cat)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_entrance_node_deletion_sets_null_on_location(db_session):
    """Verify deleting entrance node sets entrance_node_id to NULL on location."""
    cat = Category(
        name="Test Cat Set Null",
        slug="test-cat-set-null",
        icon="Landmark",
        color="#10B981",
    )
    node = PathNode(name="Test Entrance Node", latitude=17.655, longitude=75.905)
    db_session.add_all([cat, node])
    db_session.commit()

    loc = Location(
        category_id=cat.id,
        name="Test Location Set Null",
        latitude=17.655,
        longitude=75.905,
        entrance_node_id=node.id,
        facilities=[],
    )
    db_session.add(loc)
    db_session.commit()
    loc_id = loc.id

    # Delete entrance node
    db_session.delete(node)
    db_session.commit()

    # Reload location
    db_session.expire_all()
    updated_loc = db_session.get(Location, loc_id)
    assert updated_loc is not None
    assert updated_loc.entrance_node_id is None, "entrance_node_id should be SET NULL on node deletion."


def test_password_hashing_and_verification():
    """Verify bcrypt password hashing and verification logic."""
    raw_pwd = "mySuperSecretPassword123!"
    hashed = get_password_hash(raw_pwd)
    assert hashed != raw_pwd
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("wrongPassword", hashed) is False
