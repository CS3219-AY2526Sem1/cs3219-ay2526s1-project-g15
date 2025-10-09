#!/usr/bin/env python3
"""
Simple test to verify Question Service setup without requiring database connection
"""

def test_imports():
    """Test that all core modules can be imported"""
    print("Testing imports...")

    try:
        from app.main import app
        print("✓ Main FastAPI app imported successfully")

        from app.core.config import settings
        print("✓ Configuration loaded successfully")
        print(f"  - App name: {settings.app_name}")
        print(f"  - Environment: {settings.env}")
        print(f"  - Port: {settings.port}")

        from app.models.question import Question
        print("✓ Question model imported successfully")

        from app.schemas.question import QuestionCreate, QuestionResponse
        print("✓ Question schemas imported successfully")

        from app.api.questions import router
        print("✓ API router imported successfully")

        return True

    except Exception as e:
        print(f"✗ Import failed: {e}")
        return False

def test_database_config():
    """Test database configuration"""
    print("\nTesting database configuration...")

    try:
        from app.core.config import settings

        db_url = settings.get_database_url()
        test_db_url = settings.get_test_database_url()

        print(f"✓ Database URL configured: {db_url}")
        print(f"✓ Test Database URL configured: {test_db_url}")

        # Verify it's PostgreSQL
        if db_url.startswith("postgresql://"):
            print("✓ Using PostgreSQL (recommended)")
        else:
            print("⚠ Not using PostgreSQL")

        return True

    except Exception as e:
        print(f"✗ Database config failed: {e}")
        return False

def test_app_creation():
    """Test FastAPI app can be created"""
    print("\nTesting FastAPI app creation...")

    try:
        from app.main import app

        # Check if app has routes
        routes = [route.path for route in app.routes]
        print(f"✓ FastAPI app created with {len(routes)} routes")

        # Check for question routes
        question_routes = [r for r in routes if 'question' in r]
        if question_routes:
            print(f"✓ Question routes found: {len(question_routes)}")

        return True

    except Exception as e:
        print(f"✗ App creation failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("QUESTION SERVICE SETUP TEST")
    print("=" * 60)

    tests = [
        test_imports,
        test_database_config,
        test_app_creation
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1
        print()

    print("=" * 60)
    print(f"RESULTS: {passed}/{total} tests passed")

    if passed == total:
        print("✓ Question service is properly configured!")
        print("\nNext steps:")
        print("1. Start infrastructure: py infrastructure/scripts/setup-infrastructure.py")
        print("2. Run database setup: py scripts/database_architecture_setup.py")
        print("3. Start service: py run.py")
    else:
        print("✗ Some tests failed. Check the configuration.")

    print("=" * 60)

if __name__ == "__main__":
    main()