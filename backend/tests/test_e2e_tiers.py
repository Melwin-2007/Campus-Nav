"""Unified Master Test Suite Aggregating Tiers 1–4 for Campus Navigator.

Provides full-system verification across:
- Tier 1: Feature Coverage (Health, Categories, Locations, Search, Routing, Snapping, Accessibility, Admin Auth, QR)
- Tier 2: Boundary & Corner Cases (Disconnected, GPS >300m, Empty search, Unicode, Same start/dest, Negative distances, Invalid tokens)
- Tier 3: Cross-Feature Combinations (Pairwise workflows)
- Tier 4: Real-World Scenarios (End-to-End User Journeys)
"""

import sys
import os

try:
    import pytest
except ModuleNotFoundError:
    try:
        from backend.tests.conftest import pytest
    except ModuleNotFoundError:
        from tests.conftest import pytest

# Ensure import paths
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(backend_dir)
for p in [project_root, backend_dir, current_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.tests.test_tier1_features import (
        TestHealthFeature,
        TestCategoriesFeature,
        TestLocationsFeature,
        TestSearchFeature,
        TestRoutingFeature,
        TestCoordinateSnappingFeature,
        TestAccessibilityFeature,
        TestAdminAuthFeature,
        TestQRCodeFeature,
    )
    from backend.tests.test_tier2_boundaries import (
        TestDisconnectedNodesBoundary,
        TestGPSOutsideBoundary,
        TestSearchQueryBoundaries,
        TestUnicodeAndCasingBoundary,
        TestSameStartAndDestinationBoundary,
        TestNegativeDistancesAndGeometryBoundary,
        TestAuthenticationManipulationBoundary,
    )
    from backend.tests.test_tier3_combinations import (
        TestCrossFeatureCombinations,
    )
    from backend.tests.test_tier4_scenarios import (
        TestRealWorldApplicationScenarios,
    )
except ModuleNotFoundError:
    from tests.test_tier1_features import (
        TestHealthFeature,
        TestCategoriesFeature,
        TestLocationsFeature,
        TestSearchFeature,
        TestRoutingFeature,
        TestCoordinateSnappingFeature,
        TestAccessibilityFeature,
        TestAdminAuthFeature,
        TestQRCodeFeature,
    )
    from tests.test_tier2_boundaries import (
        TestDisconnectedNodesBoundary,
        TestGPSOutsideBoundary,
        TestSearchQueryBoundaries,
        TestUnicodeAndCasingBoundary,
        TestSameStartAndDestinationBoundary,
        TestNegativeDistancesAndGeometryBoundary,
        TestAuthenticationManipulationBoundary,
    )
    from tests.test_tier3_combinations import (
        TestCrossFeatureCombinations,
    )
    from tests.test_tier4_scenarios import (
        TestRealWorldApplicationScenarios,
    )


@pytest.mark.e2e
def test_e2e_suite_inventory_audit(campus_seed_inventory):
    """Audits the test inventory to confirm all required features and boundaries are represented."""
    assert len(campus_seed_inventory["canonical_categories"]) == 12
    assert len(campus_seed_inventory["locations"]) >= 14
    assert campus_seed_inventory["critical_nodes"]["disconnected_observatory"] == 26
    assert campus_seed_inventory["routing_benchmarks"]["max_snapping_radius_m"] == 300.0
