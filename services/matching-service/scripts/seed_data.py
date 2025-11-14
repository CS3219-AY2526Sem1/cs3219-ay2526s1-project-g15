"""
Test database and Redis connections before running the service
"""
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.config import settings
from app.core.database import engine
from app.utils.matching_queue import matching_queue


def test_database():
    """Test PostgreSQL connection"""
    print("\n" + "=" * 60)
    print("Testing Database Connection...")
    print("=" * 60)
    
    try:
        # Try to connect
        with engine.connect() as conn:
            result = conn.execute("SELECT version();")
            version = result.fetchone()[0]
            
            print("✓ Database connection successful!")
            print(f"  PostgreSQL version: {version[:50]}...")
            print(f"  Database: {settings.DATABASE_URL.split('/')[-1]}")
            
            # Check if tables exist
            result = conn.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            tables = [row[0] for row in result.fetchall()]
            
            if tables:
                print(f"\n  Existing tables: {', '.join(tables)}")
            else:
                print("\n  ⚠️  No tables found. Run: python scripts/database_architecture_setup.py")
            
            return True
    except Exception as e:
        print(f"✗ Database connection failed!")
        print(f"  Error: {e}")
        print(f"\nTroubleshooting:")
        print(f"  1. Check if PostgreSQL is running: pg_isready")
        print(f"  2. Verify DATABASE_URL in .env")
        print(f"  3. Create database: createdb -U postgres peerprep_matching_dev")
        return False


def test_redis():
    """Test Redis connection"""
    print("\n" + "=" * 60)
    print("Testing Redis Connection...")
    print("=" * 60)
    
    try:
        # Try to ping Redis
        response = matching_queue.redis_client.ping()
        
        if response:
            print("✓ Redis connection successful!")
            print(f"  Redis URL: {settings.REDIS_URL}")
            
            # Try to set and get a test value
            matching_queue.redis_client.set("test_key", "test_value", ex=5)
            value = matching_queue.redis_client.get("test_key")
            
            if value == "test_value":
                print("  ✓ Read/Write operations working")
            
            # Check for any existing queue data
            keys = matching_queue.redis_client.keys("matching_queue:*")
            if keys:
                print(f"\n  Active matching queues: {len(keys)}")
                for key in keys[:5]:  # Show first 5
                    size = matching_queue.redis_client.zcard(key)
                    print(f"    - {key}: {size} waiting users")
            
            return True
    except Exception as e:
        print(f"✗ Redis connection failed!")
        print(f"  Error: {e}")
        print(f"\nTroubleshooting:")
        print(f"  1. Start Redis: redis-server")
        print(f"  2. Test Redis CLI: redis-cli ping (should return PONG)")
        print(f"  3. Verify REDIS_URL in .env: {settings.REDIS_URL}")
        return False


def test_environment():
    """Test environment configuration"""
    print("\n" + "=" * 60)
    print("Testing Environment Configuration...")
    print("=" * 60)
    
    issues = []
    
    # Check critical settings
    print(f"  Environment: {settings.ENV}")
    print(f"  Port: {settings.PORT}")
    print(f"  Matching Timeout: {settings.MATCHING_TIMEOUT_SECONDS}s")
    
    # Check JWT secret
    if settings.JWT_SECRET_KEY == "your-secret-key-change-in-production":
        issues.append("JWT_SECRET_KEY is still the default value")
        print("  ⚠️  JWT Secret: Using default (not secure for production)")
    else:
        print(f"  ✓ JWT Secret: Configured")
    
    # Check other service URLs
    print(f"\n  Integration URLs:")
    print(f"    User Service: {settings.USER_SERVICE_URL}")
    print(f"    Collaboration Service: {settings.COLLABORATION_SERVICE_URL}")
    print(f"    Question Service: {settings.QUESTION_SERVICE_URL}")
    
    if issues:
        print(f"\n  ⚠️  Configuration warnings:")
        for issue in issues:
            print(f"    - {issue}")
        return False
    
    print("\n  ✓ Configuration looks good")
    return True


def test_all():
    """Test all connections"""
    print("\n" + "🔧" * 30)
    print("MATCHING SERVICE - SYSTEM CHECK")
    print("🔧" * 30)
    
    env_ok = test_environment()
    db_ok = test_database()
    redis_ok = test_redis()
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Environment:  {'✓ OK' if env_ok else '⚠️  Warnings'}")
    print(f"  Database:     {'✓ Connected' if db_ok else '✗ Failed'}")
    print(f"  Redis:        {'✓ Connected' if redis_ok else '✗ Failed'}")
    print("=" * 60)
    
    if db_ok and redis_ok:
        print("\n✓ All critical systems operational!")
        print("\nYou can now:")
        print("  1. Run: python run.py")
        print("  2. Access API docs: http://localhost:8002/docs")
        print("\nMatching Service is ready to:")
        print("  - Accept match requests from users")
        print("  - Pair users with same difficulty + topic")
        print("  - Handle confirmations and timeouts")
    else:
        print("\n✗ Some systems failed. Please fix the issues above.")
        sys.exit(1)


if __name__ == "__main__":
    test_all()