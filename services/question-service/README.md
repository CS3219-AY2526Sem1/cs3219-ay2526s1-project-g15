# Question Service

The Question Service manages the question repository for PeerPrep. This guide helps developers from other services set up and test the Question Service locally.

## Overview

- Technology: FastAPI, SQLAlchemy, PostgreSQL
- Port: 8003
- Database: PostgreSQL
- Authentication: JWT token verification via User Service

## Features

- Question CRUD operations
- Topic and difficulty filtering
- Admin-only question management
- Question seeding from LeetCode API
- Image URL support for diagrams
- Test cases and constraints management

## Project Structure

```
services/question-service/
├── app/
│   ├── main.py                 # FastAPI application
│   ├── core/
│   │   └── config.py           # Configuration settings
│   ├── models/
│   │   └── question.py         # Question database model
│   ├── schemas/
│   │   └── question.py         # Pydantic schemas
│   ├── api/
│   │   └── questions.py        # Question endpoints
│   ├── services/
│   │   └── question_service.py # Business logic
│   └── utils/
│       └── auth.py             # Authentication utilities
├── scripts/
│   ├── database_architecture_setup.py  # Create tables
│   ├── seed_data.py                    # Seed questions
│   └── fetch_questions.py              # Fetch from LeetCode API
├── alembic/
│   ├── env.py
│   └── versions/               # Migration files
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

## Quick Start with Docker Compose

### From Root Project

```powershell
# Start all services (includes question-service)
docker compose up -d

# Check question-service status
docker compose ps question-service

# View logs
docker compose logs -f question-service
```

### Standalone Setup

```powershell
# Navigate to question-service directory
cd services/question-service

# Start PostgreSQL and question-service
docker compose up -d --build

# Set up database and seed data
docker compose exec question-service python scripts/database_architecture_setup.py
docker compose exec question-service python scripts/seed_data.py

# Verify service is running
curl http://localhost:8003/health
```

## Environment Configuration

Create a `.env` file in `services/question-service/`:

```env
# Application
ENV=dev
HOST=0.0.0.0
PORT=8003

# Database
DATABASE_URL=postgresql+psycopg2://postgres:postgres@postgres:5432/peerprep_questions

# External Services
USER_SERVICE_URL=http://user-service:8001

# CORS
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:3000
```

## Data Seeding

### Automatic Seeding

```powershell
# Seed with 10 questions (API + fallback)
docker compose exec question-service python scripts/seed_data.py
```

This script:
- Attempts to fetch questions from LeetCode API
- Falls back to hardcoded questions if API fails
- Skips seeding if questions already exist

### Manual Seeding

```powershell
# Fetch more questions from LeetCode API
docker compose exec question-service python scripts/fetch_questions.py
```

## API Endpoints

Base URL: `http://localhost:8003`

### Health Check

```powershell
# GET /health
curl http://localhost:8003/health
```

### Question Endpoints

