"""
Creates database tables for matching service
Run this before starting the service for the first time
"""
import sys
import os

# Add parent directory to path so we can import from app
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import engine, Base
from app.models.match_request import MatchRequest
from app.models.match import Match


def create_tables():
    """Create all tables in the database"""
    print("=" * 60)
    print("Creating database tables for Matching Service...")
    print("=" * 60)
    
    try:
        # Import all models to ensure they're registered with Base
        print("\n Models to create:")
        print("  1. match_requests")
        print("  2. matches")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        print("\n✓ Tables created successfully!")
        print("\nDatabase schema:")
        print("  - match_requests: Stores user match requests")
        print("  - matches: Stores completed matches between users")
        
        print("\n" + "=" * 60)
        print("✓ Database setup complete!")
        print("=" * 60)
        print("\nNext steps:")
        print("  1. Run: python scripts/seed_data.py")
        print("  2. Run: python run.py")
        
    except Exception as e:
        print(f"\n✗ Error creating tables: {e}")
        print("\nTroubleshooting:")
        print("  1. Check if PostgreSQL is running")
        print("  2. Verify DATABASE_URL in .env file")
        print("  3. Ensure database 'peerprep_matching_dev' exists")
        sys.exit(1)


def drop_tables():
    """Drop all tables (use with caution!)"""
    print("\n WARNING: This will delete all data!")
    response = input("Are you sure you want to drop all tables? (yes/no): ")
    
    if response.lower() == 'yes':
        try:
            Base.metadata.drop_all(bind=engine)
            print("✓ All tables dropped successfully")
        except Exception as e:
            print(f"✗ Error dropping tables: {e}")
            sys.exit(1)
    else:
        print("Operation cancelled")


if __name__ == "__main__":
    # Check for command line arguments
    if len(sys.argv) > 1 and sys.argv[1] == "--drop":
        drop_tables()
    else:
        create_tables()