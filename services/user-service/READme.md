# User Service

The User Service handles authentication, authorization, and user profile management for PeerPrep. This guide helps developers from other services set up and test the User Service locally.

## Overview

- Technology: FastAPI, SQLAlchemy (async), PostgreSQL
- Port: 8001
- Authentication: JWT access and refresh tokens
- Database: PostgreSQL (async with asyncpg driver)

## Features

- User registration and login
- JWT-based authentication
- Role-based access control (User/Admin)
- Password hashing and account security
- Alembic database migrations
- OpenAPI documentation at `/docs`

## Project Structure

```
services/user-service/
├── app/
│   ├── main.py                 # FastAPI application
│   ├── core/
│   │   ├── config.py           # Configuration settings
│   │   └── security.py         # JWT and password utilities
│   ├── db/
│   │   └── session.py          # Database session management
│   ├── models/
│   │   ├── user.py             # User model
│   │   └── refresh_token.py    # Refresh token model
│   └── api/
│       ├── auth.py             # Authentication endpoints
│       └── users.py            # User management endpoints
├── alembic/
│   ├── env.py                  # Alembic configuration
│   └── versions/               # Migration files
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

## Quick Start with Docker Compose

### From Root Project

If running from the root project directory:

```powershell
# Start all services (includes user-service)
docker compose up -d

# Check user-service status
docker compose ps user-service

# View logs
docker compose logs -f user-service
```

### Standalone Setup

To run the user-service independently:

```powershell
# Navigate to user-service directory
cd services/user-service

# Start PostgreSQL and user-service
docker compose up -d --build

# Run database migrations
docker compose exec user-service alembic upgrade head

# Verify service is running
curl http://localhost:8001/healthz
```

## Environment Configuration

Create a `.env` file in `services/user-service/`:

```env
# Application
APP_NAME=peerprep-user-service
ENV=dev
HOST=0.0.0.0
PORT=8001

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/peerprep_users

# JWT Configuration
SECRET=your_secret_key_here
ALGORITHM=HS256
ACCESS_TTL_MIN=15
REFRESH_TTL_DAYS=7

# Optional
LOG_LEVEL=INFO
```

Note: Alembic automatically converts `postgresql+asyncpg://` to `postgresql://` for migrations.

## API Endpoints

Base URL: `http://localhost:8001`

### Health Check

```powershell
# GET /healthz
curl http://localhost:8001/healthz
```

### Authentication Endpoints

**POST /auth/register**

Register a new user.

```powershell
curl -X POST http://localhost:8001/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"SecurePass123","name":"Test User"}'
```

Response includes `access_token`, `refresh_token`, and user details.

**POST /auth/login**

Login an existing user.

```powershell
curl -X POST http://localhost:8001/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"SecurePass123"}'
```

Returns access and refresh tokens.

**POST /auth/refresh**

Refresh an access token.

```powershell
curl -X POST http://localhost:8001/auth/refresh `
  -H "Content-Type: application/json" `
  -d '{"refresh_token":"<your_refresh_token>"}'
```

### User Endpoints

**GET /users/me**

Get current user profile (requires authentication).

```powershell
curl http://localhost:8001/users/me `
  -H "Authorization: Bearer <access_token>"
```

**PATCH /users/me**

Update current user profile.

```powershell
curl -X PATCH http://localhost:8001/users/me `
  -H "Authorization: Bearer <access_token>" `
  -H "Content-Type: application/json" `
  -d '{"name":"Updated Name"}'
```

## Integration with Other Services

### Token Verification

Other services can verify JWT tokens using the shared secret:

```python
from jose import jwt

# Decode and verify token
payload = jwt.decode(
    token,
    secret_key,
    algorithms=["HS256"]
)
user_id = payload.get("sub")
```

### Required Headers

When calling protected endpoints from other services:

```
Authorization: Bearer <access_token>
```

## Database Management

### Running Migrations

```powershell
# Apply all pending migrations
docker compose exec user-service alembic upgrade head

# View migration history
docker compose exec user-service alembic history

# Rollback one migration
docker compose exec user-service alembic downgrade -1
```

### Creating New Migrations

After modifying models:

```powershell
# Auto-generate migration
docker compose exec user-service alembic revision --autogenerate -m "description"

# Apply new migration
docker compose exec user-service alembic upgrade head
```

### Direct Database Access

```powershell
# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d peerprep_users

# List tables
\dt

# Query users
SELECT id, email, name, role FROM users;

# Exit
\q
```

## Common Docker Commands

```powershell
# View service logs
docker compose logs -f user-service

# Access service shell
docker compose exec user-service sh

# Restart service
docker compose restart user-service

# Rebuild service
docker compose build user-service
docker compose up -d user-service
```

## API Documentation

Interactive API documentation is available when the service is running:

- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Authentication Model

### Access Tokens
- Short-lived (default: 15 minutes)
- Used for API authentication
- Passed in Authorization header

### Refresh Tokens
- Long-lived (default: 7 days)
- Stored in database per device/session
- Used to obtain new access tokens

### Password Security
- Passwords are hashed using argon2
- Account lockout after failed attempts
- `failed_attempts` and `locked_until` fields for security

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

### Migration Errors

If you encounter migration issues:

```powershell
# Check current migration version
docker compose exec user-service alembic current

# View pending migrations
docker compose exec user-service alembic heads

# Force revision (use cautiously)
docker compose exec user-service alembic stamp head
```

### Port Conflicts

If port 8001 is already in use:

```powershell
# Check what's using the port
netstat -ano | findstr :8001

# Either stop the conflicting process or change PORT in .env
```

### Service Won't Start

```powershell
# Check for errors in logs
docker compose logs user-service

# Ensure database is ready
docker compose ps postgres

# Rebuild from scratch
docker compose down
docker compose up --build
```

## Local Development Without Docker

If you prefer to run locally without Docker:

```powershell
# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt

# Set up local PostgreSQL and update DATABASE_URL in .env

# Run migrations
alembic upgrade head

# Start service
uvicorn app.main:app --reload --port 8001
```

Note: You'll need PostgreSQL installed and running locally with a database created.