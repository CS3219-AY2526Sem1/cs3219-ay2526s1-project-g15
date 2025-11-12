# Collaboration Service

The Collaboration Service handles real-time collaborative coding sessions for PeerPrep. This guide helps developers from other services set up and test the Collaboration Service locally.

## Overview

- Technology: FastAPI, WebSocket, Redis, RabbitMQ
- Port: 8004
- Real-time: WebSocket for code synchronization
- State Management: Redis for session data
- Messaging: RabbitMQ consumer for match events

## Features

- Real-time code editor synchronization between peers
- Collaborative chat messaging
- Cursor position tracking
- Programming language selection
- Session state management in Redis
- User presence tracking
- Automatic session cleanup
- RabbitMQ event consumption from Matching Service

## Project Structure

```
services/collaboration-service/
├── app/
│   ├── main.py                 # FastAPI application
│   ├── core/
│   │   └── config.py           # Configuration settings
│   ├── api/
│   │   └── websocket.py        # WebSocket handler and endpoints
│   └── events/
│       └── consumer.py         # RabbitMQ event consumer      
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── run.py
└── .env.example
```

## Quick Start with Docker Compose

### From Root Project

```powershell
# Start all services (includes collaboration-service)
docker compose up -d

# Check collaboration-service status
docker compose ps collaboration-service

# View logs
docker compose logs -f collaboration-service
```

### Standalone Setup

```powershell
# Navigate to collaboration-service directory
cd services/collaboration-service

# Start dependencies and collaboration-service
docker compose up -d --build

# Verify service is running
curl http://localhost:8004/health
```

## Environment Configuration

Create a `.env` file in `services/collaboration-service/`:

```env
# Application
APP_NAME=peerprep-collaboration-service
ENV=dev
HOST=0.0.0.0
PORT=8004
DEBUG=true

# Redis
REDIS_URL=redis://redis:6379/0

# RabbitMQ
RABBITMQ_URL=amqp://admin:password@rabbitmq:5672
QUEUE_NAME=collaboration_events

# External Services
USER_SERVICE_URL=http://user-service:8001

# Database (if needed)
DATABASE_URL=postgresql+asyncpg://collaboration_user:collabpass@postgres:5432/peerprep_collaboration
```

## WebSocket Connection

### Establishing Connection

Connect to the collaboration session via WebSocket:

```
ws://localhost:8004/api/v1/ws/session/{session_id}?user_id={user_id}&username={username}
```

Parameters:
- `session_id`: Session ID from Matching Service
- `user_id`: User ID from authentication
- `username`: Display name for the user

### JavaScript Example

```javascript
const sessionId = "session-uuid";
const userId = "user-123";
const username = "JohnDoe";

const ws = new WebSocket(
  `ws://localhost:8004/api/v1/ws/session/${sessionId}?user_id=${userId}&username=${username}`
);

