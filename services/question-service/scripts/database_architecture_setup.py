"""
Verify Question Service database setup
"""
import os
import sys

# Add the parent directory to Python path to access app modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

def verify_question_service_setup():
    """Verify Question Service database setup"""
    try:
        print("QUESTION SERVICE DATABASE VERIFICATION")
        print("-" * 40)

        # Test imports and configuration
        from app.core.config import settings
        print(f"✓ Environment: {settings.env}")
        print(f"✓ Service: {settings.app_name}")

        # Show database URL construction
        database_url = settings.get_database_url()
        test_database_url = settings.get_test_database_url()

        print(f"✓ Main Database: {database_url}")
        print(f"✓ Test Database: {test_database_url}")

        # Test database connection
        from app.core.database import engine, Base
        connection = engine.connect()

        # Check PostgreSQL connection
        from sqlalchemy import text
        result = connection.execute(text("SELECT current_database(), version()"))
        db_name, version = result.fetchone()
        print(f"✓ Connected to PostgreSQL database: {db_name}")
        print(f"✓ Version: {version.split(',')[0]}")

        connection.close()

        # Create tables
        print("✓ Creating database schema...")
        Base.metadata.create_all(bind=engine)

        # Verify tables were created
        from app.core.database import SessionLocal
        db = SessionLocal()
        try:
            # Check if we can connect and perform a basic query
            result = db.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"))
            table_count = result.scalar()
            print(f"✓ Database schema created successfully. Tables: {table_count}")
        finally:
            db.close()

        print()
        print("Question Service database setup successful!")
        return True

    except Exception as e:
        print(f"Database setup failed: {e}")
        print()
        print("Troubleshooting Steps:")
        print("1. Start PostgreSQL: cd infrastructure && python scripts/setup-infrastructure.py")
        print("2. Check environment: copy .env.dev to .env")
        print("3. Verify database exists: peerprep_questions_dev")
        return False

def main():
    """Main setup verification"""

    success = verify_question_service_setup()

    if success:
        print()
        print("NEXT STEPS:")
        print("1. Populate with sample data: python scripts/populate_questions.py")
        print("2. Start the service: python run.py")
        print("3. View API docs: http://localhost:8003/docs")
        print()

if __name__ == "__main__":
    main()