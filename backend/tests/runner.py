"""Standalone CLI Test Runner and Diagnostic Reporter for Campus Navigator.

Usage:
    python backend/tests/runner.py [--tier 1|2|3|4|all] [--url http://127.0.0.1:8000]
"""

import sys
import os
import argparse
import inspect
import time
from typing import List, Tuple, Callable

# Ensure both project root and backend dir are in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(backend_dir)

for p in [project_root, backend_dir, current_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.tests.conftest import ResilientTestClient, campus_seed_inventory
    from backend.tests import test_tier1_features, test_tier2_boundaries, test_tier3_combinations, test_tier4_scenarios
except ModuleNotFoundError:
    from tests.conftest import ResilientTestClient, campus_seed_inventory
    from tests import test_tier1_features, test_tier2_boundaries, test_tier3_combinations, test_tier4_scenarios


def run_test_class(test_cls, client_instance, seed_info, admin_headers) -> List[Tuple[str, bool, str, float]]:
    """Runs all test methods of a test class and captures timing and assertions."""
    results = []
    instance = test_cls()
    test_methods = [m for m in dir(instance) if m.startswith("test_")]

    for name in test_methods:
        method = getattr(instance, name)
        sig = inspect.signature(method)
        kwargs = {}
        if "client" in sig.parameters:
            kwargs["client"] = client_instance
        if "campus_seed_inventory" in sig.parameters:
            kwargs["campus_seed_inventory"] = seed_info
        if "admin_credentials" in sig.parameters:
            kwargs["admin_credentials"] = {"username": "admin", "password": "admin123"}
        if "admin_auth_headers" in sig.parameters:
            kwargs["admin_auth_headers"] = admin_headers

        start = time.time()
        try:
            method(**kwargs)
            elapsed = time.time() - start
            results.append((f"{test_cls.__name__}.{name}", True, "PASSED", elapsed))
        except AssertionError as e:
            elapsed = time.time() - start
            results.append((f"{test_cls.__name__}.{name}", False, f"ASSERTION FAILED: {str(e)}", elapsed))
        except Exception as e:
            elapsed = time.time() - start
            results.append((f"{test_cls.__name__}.{name}", False, f"ERROR: {str(e)}", elapsed))

    return results


def main():
    parser = argparse.ArgumentParser(description="Campus Navigator E2E Test Suite Runner")
    parser.add_argument("--tier", choices=["1", "2", "3", "4", "all"], default="all", help="Target test tier")
    parser.add_argument("--url", default=os.getenv("CAMPUS_NAV_TEST_URL", "http://127.0.0.1:8000"), help="Base test URL")
    args = parser.parse_args()

    print("=" * 80)
    print("CAMPUS NAVIGATOR — AUTOMATED E2E TEST SUITE RUNNER")
    print(f"Target URL: {args.url}")
    print(f"Target Tier: {args.tier.upper()}")
    print("=" * 80)

    client = ResilientTestClient(base_url=args.url)
    seed_info = campus_seed_inventory()
    
    # Check server availability
    server_reachable = False
    try:
        health_res = client.get("/api/health")
        if health_res.status_code == 200:
            server_reachable = True
            print("[INFO] Target backend server is REACHABLE and responsive.")
        else:
            print(f"[WARN] Health check returned HTTP {health_res.status_code}.")
    except Exception as e:
        print(f"[WARN] Unable to reach backend server: {e}")
        print("[INFO] Running in test validation / structure audit mode.")

    # Generate admin headers
    admin_headers = {"Authorization": "Bearer mock-admin-token"}
    if server_reachable:
        try:
            login_res = client.post("/api/admin/login", json={"username": "admin", "password": "admin123"})
            if login_res.status_code == 200:
                token = login_res.json().get("access_token")
                admin_headers = {"Authorization": f"Bearer {token}"}
        except Exception:
            pass

    # Collect test classes
    classes_to_run = []

    if args.tier in ["1", "all"]:
        classes_to_run.extend([
            test_tier1_features.TestHealthFeature,
            test_tier1_features.TestCategoriesFeature,
            test_tier1_features.TestLocationsFeature,
            test_tier1_features.TestSearchFeature,
            test_tier1_features.TestRoutingFeature,
            test_tier1_features.TestCoordinateSnappingFeature,
            test_tier1_features.TestAccessibilityFeature,
            test_tier1_features.TestAdminAuthFeature,
            test_tier1_features.TestQRCodeFeature,
        ])

    if args.tier in ["2", "all"]:
        classes_to_run.extend([
            test_tier2_boundaries.TestDisconnectedNodesBoundary,
            test_tier2_boundaries.TestGPSOutsideBoundary,
            test_tier2_boundaries.TestSearchQueryBoundaries,
            test_tier2_boundaries.TestUnicodeAndCasingBoundary,
            test_tier2_boundaries.TestSameStartAndDestinationBoundary,
            test_tier2_boundaries.TestNegativeDistancesAndGeometryBoundary,
            test_tier2_boundaries.TestAuthenticationManipulationBoundary,
        ])

    if args.tier in ["3", "all"]:
        classes_to_run.extend([
            test_tier3_combinations.TestCrossFeatureCombinations,
        ])

    if args.tier in ["4", "all"]:
        classes_to_run.extend([
            test_tier4_scenarios.TestRealWorldApplicationScenarios,
        ])

    total_executed = 0
    total_passed = 0
    total_failed = 0
    all_results = []

    print(f"\nDiscovered {len(classes_to_run)} test suites. Executing test cases...\n")

    for cls in classes_to_run:
        res = run_test_class(cls, client, seed_info, admin_headers)
        all_results.extend(res)
        for test_name, passed, msg, elapsed in res:
            total_executed += 1
            if passed:
                total_passed += 1
                status_str = "\033[92m[PASS]\033[0m" if sys.platform != "win32" else "[PASS]"
                print(f"  {status_str} {test_name} ({elapsed*1000:.1f}ms)")
            else:
                total_failed += 1
                status_str = "\033[91m[FAIL]\033[0m" if sys.platform != "win32" else "[FAIL]"
                print(f"  {status_str} {test_name}: {msg}")

    print("\n" + "=" * 80)
    print("TEST SUITE EXECUTION SUMMARY")
    print(f"Total Test Cases Discovered: {total_executed}")
    print(f"Passed: {total_passed}")
    print(f"Failed: {total_failed}")
    if total_executed > 0:
        pass_rate = (total_passed / total_executed) * 100
        print(f"Pass Rate: {pass_rate:.1f}%")
    print("=" * 80)

    client.close()
    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