ws.onopen = () => {
  console.log('Connected to Websocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleMessage(data);
};

ws.onerror = (error) => {
  console.error('WebSocket error', error);
};

ws.onclose = () => {
  console.log('Websocket closed');
};
```

## WebSocket Message Types

**user_joined**
```json
{
  "type": "user_joined",
  "user_id": "user-456",
  "username": "JaneDoe",
  "timestamp": "2025-11-12T10:30:00Z"
}
```

**user_left**
```json
{
  "type": "user_left",
  "user_id": "user-456",
  "timestamp": "2025-11-12T10:30:00Z"
}
```

**code_update**
```json
{
  "type": "code_update",
  "code": "def solution():\n    pass",
  "user_id": "user-456",
  "timestamp": "2025-11-12T10:30:00Z"
}
```

**cursor_move**
```json
{
  "type": "cursor_move",
  "user_id": "user-456",
  "code": "def solution():\n    pass",
  "cursor": {
    "lineNumber": 5,
    "column": 10
  },
  "timestamp": "2025-11-12T10:30:00Z"
}
```

**language_change**
```json
{
  "type": "language_change",
  "language": "javascript",
  "user_id": "user-456",
  "timestamp": "2025-11-12T10:30:00Z"
}
```

**chat_message**
```json
{
  "type": "chat_message",
  "user_id": "user-456",
  "username": "JaneDoe",
  "text": "Hello!",
  "timestamp": "2025-11-12T10:30:00Z"
}
```

**session_state**
```json
{
  "type": "session_state",
  "session_id": "session-uuid",
  "question_id": "question-id",
  "code": "current code content",
  "chat": "chat history",
  "language": "python",
  "users": [
    {
      "user_id": "user-123",
      "username": "JohnDoe",
      "cursor": null
    }
  ],
  "created_at": "2025-11-12T10:30:00Z"
}
```


## REST API Endpoints

### Health Check

```powershell
# GET /health
curl http://localhost:8004/health
```

Response:
```json
{
  "status": "healthy"
}
```

### Get Session State

```powershell
# GET /api/v1/session/{session_id}/state
curl http://localhost:8004/api/v1/session/{session_id}/state
```

Response:
```json
{
  "session_id": "session-uuid",
  "question_id": "question-id",
  "code": "current code",
  "language": "python",
  "users": [
    {
      "user_id": "user-123",
      "username": "JohnDoe",
      "cursor": null
    }
  ]
}
```

### End Session

```powershell
# DELETE /api/v1/session/{session_id}
curl -X DELETE http://localhost:8004/api/v1/session/{session_id}
```

## Integration with Other Services

### Matching Service Integration

The Collaboration Service consumes events from the Matching Service via RabbitMQ:

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

When this event is received, the Collaboration Service:
1. Creates a new session in memory
2. Initializes session state in Redis
3. Waits for WebSocket connections from both users

### User Service Integration

User authentication can be verified by the User Service (optional):

```python
async def verify_user(user_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{USER_SERVICE_URL}/users/{user_id}"
        )
        return response.json()
```

## Redis Data Structure

### Session Data

Sessions are stored in Redis as hashes:

```
Key: session:{session_id}
Fields:
  - session_id: UUID
  - question_id: Question ID from Question Service
  - code: Current code content
  - language: Programming language
  - users: JSON array of user IDs
  - created_at: Timestamp
```

### Session Operations

```powershell
# Connect to Redis
docker compose exec redis redis-cli

# View all sessions
KEYS session:*

# Get session data
HGETALL session:session-uuid

# Delete session
DEL session:session-uuid
```

## Common Docker Commands

```powershell
# View service logs
docker compose logs -f collaboration-service

# Access service shell
docker compose exec collaboration-service sh

# Check Redis data
docker compose exec redis redis-cli
redis> KEYS session:*
redis> HGETALL session:session-uuid

# View RabbitMQ queues
# Navigate to: http://localhost:15672
# Login: admin / password

# Restart service
docker compose restart collaboration-service

# Rebuild service
docker compose build collaboration-service
docker compose up -d collaboration-service
```

## Testing WebSocket Connection

### Using HTML Test Page

A test HTML page is included at `test_websocket.html`:

```powershell
# Start the service
docker compose up -d collaboration-service

# Open test_websocket.html in a browser
# Enter session ID, user ID, and username
# Click Connect to test WebSocket functionality
```

### Using Command Line (websocat)

```powershell
# Install websocat
# On Windows: scoop install websocat

# Connect to session
websocat ws://localhost:8004/api/v1/ws/session/test-session?user_id=user-123&username=TestUser

# Send code change
{"type": "code_change", "code": "print('hello')"}

# Send chat message
{"type": "chat", "message": "Hello!"}
```

## Troubleshooting

### WebSocket Connection Failed

```powershell
# Check service is running
docker compose ps collaboration-service

# View logs for errors
docker compose logs collaboration-service

# Verify Redis is accessible
docker compose exec collaboration-service redis-cli -u redis://redis:6379 ping
```

### Redis Connection Issues

```powershell
# Check if Redis is running
docker compose ps redis

# Test Redis connection
docker compose exec redis redis-cli ping

# View Redis logs
docker compose logs redis
```

### RabbitMQ Consumer Not Working

```powershell
# Check RabbitMQ status
docker compose ps rabbitmq

# View RabbitMQ logs
docker compose logs rabbitmq

# Access RabbitMQ management UI
# Navigate to: http://localhost:15672
# Check if queue exists and has consumers
```

### Session State Not Persisting

- Ensure Redis is running and accessible
- Check Redis connection string in `.env`
- Verify session creation in Redis: `docker compose exec redis redis-cli KEYS session:*`
- Check service logs for Redis errors

### Multiple Users Not Syncing

- Ensure both users connected to same session ID
- Check WebSocket connections are established
- View logs for message broadcast errors
- Verify both users are sending properly formatted messages

### Service Won't Start

```powershell
# Check for errors in logs
docker compose logs collaboration-service

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

# Ensure Redis and RabbitMQ are running locally
# Update .env with local connection strings

# Start service
python run.py
```

## Architecture Notes

### Session Management

- Sessions are created when Matching Service publishes match events
- Session state is maintained both in-memory and in Redis
- In-memory state for fast WebSocket operations
- Redis state for persistence and recovery

### Message Broadcasting

- Code changes are broadcast to all users in the session except the sender
- Chat messages are broadcast to all users including the sender
- Cursor positions are broadcast to all users except the owner

### Cleanup

- Sessions are automatically cleaned up when all users disconnect
- Redis entries are removed when sessions end
- Inactive sessions can be cleaned up periodically (implementation dependent)

## Performance Considerations

- Each session maintains active WebSocket connections
- Code updates are broadcast in real-time with minimal latency
- Redis is used for session persistence to enable recovery
- Consider implementing rate limiting for large scale deployments
- Monitor WebSocket connection count and memory usage
