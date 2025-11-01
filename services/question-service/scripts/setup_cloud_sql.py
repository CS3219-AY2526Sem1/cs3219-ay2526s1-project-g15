#!/usr/bin/env python3
"""
Cloud SQL Setup Script
Run this script to initialize your Cloud SQL database for production
"""

import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def setup_cloud_sql():
    """Setup Cloud SQL database for production"""
    print("="*60)
    print("CLOUD SQL SETUP FOR QUESTION SERVICE")
    print("="*60)
    print()

    # Check environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ ERROR: DATABASE_URL not set!")
        print()
        print("Please set DATABASE_URL environment variable:")
        print("export DATABASE_URL='postgresql://user:password@your-cloud-sql-ip:5432/peerprep_questions'")
        print()
        return False

    print(f"✓ DATABASE_URL: {database_url.split('@')[1] if '@' in database_url else 'configured'}")
    print()

    try:
        # Import after checking env
        from app.core.database import engine, Base, SessionLocal
        from app.models.question import Question, DifficultyLevel
        from sqlalchemy import text

        print("Step 1: Testing database connection...")
        connection = engine.connect()
        result = connection.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print(f"✓ Connected to: {version.split(',')[0]}")
        connection.close()
        print()

        print("Step 2: Creating database schema...")
        Base.metadata.create_all(bind=engine)
        print("✓ Tables created with unique constraints")
        print()

        print("Step 3: Verifying table structure...")
        db = SessionLocal()
        try:
            result = db.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'questions'
                ORDER BY ordinal_position
            """))
            columns = result.fetchall()
            print("✓ Questions table structure:")
            for col_name, data_type, nullable in columns:
                print(f"  - {col_name}: {data_type} {'(nullable)' if nullable == 'YES' else '(required)'}")
            print()

            # Check for unique constraint
            result = db.execute(text("""
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_name = 'questions' AND constraint_type = 'UNIQUE'
            """))
            constraints = result.fetchall()
            if constraints:
                print(f"✓ Unique constraint on title: {constraints[0][0]}")
            else:
                print("⚠️  Warning: No unique constraint found on title")
            print()

        finally:
            db.close()

        print("="*60)
        print("✅ CLOUD SQL SETUP COMPLETE!")
        print("="*60)
        print()
        print("Next steps:")
        print("1. Seed initial data:")
        print("   python scripts/seed_data.py")
        print()
        print("2. OR start continuous fetching:")
        print("   python scripts/continuous_fetch.py")
        print()
        print("3. Start the service:")
        print("   python run.py")
        print()
        return True

    except Exception as e:
        print(f"❌ Setup failed: {e}")
        print()
        print("Troubleshooting:")
        print("1. Check DATABASE_URL is correct")
        print("2. Verify Cloud SQL instance is running")
        print("3. Ensure authorized networks includes your IP")
        print("4. Test connection: psql -h <ip> -U postgres -d peerprep_questions")
        return False

if __name__ == "__main__":
    success = setup_cloud_sql()
    sys.exit(0 if success else 1)
