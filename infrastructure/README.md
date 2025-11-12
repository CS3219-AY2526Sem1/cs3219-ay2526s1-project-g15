# PeerPrep Infrastructure

Shared infrastructure for all PeerPrep microservices.

## Services

- **PostgreSQL**: `localhost:5432` (user: `peerprep`, password: `peerprep`)
- **Redis**: `localhost:6379`
- **pgAdmin**: http://localhost:5050 (admin@peerprep.dev / admin)
- **Redis Commander**: http://localhost:8081

## Quick Start

```powershell
# One command setup - starts infrastructure, creates databases,
# generates .env files, and seeds databases for services that have them
cd infrastructure
py scripts/setup-infrastructure.py

# That's it! All services are ready to run
```

### Manual Steps (if needed)

```powershell
# Generate service .env files only
py scripts/generate-env-files.py

# Seed individual service database (if setup didn't work and service has a database)
cd ../services/{service-name}
py scripts/seed_data.py
```

## What the Setup Script Does

The automated setup (`py scripts/setup-infrastructure.py`) performs:

1. **Infrastructure Startup**: Starts PostgreSQL, Redis, pgAdmin, Redis Commander
2. **Database Creation**: Creates all databases defined in `init-all-databases.sql`
3. **Environment Configuration**: Generates `.env.dev` files for all services in `SERVICES`
4. **Database Seeding**: Automatically runs `scripts/seed_data.py` for each service that has a database and seed script
5. **Health Checks**: Verifies all services are running properly
6. **Service Information**: Shows connection details and next steps

**Current Services Configured:**
- **question-service**: Fully configured with database and seeding

**To Add More Services:**
1. Add service configuration to `generate-env-files.py`
2. For services with databases: Uncomment relevant database creation in `init-all-databases.sql`
3. For services with databases: Create `services/{service}/scripts/seed_data.py`
4. Run setup script - it will automatically handle the new service

## Database Setup

### Current Services
- **question-service**: `peerprep_questions_dev` / `peerprep_questions_test`

### Adding More Services

To add more microservices with automatic setup, edit `infrastructure/scripts/generate-env-files.py`:

```python
SERVICES = {
    "question-service": {
        "port": 8003,
        "db_name": "peerprep_questions"
    },
    # Examples of different service types:
    #
    # Service with database:
    # "user-service": {
    #     "port": 8001,
    #     "db_name": "peerprep_users"
    # },
    #
    # Service without database (Redis-only or stateless):
    # "notification-service": {
    #     "port": 8005
    #     # No db_name = no database configuration
    # }
}
```

### Auto-Seeding Requirements (Optional)

For services with databases that need sample data, create a `scripts/seed_data.py` file:

```python
# services/{service-name}/scripts/seed_data.py
import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine, Base
from app.models.your_model import YourModel

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if data already exists
        existing_count = db.query(YourModel).count()
        if existing_count > 0:
            print(f"Database already contains {existing_count} records. Skipping seed.")
            return

        # Add your seed data here
        # ... seeding logic ...

        db.commit()
        print(f"Successfully seeded database with sample data.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
```

### Database Creation Steps (For Services That Need Databases)

1. **Update database initialization**:
   ```sql
   -- Add to infrastructure/development/scripts/init-all-databases.sql
   CREATE DATABASE peerprep_newservice_dev;
   CREATE DATABASE peerprep_newservice_dev_test;
   GRANT ALL PRIVILEGES ON DATABASE peerprep_newservice_dev TO peerprep;
   GRANT ALL PRIVILEGES ON DATABASE peerprep_newservice_dev_test TO peerprep;
   ```

2. **Add service configuration with `db_name`** (see above)

3. **Create seed script** (optional, see above)

## Running Services

All services are started the same way regardless of their dependencies:

```powershell
cd services/{service-name}
py run.py
```

**Service Types:**
- **With Database**: Services like `question-service` that store data in PostgreSQL
- **Redis Only**: Services that only use Redis for caching/sessions
- **Stateless**: Services that don't need persistent storage

## Management

```powershell
# Start infrastructure
cd infrastructure/development
docker-compose up -d

# Stop (preserve data)
docker-compose down

# Reset (delete all data)
docker-compose down -v
docker-compose up -d

# View logs
docker-compose logs postgres
docker-compose logs redis
```

## Troubleshooting

```powershell
# Check infrastructure status
cd infrastructure
py scripts/setup-infrastructure.py

# Manually create databases if missing
cd infrastructure/development
docker-compose exec postgres psql -U peerprep -d postgres -f /docker-entrypoint-initdb.d/init-all-databases.sql

# Test service configuration
cd services/{service-name}
py -c "from app.core.config import settings; print(settings.get_database_url())"

# Manual database seeding (for services with databases)
cd services/{service-name}
py scripts/seed_data.py
```