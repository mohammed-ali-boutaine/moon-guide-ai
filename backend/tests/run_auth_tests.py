# tests/run_auth_tests.py
"""
Quick test runner for authentication tests
"""
import subprocess
import sys


def run_tests():
    """Run all authentication tests with coverage"""
    
    print("=" * 70)
    print("Running Authentication Tests")
    print("=" * 70)
    
    # Run pytest with coverage
    result = subprocess.run([
        sys.executable, "-m", "pytest",
        "tests/test_auth_*.py",
        "-v",
        "--tb=short",
        "--cov=app.api.routes.auth",
        "--cov=app.core.dependencies",
        "--cov=app.utils.jwt",
        "--cov=app.core.security",
        "--cov-report=term-missing",
        "--cov-report=html",
    ])
    
    if result.returncode == 0:
        print("\n" + "=" * 70)
        print("✅ All tests passed!")
        print("=" * 70)
    else:
        print("\n" + "=" * 70)
        print("❌ Some tests failed")
        print("=" * 70)
    
    return result.returncode


if __name__ == "__main__":
    sys.exit(run_tests())