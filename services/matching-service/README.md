# Matching Service

The Matching Service handles real-time user matching for PeerPrep. This guide helps developers from other services set up and test the Matching Service locally.

## Overview

- Technology: FastAPI, Redis, PostgreSQL, RabbitMQ
- Port: 8002
- Real-time: WebSocket connections for instant notifications
- Queue: Redis-backed matching queue
- Messaging: RabbitMQ for session events

## Features

- Real-time peer matching based on difficulty and topic
- Redis-backed queue for fast matchmaking
- Two-sided match confirmation
- WebSocket notifications for match events
- Session creation in Redis
- Event publishing to RabbitMQ for Collaboration Service
- Automatic timeout handling and requeuing

## Project Structure

```
services/matching-service/
├── app/
│   ├── main.py                 # FastAPI application
│   ├── core/
│   │   └── config.py           # Configuration settings
│   ├── models/
│   │   ├── match_request.py    # Match request model
│   │   └── match.py            # Match model
│   ├── schemas/
│   │   └── matching.py         # Pydantic schemas
│   ├── api/
│   │   ├── matching.py         # Matching endpoints
│   │   └── websocket.py        # WebSocket handler
│   ├── services/
│   │   ├── matching_service.py # Matching logic
│   │   └── redis_service.py    # Redis operations
│   ├── clients/
│   │   ├── question_client.py  # Question Service client
│   │   └── rabbitmq_client.py  # RabbitMQ publisher
│   └── utils/
│       └── auth.py             # JWT verification
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
# Start all services (includes matching-service)
docker compose up -d

# Check matching-service status
docker compose ps matching-service

# View logs
docker compose logs -f matching-service
```

### Standalone Setup

```powershell
# Navigate to matching-service directory
cd services/matching-service

# Start dependencies and matching-service
docker compose up -d --build

# Run database migrations
docker compose exec matching-service alembic upgrade head

# Verify service is running
curl http://localhost:8002/health
```

## Environment Configuration

Create a `.env` file in `services/matching-service/`:

```env
# Application
APP_NAME=peerprep-matching-service
ENV=dev
HOST=0.0.0.0
PORT=8002
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql+psycopg://postgres:postgres@postgres:5435/matching_db

# Redis
REDIS_URL=redis://redis:6379/0

# RabbitMQ
RABBITMQ_URL=amqp://admin:password@rabbitmq:5672/

# External Services
QUESTION_SERVICE_URL=http://question-service:8003
USER_SERVICE_URL=http://user-service:8001

# Auth (must match User Service)
AUTH_ALGORITHM=HS256
AUTH_ACCESS_SECRET=secretkey

# Matching Configuration
MATCHING_TIMEOUT_SECONDS=60
CONFIRM_MATCH_TIMEOUT_SECONDS=120
```

## API Endpoints

Base URL: `http://localhost:8002/api/v1/matching`

### Health Check

```powershell
# GET /health
curl http://localhost:8002/health
```

### Matching Endpoints

**POST /request**

Create a new match request.

```powershell
curl -X POST http://localhost:8002/api/v1/matching/request `
  -H "Authorization: Bearer <access_token>" `
  -H "Content-Type: application/json" `
  -d '{
    "difficulty": "easy",
    "topic": "Array"
  }'
```

Response:
```json
{
  "id": "uuid",
  "user_id": "user-123",
  "difficulty": "easy",
  "topic": "Array",
  "status": "pending",
  "created_at": "2025-11-12T06:40:23Z"
}
```

**GET /requests/{request_id}/status**

Check match request status.

```powershell
curl http://localhost:8002/api/v1/matching/requests/{request_id}/status `
  -H "Authorization: Bearer <access_token>"
```

Response (pending):
```json
{
  "status": "pending"
}
```

Response (matched):
```json
{
  "status": "matched",
  "match_id": "match-uuid"
}
```

**DELETE /request/{request_id}**

Cancel a pending match request.

```powershell
curl -X DELETE http://localhost:8002/api/v1/matching/request/{request_id} `
  -H "Authorization: Bearer <access_token>"
```

**POST /confirm**

Confirm or decline a match.

```powershell
curl -X POST http://localhost:8002/api/v1/matching/confirm `
  -H "Authorization: Bearer <access_token>" `
  -H "Content-Type: application/json" `
  -d '{
    "match_id": "match-uuid",
    "confirmed": true
  }'
```

Response (waiting):
```json
{
  "status": "waiting_for_partner",
  "match_id": "match-uuid"
}
```

Response (both confirmed):
```json
{
  "match_id": "match-uuid",
  "session_id": "session-uuid",
  "question_id": "question-id",
  "partner_id": "user-456"
}
```

**GET /{match_id}/status**

Check match confirmation status.

```powershell
curl http://localhost:8002/api/v1/matching/{match_id}/status `
  -H "Authorization: Bearer <access_token>"
```

### Session Endpoints

**GET /sessions/active**

Get active collaboration session for current user.

```powershell
curl http://localhost:8002/api/v1/matching/sessions/active `
  -H "Authorization: Bearer <access_token>"
