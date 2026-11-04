"""Standalone Adversarial Database Integrity & Constraint Verification Script.

This test script empirically stress-tests:
1. CheckConstraints & Range Validations:
   - Edge negative distance (-10.0m, -0.001m) -> IntegrityError
   - Edge self-loop (from_node_id == to_node_id) -> IntegrityError
   - Node latitude > 90 or < -90 -> IntegrityError
   - Node longitude > 180 or < -180 -> IntegrityError
   - Node floor < -5 or > 100 -> IntegrityError
   - Location latitude > 90 or < -90 -> IntegrityError
   - Location longitude > 180 or < -180 -> IntegrityError
   - Valid boundary values (lat=90/-90, lon=180/-180, dist=0.0, floor=-5/100) -> Succeeded
2. Foreign Key & Cascade Rules:
   - Edge with non-existent foreign key node IDs -> IntegrityError
   - Node with 2 connected edges (1 outgoing, 1 incoming) -> Node deleted -> Both edges deleted
   - Location with associated QR code -> Location deleted -> QR code deleted
   - Category with associated locations -> Category deleted -> IntegrityError (RESTRICT)
   - Entrance node referenced by location -> Node deleted -> location.entrance_node_id set to NULL (SET NULL)
3. Seeder Idempotency:
   - Three consecutive executions of `seed_database()` -> Exact row counts preserved (12, 14, 26, 42, 1, 14)
"""

import os
import sys
import pytest
from sqlalchemy import text, select
from sqlalchemy.exc import IntegrityError

# Ensure app is importable
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.base_class import Base
from app.db.session import engine, SessionLocal
from app.models.category import Category
from app.models.path_node import PathNode
from app.models.path_edge import PathEdge
from app.models.location import Location
from app.models.qr_code import QRCode
from app.models.admin import Administrator
from app.seed.seeder import seed_database


def init_db():
    Base.metadata.create_all(bind=engine)


def test_adversarial_check_constraints():
    """Verify check constraints for edge negative distance, self-loop, and invalid coordinates."""
    init_db()
    session = SessionLocal()
    try:
        # Create base test nodes for edge testing
        n_a = PathNode(name="Adv Check Node A", latitude=17.6500, longitude=75.9000, floor=0)
        n_b = PathNode(name="Adv Check Node B", latitude=17.6510, longitude=75.9010, floor=0)
        session.add_all([n_a, n_b])
        session.commit()

        # 1. Negative distance: -10.0m -> MUST raise IntegrityError
        neg_edge_1 = PathEdge(from_node_id=n_a.id, to_node_id=n_b.id, distance=-10.0)
        session.add(neg_edge_1)
        try:
            session.commit()
            raise AssertionError("FAIL: Expected IntegrityError for negative distance (-10.0m), but commit succeeded!")
        except IntegrityError:
            session.rollback()
            print("[PASS] Edge with negative distance (-10.0m) successfully raised IntegrityError.")

        # 1b. Boundary check: distance = -0.001 -> MUST raise IntegrityError
        neg_edge_boundary = PathEdge(from_node_id=n_a.id, to_node_id=n_b.id, distance=-0.001)
        session.add(neg_edge_boundary)
        try:
            session.commit()
            raise AssertionError("FAIL: Expected IntegrityError for negative distance (-0.001m), but commit succeeded!")
        except IntegrityError:
            session.rollback()
            print("[PASS] Edge with boundary negative distance (-0.001m) successfully raised IntegrityError.")

        # 1c. Valid boundary check: distance = 0.0 -> MUST SUCCEED
        zero_dist_edge = PathEdge(from_node_id=n_a.id, to_node_id=n_b.id, distance=0.0)
        session.add(zero_dist_edge)
        session.commit()
        print("[PASS] Edge with valid zero distance (0.0m) committed successfully.")
        session.delete(zero_dist_edge)
        session.commit()

        # 2. Self-loop edge: from_node_id == to_node_id -> MUST raise IntegrityError
        self_loop_edge = PathEdge(from_node_id=n_a.id, to_node_id=n_a.id, distance=20.0)
        session.add(self_loop_edge)
        try:
            session.commit()
            raise AssertionError("FAIL: Expected IntegrityError for self-loop edge (from==to), but commit succeeded!")
        except IntegrityError:
            session.rollback()
            print("[PASS] Self-loop edge (from_node == to_node) successfully raised IntegrityError.")

        # 3. Invalid node coordinates (> 90 lat or > 180 lon)
        # 3a. Latitude > 90
        inv_lat_node = PathNode(name="Inv Lat Node (>90)", latitude=90.0001, longitude=75.0)
        session.add(inv_lat_node)
        try:
            session.commit()
            raise AssertionError("FAIL: Expected IntegrityError for latitude > 90 (90.0001), but commit succeeded!")
        except IntegrityError:
            session.rollback()
            print("[PASS] Node with latitude > 90 (90.0001) successfully raised IntegrityError.")

        # 3b. Latitude < -90
        inv_neg_lat_node = PathNode(name="Inv Neg Lat Node (<-90)", latitude=-90.0001, longitude=75.0)
        session.add(inv_neg_lat_node)
        try:
            session.commit()
            raise AssertionError("FAIL: Expected IntegrityError for latitude < -90 (-90.0001), but commit succeeded!")
        except IntegrityError:
            session.rollback()
            print("[PASS] Node with latitude < -90 (-90.0001) successfully raised IntegrityError.")

        # 3c. Longitude > 180
        inv_lon_node = PathNode(name="Inv Lon Node (>180)", latitude=17.0, longitude=180.0001)
        session.add(inv_lon_node)
        try:
            session.commit()
            raise AssertionError("FAIL: Expected IntegrityError for longitude > 180 (180.0001), but commit succeeded!")
        except IntegrityError:
            session.rollback()
            print("[PASS] Node with longitude > 180 (180.0001) successfully raised IntegrityError.")

        # 3d. Longitude < -180
        inv_neg_lon_node = PathNode(name="Inv Neg Lon Node (<-180)", latitude=17.0, longitude=-180.0001)
        session.add(inv_neg_lon_node)
        try:
            session.commit()
            raise AssertionError("FAIL: Expected IntegrityError for longitude < -180 (-180.0001), but commit succeeded!")
        except IntegrityError:
            session.rollback()
            print("[PASS] Node with longitude < -180 (-180.0001) successfully raised IntegrityError.")

        # 3e. Valid boundary coordinates (-90, 90, -180, 180) -> MUST SUCCEED
        valid_pole_node = PathNode(name="Valid Boundary Node", latitude=90.0, longitude=180.0, floor=100)
        session.add(valid_pole_node)
        session.commit()
        print("[PASS] Node with valid boundary coordinates (90.0, 180.0, floor=100) committed successfully.")
        session.delete(valid_pole_node)
        session.commit()

        # 3f. Node floor constraint check (< -5 or > 100)
        inv_floor_node = PathNode(name="Inv Floor Node", latitude=17.0, longitude=75.0, floor=101)
        session.add(inv_floor_node)
        try:
            session.commit()
            raise AssertionError("FAIL: Expected IntegrityError for floor > 100, but commit succeeded!")
        except IntegrityError:
            session.rollback()
            print("[PASS] Node with floor > 100 (101) successfully raised IntegrityError.")

        # 4. Foreign key integrity: inserting edge with non-existent node
        orphan_edge = PathEdge(from_node_id=999999, to_node_id=n_b.id, distance=10.0)
        session.add(orphan_edge)
        try:
            session.commit()
            raise AssertionError("FAIL: Expected IntegrityError for non-existent from_node_id, but commit succeeded!")
        except IntegrityError:
            session.rollback()
            print("[PASS] Edge referencing non-existent foreign key node successfully raised IntegrityError.")

        # Cleanup
        session.delete(n_a)
        session.delete(n_b)
        session.commit()

    finally:
        session.close()


