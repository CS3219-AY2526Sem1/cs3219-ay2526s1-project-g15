# Question Service

Question repository and management for PeerPrep.

## Prerequisites

- Python 3.8+
- PostgreSQL database (local or remote)
- pip package manager

## Setup Options

### Option 1: Standalone Setup

**1. Database Setup**
```powershell
# Create PostgreSQL databases
createdb peerprep_questions_dev
createdb peerprep_questions_dev_test
```

**2. Environment Configuration**
```powershell
# Copy environment template
cp .env.example .env

# Edit .env file with your database credentials
# Update DATABASE_URL if using different credentials/host
```

**3. Python Dependencies**
```powershell
# Install required packages
pip install -r requirements.txt
```

**4. Database Schema & Data**
```powershell
# Create database tables
python scripts/database_architecture_setup.py

# Seed with questions (tries API first, falls back to hardcoded)
python scripts/seed_data.py
```

**5. Start Service**
```powershell
python run.py
```

### Option 2: Infrastructure Scripts

```powershell
# From project root - sets up all services including database
python infrastructure/scripts/setup-infrastructure.py
```

## Data Population

**Primary Seeding Script:**
```powershell
# API-first seeding (10 questions from API, fallback to hardcoded)
python scripts/seed_data.py
```
- Tries LeetCode API first for fresh questions
- Falls back to 5 hardcoded questions if API fails
- Skips seeding if questions already exist

**Alternative Scripts:**
```powershell
# Production API fetching (30+ questions, requires internet)
python scripts/fetch_questions.py

# Database setup (creates tables)
python scripts/database_architecture_setup.py
```

## API Endpoints

**Base URL:** `http://localhost:8003`

- `GET /api/v1/questions/` - List questions (with filtering)
- `GET /api/v1/questions/{id}` - Get specific question
- `POST /api/v1/questions/` - Create question (Admin)
- `PUT /api/v1/questions/{id}` - Update question (Admin)
- `DELETE /api/v1/questions/{id}` - Delete question (Admin)

**Documentation:** http://localhost:8003/docs

## Development

**Database Migrations:**
```powershell
alembic upgrade head
```

**Testing:**
```powershell
pytest test_service.py -v
```

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Token validation secret
- `ENV` - Environment (dev/staging/prod)
- `PORT` - Service port (default: 8003)

**Package Notes:**
- Uses `psycopg[binary]` (psycopg3) instead of psycopg2-binary for better Windows compatibility
- All tests should pass with proper database connection

## Troubleshooting

**Database Connection Issues:**
- Verify PostgreSQL is running
- Check DATABASE_URL in .env file
- Ensure database exists

**Import Errors:**
- Run `pip install -r requirements.txt`
- Check Python version (3.8+ required)

**Port Conflicts:**
- Change PORT in .env file
- Kill existing processes on port 8003

**Seeding Failures:**
- API timeouts will automatically fallback to hardcoded questions (5 questions)
- Check internet connection for API-based seeding (10 questions)
- Verify database connection before seeding
- Script skips seeding if questions already exist

**psycopg2 Installation Issues:**
- Use `pip install "psycopg[binary]"` instead of psycopg2-binary
- psycopg3 provides better Windows compatibility without requiring PostgreSQL dev tools