```

**GET /session/{session_id}**

Get session details from Redis.

```powershell
curl http://localhost:8002/api/v1/matching/session/{session_id} `
  -H "Authorization: Bearer <access_token>"
```

**POST /sessions/leave**

Leave current collaboration session.

```powershell
curl -X POST http://localhost:8002/api/v1/matching/sessions/leave `
  -H "Authorization: Bearer <access_token>" `
  -H "Content-Type: application/json" `
  -d '{"session_id": "session-uuid"}'
```

### WebSocket Endpoint

**GET /ws?token={access_token}**

Connect to WebSocket for real-time match notifications.

```javascript
const ws = new WebSocket('ws://localhost:8002/api/v1/matching/ws?token=<access_token>');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

WebSocket events:
- `match_found`: A compatible match was found
- `match_ready`: Both users confirmed, session created
- `match_expired`: Match timed out or was declined
- `partner_left`: Partner left the session

## Matching Flow

1. User creates a match request via `POST /request`
2. Request is stored in PostgreSQL and queued in Redis
3. Background task continuously searches for compatible match requests
4. When a match is found:
   - Both users are notified via WebSocket
   - Match record is created in database
5. Both users must confirm the match via `POST /confirm`
6. Upon both confirmations:
   - Session is created in Redis
   - Question is fetched from Question Service
   - RabbitMQ event is published for Collaboration Service
7. Collaboration Service consumes event and initializes session

## Integration with Other Services

### Question Service Integration

The Matching Service fetches questions based on matched criteria:

```python
import httpx

async def get_question(difficulty: str, topic: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{QUESTION_SERVICE_URL}/questions/filter/topics-difficulty",
            params={"difficulty": difficulty, "topics": topic}
        )
        return response.json()
```

### Collaboration Service Integration

After successful match confirmation, the Matching Service publishes an event to RabbitMQ:

```json
{
  "event_type": "match.found",
  "session_id": "session-uuid",
  "users": ["user-123", "user-456"],
  "question_id": "question-id",
  "difficulty": "easy",
  "topic": "Array"
}
```

### User Service Integration

JWT tokens are verified by calling the User Service:

```python
async def verify_token(token: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{USER_SERVICE_URL}/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        return response.json()
```

## Redis Data Structures

### Match Queue

Sorted sets organized by difficulty and topic:

```
Key: queue:{difficulty}:{topic}
Value: user_id
Score: timestamp
```

### Session Data

Session information stored as hash:

```
Key: session:{session_id}
Fields:
  - question: JSON question data
  - code: Current code content
  - language: Selected programming language
  - users: JSON array of user IDs
```

## Database Management

### Running Migrations

```powershell
# Apply all pending migrations
docker compose exec matching-service alembic upgrade head

# View migration history
docker compose exec matching-service alembic history

# Rollback one migration
docker compose exec matching-service alembic downgrade -1
```

### Direct Database Access

```powershell
# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d matching_db

# View match requests
SELECT id, user_id, difficulty, topic, status FROM match_requests;

# View matches
SELECT id, user1_id, user2_id, session_id FROM matches;

# Exit
\q
```

## Common Docker Commands

```powershell
# View service logs
docker compose logs -f matching-service

# Access service shell
docker compose exec matching-service sh

# Check Redis data
docker compose exec redis redis-cli
redis> KEYS *
redis> GET session:session-uuid

# Restart service
docker compose restart matching-service

# Rebuild service
docker compose build matching-service
docker compose up -d matching-service
```

## Troubleshooting

### Redis Connection Issues

```powershell
# Check if Redis is running
docker compose ps redis

# Test Redis connection
docker compose exec redis redis-cli ping

# View Redis logs
docker compose logs redis
```

### RabbitMQ Connection Issues

```powershell
# Check RabbitMQ status
docker compose ps rabbitmq

# Access RabbitMQ management UI
# Navigate to: http://localhost:15672
# Login: admin / password

# View RabbitMQ logs
docker compose logs rabbitmq
```

### Question Service Integration Issues

```powershell
# Verify Question Service is accessible
curl http://localhost:8003/health

# Check matching-service can reach question-service
docker compose exec matching-service curl http://question-service:8003/health
```

### WebSocket Connection Issues

- Ensure JWT token is valid and not expired
- Check WebSocket URL includes token parameter
- Verify CORS settings allow WebSocket connections
- Check browser console for connection errors

### Database Connection Issues

```powershell
# Check PostgreSQL is running
docker compose ps postgres

# View database logs
docker compose logs postgres

# Test connection
docker compose exec postgres pg_isready -U postgres
```

### Service Won't Start

```powershell
# Check for errors in logs
docker compose logs matching-service

# Ensure dependencies are ready
docker compose ps

# Rebuild from scratch
docker compose down
docker compose up --build
```

## Local Development Without Docker

```powershell
# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt

# Ensure PostgreSQL, Redis, and RabbitMQ are running locally
# Update .env with local connection strings

# Run migrations
alembic upgrade head

# Start service
uvicorn app.main:app --reload --port 8002
```