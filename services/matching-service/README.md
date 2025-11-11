# PeerPrep Matching Service

The Matching Service is a FastAPI-based microservice in the PeerPrep system that handles real-time user matching, confirmation, and session initialization for collaborative coding sessions.

It connects to PostgreSQL, Redis, RabbitMQ, and other internal services (User Service, Question Service) to provide an end-to-end matching workflow.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Setup](#setup)
   - [Prerequisites](#prerequisites)
   - [Environment Variables](#environment-variables)
   - [Running with Docker Compose](#running-with-docker-compose)
   - [Local Development](#local-development)
5. [API Reference](#api-reference)
   - [Matching Endpoints](#matching-endpoints)
   - [Session Endpoints](#session-endpoints)
   - [WebSocket Endpoint](#websocket-endpoint)
6. [Matching Flow](#matching-flow)
7. [Data Models](#data-models)
   - [Database Models](#database-models)
   - [Redis Structures](#redis-structures)
   - [RabbitMQ Event](#rabbitmq-event)
8. [Error Handling](#error-handling)
9. [Development Notes](#development-notes)
---

## Overview

The service allows users to request a match based on:
- difficulty (Easy, Medium, Hard)
- topic (e.g. arrays, dp, graph)

When two compatible requests are found, the service:
1. notifies both users via WebSocket,
2. waits for both to confirm,
3. creates a collaboration session in Redis,
4. publishes a `match.found` event to RabbitMQ for the collaboration service to pick up.

Timeouts and cancellations are handled automatically.

---

## Features

- Create and queue match requests in Redis based on difficulty and topic.
- Background matching that periodically searches for compatible partners.
- Two-sided match confirmation.
- Real-time notifications via WebSockets.
- Session bootstrap in Redis (question, language, users).
- Event publishing to RabbitMQ (`matching.events`) for downstream services.
- Timeout and requeue on no confirmation.
- Fallback to Redis scanning to recover sessions if DB is out of sync.

---

## Tech Stack

- Language/Runtime: Python 3.x (async)
- Framework: FastAPI
- ORM: SQLAlchemy
- Database: PostgreSQL
- Cache/Queue: Redis (sorted sets)
- Messaging: RabbitMQ
- Auth: JWT (shared secret with User Service)
- HTTP client: httpx
- Container: Docker, docker-compose

---

## Setup

### Prerequisites

- Docker and docker-compose
- Access to User Service and Question Service (or stubs/mocks)
- Python 3.11+ for local development

### Environment Variables

Create a `.env` file at the project root. Example:

```bash
# App
APP_NAME=peerprep-matching-service
ENV=dev
HOST=0.0.0.0
PORT=8002
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql+psycopg://peerprep:peerprep@postgres:5432/peerprep_matches

# Redis
REDIS_URL=redis://redis:6379/0

# RabbitMQ
RABBITMQ_URL=amqp://admin:password@rabbitmq:5672/

# External services
QUESTION_SERVICE_URL=http://localhost:8003
QUESTION_SERVICE_BASE_PATH=/api/v1
USER_SERVICE_URL=http://localhost:8001
USER_SERVICE_VERIFY_PATH=/users/me

# Auth
AUTH_ALGORITHM=HS256
AUTH_ACCESS_SECRET=dev-only-change-me
AUTH_ISSUER=user-service

# Matching
MATCHING_TIMEOUT_SECONDS=60
CONFIRM_MATCH_TIMEOUT_SECONDS=120
MAX_CONCURRENT_MATCHES=5000
```

### Running with Docker Compose

```bash
docker compose up --build
```

The matching service will be available at:

http://localhost:8002

### Local Development

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

---

## API Endpoints

This document lists all the REST and WebSocket endpoints for the **Matching Service**.

Base URL:

```
/api/v1/matching
```

---

## 1. Matching Endpoints

### Create Match Request

**POST** `/request`

Create a new match request for the logged-in user.

**Headers**
```
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

**Body**
```json
{
  "difficulty": "Easy",
  "topic": "arrays"
}
```

**Response (200)**
```json
{
  "id": "uuid",
  "user_id": "user-123",
  "difficulty": "Easy",
  "topic": "arrays",
  "status": "pending",
  "created_at": "2025-11-10T06:40:23Z"
}
```

---

### Get Match Request Status

**GET** `/requests/{request_id}/status`

Check whether a match request is still pending or has been matched.

**Headers**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Response (matched)**
```json
{
  "status": "matched",
  "match_id": "match-uuid"
}
```

**Response (pending)**
```json
{
  "status": "pending"
}
```

---

### Cancel Match Request

**DELETE** `/request/{request_id}`

Cancel a match request that has not yet been matched.

**Headers**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Response**
```json
{ "message": "Match request cancelled" }
```

---

### Confirm Match

**POST** `/confirm`

Confirm or decline a match after being paired with another user.

**Headers**
```
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

**Body**
```json
{
  "match_id": "match-uuid",
  "confirmed": true
}
```

**Responses**

**1. Waiting for partner**
```json
{
  "status": "waiting_for_partner",
  "match_id": "match-uuid"
}
```

**2. Both confirmed — session created**
```json
{
  "match_id": "match-uuid",
  "session_id": "session-uuid",
  "question_id": "question-id",
  "partner_id": "user-456"
}
```

**3. Declined — partner requeued**
```json
{
  "status": "cancelled",
  "requeued_partner": true,
  "match_id": "match-uuid"
}
```

---

### Get Match Status

**GET** `/{match_id}/status`

Check confirmation and session creation status for a match.

**Response**
```json
{
  "confirm_status": true,
  "session_id": "session-uuid"
}
```

---

## 2. Session Endpoints

### Get Active Session for User

**GET** `/sessions/active`

Get the currently active collaboration session for the logged-in user.

**Headers**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Response**
```json
{
  "match_id": "match-uuid",
  "session_id": "session-uuid",
  "partner_id": "user-456",
  "question": {
    "id": "question-id",
    "title": "Two Sum",
    "difficulty": "easy",
    "topics": ["arrays"]
  }
}
```

**Error (404)**
```json
{ "detail": "No active session" }
```

---

### Get Session Details

**GET** `/session/{session_id}`

Fetch full session information (question, language, users) from Redis.

**Response**
```json
{
  "question": {
    "id": "question-id",
    "title": "Two Sum",
    "difficulty": "easy",
    "topics": ["arrays"]
  },
  "code": "",
  "language": "python",
  "users": ["user-123", "user-456"]
}
```

**Error (404)**
```json
{ "detail": "Session not found" }
```

---

### Leave Session

**POST** `/sessions/leave`

Indicate that the user has left a collaborative session.

**Headers**
```
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

**Body**
```json
{
  "session_id": "session-uuid"
}
```

**Response**
```json
{ "status": "left" }
```

This will:
- Remove the user from the `users` list in Redis
- Notify the remaining user(s) via WebSocket (`partner_left`)

---

## 3. WebSocket Endpoint

### Connect to WebSocket

**GET** `/ws?token=<ACCESS_TOKEN>`

Establish a WebSocket connection for real-time updates.

**Example Events**

#### Match Found
```json
{
  "type": "match_found",
  "match_id": "match-uuid",
  "partner_id": "user-456",
  "difficulty": "Easy",
  "topic": "arrays"
}
```

#### Match Expired
```json
{
  "type": "match_expired",
  "reason": "confirmation_timeout"
}
```

#### Partner Left
```json
{
  "type": "partner_left",
  "session_id": "session-uuid",
  "user_id": "user-123"
}
```

---

### Notes

- All protected endpoints require a valid **JWT Access Token**.
- Tokens are validated using the `AUTH_ACCESS_SECRET` shared with the User Service.
- Real-time updates are only available while connected via WebSocket.

---

## Matching Flow

1. User sends `POST /request`.
2. Service stores request in Postgres and enqueues it in Redis.
3. Background task polls Redis for compatible requests.
4. When a match is found, both users are notified via WebSocket.
5. Both confirm to proceed.
6. Session is created and question fetched from Question Service.
7. `match.found` event is published to RabbitMQ.
8. Collaboration Service consumes it and opens a shared coding session.

---

## Error Handling

- 400 Bad Request – invalid or duplicate request.
- 401 Unauthorized – invalid or expired JWT.
- 404 Not Found – no match or session.
- 500 Internal Server Error – unexpected backend issue.