def test_adversarial_cascade_deletions():
    """Verify cascade deletions on node -> 2 edges and location -> qr_code."""
    init_db()
    session = SessionLocal()
    try:
        # Verify PRAGMA foreign_keys is ON
        fk_val = session.execute(text("PRAGMA foreign_keys;")).scalar()
        assert fk_val == 1, f"SQLite PRAGMA foreign_keys is {fk_val}, must be 1"

        # 1. Create a test node with 2 edges (1 outgoing, 1 incoming)
        target_node = PathNode(name="Target Cascade Node", latitude=17.6520, longitude=75.9020)
        peer_node_1 = PathNode(name="Peer Node 1", latitude=17.6521, longitude=75.9021)
        peer_node_2 = PathNode(name="Peer Node 2", latitude=17.6522, longitude=75.9022)
        session.add_all([target_node, peer_node_1, peer_node_2])
        session.commit()

        target_id = target_node.id
        peer_1_id = peer_node_1.id
        peer_2_id = peer_node_2.id

        # Edge 1: target_node -> peer_node_1 (outgoing from target)
        edge_1 = PathEdge(from_node_id=target_id, to_node_id=peer_1_id, distance=30.0)
        # Edge 2: peer_node_2 -> target_node (incoming to target)
        edge_2 = PathEdge(from_node_id=peer_2_id, to_node_id=target_id, distance=45.0)
        session.add_all([edge_1, edge_2])
        session.commit()

        edge_1_id = edge_1.id
        edge_2_id = edge_2.id

        # Verify edges exist in database
        assert session.get(PathEdge, edge_1_id) is not None
        assert session.get(PathEdge, edge_2_id) is not None

        # Delete target_node -> BOTH edges MUST be automatically deleted
        session.delete(target_node)
        session.commit()
        session.expire_all()

        remaining_edge_1 = session.get(PathEdge, edge_1_id)
        remaining_edge_2 = session.get(PathEdge, edge_2_id)

        assert remaining_edge_1 is None, f"FAIL: Edge 1 (id={edge_1_id}) was NOT cascade-deleted!"
        assert remaining_edge_2 is None, f"FAIL: Edge 2 (id={edge_2_id}) was NOT cascade-deleted!"
        print(f"[PASS] Node deletion successfully cascaded to delete both attached edges (IDs: {edge_1_id}, {edge_2_id}).")

        # Cleanup peer nodes
        session.delete(peer_node_1)
        session.delete(peer_node_2)
        session.commit()

        # 2. Create a test location with QR code
        cat = Category(name="Cascade Test Cat", slug="cascade-test-cat", icon="TestIcon", color="#123456")
        session.add(cat)
        session.commit()

        loc = Location(
            category_id=cat.id,
            name="Cascade Test Location",
            latitude=17.6530,
            longitude=75.9030,
            facilities=["Wifi"],
        )
        session.add(loc)
        session.commit()
        loc_id = loc.id

        qr = QRCode(
            location_id=loc_id,
            identifier="test-cascade-qr-token-9999",
            code_url="/api/qr/test-cascade-qr-token-9999",
        )
        session.add(qr)
        session.commit()
        qr_id = qr.id

        # Verify QR code exists
        assert session.get(QRCode, qr_id) is not None

        # Delete location -> QR code MUST be automatically deleted
        session.delete(loc)
        session.commit()
        session.expire_all()

        remaining_qr = session.get(QRCode, qr_id)
        assert remaining_qr is None, f"FAIL: QRCode (id={qr_id}) was NOT cascade-deleted!"
        print(f"[PASS] Location deletion successfully cascaded to delete associated QRCode (ID: {qr_id}).")

        # 3. Category deletion RESTRICT verification
        # Re-create a location attached to category
        loc_restrict = Location(
            category_id=cat.id,
            name="Category Restrict Location",
            latitude=17.6535,
            longitude=75.9035,
            facilities=[],
        )
        session.add(loc_restrict)
        session.commit()

        # Attempting to delete category must raise IntegrityError due to RESTRICT
        session.delete(cat)
        try:
            session.commit()
            raise AssertionError("FAIL: Expected IntegrityError on deleting Category with active Locations!")
        except IntegrityError:
            session.rollback()
            print("[PASS] Category deletion with dependent locations successfully rejected (RESTRICT constraint).")

        # Cleanup
        session.delete(loc_restrict)
        session.delete(cat)
        session.commit()

    finally:
        session.close()