**GET /questions/**

List all questions with minimal details (id, title, difficulty, topics, is_active).

```powershell
curl http://localhost:8003/questions/
```

Query parameters:
- `skip`: Number of items to skip (pagination)
- `limit`: Number of items to return (max 100)
- `difficulty`: Filter by difficulty (easy, medium, hard)
- `topics`: Filter by topics (comma-separated)
- `search`: Search in title and description

**GET /questions/{id}**

Get full question details including examples, constraints, and test cases.

```powershell
curl http://localhost:8003/questions/1
```

**GET /questions/topics**

Get all available topics.

```powershell
curl http://localhost:8003/questions/topics
```

Returns sorted array of unique topic strings.

**GET /questions/filter/topics-difficulty**

Advanced filtering by topics and difficulty.

```powershell
# Filter by difficulty
curl "http://localhost:8003/questions/filter/topics-difficulty?difficulty=easy"

# Filter by topics
curl "http://localhost:8003/questions/filter/topics-difficulty?topics=Array&topics=String"

# Combined filtering
curl "http://localhost:8003/questions/filter/topics-difficulty?difficulty=medium&topics=Dynamic%20Programming"
```

**POST /questions/** (Admin only)

Create a new question.

```powershell
curl -X POST http://localhost:8003/questions/ `
  -H "Authorization: Bearer <admin_token>" `
  -H "Content-Type: application/json" `
  -d '{
    "title": "Two Sum",
    "description": "Given an array of integers...",
    "difficulty": "easy",
    "topics": ["Array", "Hash Table"],
    "examples": [],
    "test_cases": [],
    "is_active": true
  }'
```

**PUT /questions/{id}** (Admin only)

Update an existing question.

```powershell
curl -X PUT http://localhost:8003/questions/1 `
  -H "Authorization: Bearer <admin_token>" `
  -H "Content-Type: application/json" `
  -d '{"title": "Updated Title"}'
```

**DELETE /questions/{id}** (Admin only)

Delete a question.

```powershell
curl -X DELETE http://localhost:8003/questions/1 `
  -H "Authorization: Bearer <admin_token>"
```

**PUT /questions/{id}/toggle-status** (Admin only)

Toggle question active status.

```powershell
curl -X PUT http://localhost:8003/questions/1/toggle-status `
  -H "Authorization: Bearer <admin_token>"
```

## Response Formats

### Minimal Response (List Operations)

Used by list and filter endpoints for performance:

```json
{
  "id": 1,
  "title": "Two Sum",
  "difficulty": "easy",
  "topics": ["Array", "Hash Table"],
  "is_active": true
}
```

### Full Response (Single Question)

Used when fetching individual questions:

```json
{
  "id": 1,
  "title": "Two Sum",
  "description": "Given an array of integers nums and an integer target...",
  "difficulty": "easy",
  "topics": ["Array", "Hash Table"],
  "examples": [
    {
      "input": "[2,7,11,15], target = 9",
      "output": "[0,1]",
      "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
    }
  ],
  "constraints": "2 <= nums.length <= 10^4",
  "test_cases": [
    {
      "input": {"nums": [2, 7, 11, 15], "target": 9},
      "output": [0, 1]
    }
  ],
  "images": ["https://example.com/diagram.png"],
  "is_active": true,
  "created_at": "2025-10-16T07:00:00Z",
  "updated_at": "2025-10-16T07:00:00Z"
}
```

## Integration with Other Services

### From Matching Service

The Matching Service fetches a random question for matched users:

```python
import httpx

async def get_random_question(difficulty: str, topic: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"http://question-service:8003/questions/filter/topics-difficulty",
            params={"difficulty": difficulty, "topics": topic}
        )
        questions = response.json()
        return random.choice(questions) if questions else None
```

### Authentication

Admin endpoints require JWT token from User Service:

```
Authorization: Bearer <access_token>
```

The service verifies tokens by calling the User Service `/users/me` endpoint.

## Database Management

### Running Migrations

```powershell
# Apply all pending migrations
docker compose exec question-service alembic upgrade head

# View migration history
docker compose exec question-service alembic history

# Rollback one migration
docker compose exec question-service alembic downgrade -1
```

### Direct Database Access

```powershell
# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d peerprep_questions

# List questions
SELECT id, title, difficulty FROM questions;

# Count questions by difficulty
SELECT difficulty, COUNT(*) FROM questions GROUP BY difficulty;

# Exit
\q
```

## Common Docker Commands

```powershell
# View service logs
docker compose logs -f question-service

# Access service shell
docker compose exec question-service sh

# Restart service
docker compose restart question-service

# Rebuild service
docker compose build question-service
docker compose up -d question-service
```

## API Documentation

Interactive API documentation is available when the service is running:

- Swagger UI: http://localhost:8003/docs
- ReDoc: http://localhost:8003/redoc

## Troubleshooting

### Database Connection Issues

```powershell
# Check if PostgreSQL is running
docker compose ps postgres

# View PostgreSQL logs
docker compose logs postgres

# Test connection
docker compose exec postgres pg_isready -U postgres
```

### Seeding Failures

```powershell
# View seeding logs
docker compose logs question-service

# Manually create tables
docker compose exec question-service python scripts/database_architecture_setup.py

# Re-run seeding
docker compose exec question-service python scripts/seed_data.py
```

### Port Conflicts

If port 8003 is already in use:

```powershell
# Check what's using the port
netstat -ano | findstr :8003

# Change PORT in .env or stop conflicting process
```

### Authentication Issues

If admin endpoints fail:

- Ensure User Service is running and accessible
- Verify JWT token is valid and not expired
- Check USER_SERVICE_URL configuration
- Confirm user has admin role

## Local Development Without Docker

```powershell
# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt

# Set up local PostgreSQL and update DATABASE_URL in .env

# Create tables
python scripts/database_architecture_setup.py

# Seed data
python scripts/seed_data.py

# Start service
uvicorn app.main:app --reload --port 8003
```