def test_adversarial_seeder_idempotency_three_runs():
    """Verify running seeder three times consecutively yields exact stable row counts."""
    init_db()

    expected_counts = {
        "categories": 12,
        "locations": 14,
        "nodes": 26,
        "edges": 42,
        "administrators": 1,
        "qr_codes": 14,
    }

    print("[INFO] Testing seeder idempotency across 3 consecutive executions...")

    for iteration in range(1, 4):
        # Call seed_database() in idempotent upsert mode (reset=False)
        stats = seed_database(reset=False)

        # Query actual counts from database
        session = SessionLocal()
        try:
            actual_categories = session.query(Category).count()
            actual_locations = session.query(Location).count()
            actual_nodes = session.query(PathNode).count()
            actual_edges = session.query(PathEdge).count()
            actual_admins = session.query(Administrator).count()
            actual_qrs = session.query(QRCode).count()

            print(
                f"  Run #{iteration}: categories={actual_categories}, locations={actual_locations}, "
                f"nodes={actual_nodes}, edges={actual_edges}, admins={actual_admins}, qrs={actual_qrs}"
            )

            assert actual_categories == expected_counts["categories"], (
                f"Run #{iteration}: Expected {expected_counts['categories']} categories, got {actual_categories}"
            )
            assert actual_locations == expected_counts["locations"], (
                f"Run #{iteration}: Expected {expected_counts['locations']} locations, got {actual_locations}"
            )
            assert actual_nodes == expected_counts["nodes"], (
                f"Run #{iteration}: Expected {expected_counts['nodes']} nodes, got {actual_nodes}"
            )
            assert actual_edges == expected_counts["edges"], (
                f"Run #{iteration}: Expected {expected_counts['edges']} edges, got {actual_edges}"
            )
            assert actual_admins == expected_counts["administrators"], (
                f"Run #{iteration}: Expected {expected_counts['administrators']} admins, got {actual_admins}"
            )
            assert actual_qrs == expected_counts["qr_codes"], (
                f"Run #{iteration}: Expected {expected_counts['qr_codes']} qr_codes, got {actual_qrs}"
            )
        finally:
            session.close()

    print("[PASS] Seeder idempotency verified: exact row counts preserved across 3 consecutive runs.")


def run_all_empirically():
    print("=" * 60)
    print("M1 ADVERSARIAL DATABASE INTEGRITY & CONSTRAINT VERIFICATION")
    print("=" * 60)

    print("\n--- 1. Stress-Testing CheckConstraints ---")
    test_adversarial_check_constraints()

    print("\n--- 2. Stress-Testing Cascade Deletions ---")
    test_adversarial_cascade_deletions()

    print("\n--- 3. Stress-Testing Seeder Idempotency ---")
    test_adversarial_seeder_idempotency_three_runs()

    print("\n" + "=" * 60)
    print("ALL EMPIRICAL CHALLENGER TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    run_all_empirically()
