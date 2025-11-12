[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/QUdQy4ix)
# CS3219 Project (PeerPrep) - AY2526S1
## Group: G15

# PeerPrep

PeerPrep is a collaborative coding interview preparation platform built as a microservices-based system. It enables users to practice technical interview questions together in real time.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Services](#services)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Quick Start](#quick-start)
6. [Docker Compose Configuration](#docker-compose-configuration)
7. [Environment Configuration](#environment-configuration)
8. [Service Ports](#service-ports)
9. [Development Workflow](#development-workflow)
10. [Troubleshooting](#troubleshooting)
11. [Contributors](#contributors)

## Architecture Overview

PeerPrep uses a microservices architecture with Nginx as a reverse proxy. All services are containerized and orchestrated via Docker Compose.

```
                          ┌─────────────────────┐
                          │  Frontend (React)   │
                          │  served via Nginx   │
                          └──────────┬──────────┘
                                     │
                        HTTP (REST) / WebSocket (WS)
                                     │
   ┌────────────────────────┬────────┴────────┬────────────────────────┐
   │                        │                 │                        │
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐
│ User Service │ │ Question Svc │ │ Matching Svc │ │ Collaboration  │
│ (Auth, Roles)│ │ (CRUD, Admin)│ │ (Queue, Pair)│ │  (WebSocket)   │
└───────┬──────┘ └───────┬──────┘ └───────┬──────┘ └────────┬───────┘
        │                │                │                  │
        └────────────────┴────────────────┴──────────────────┘
                                  │
                      ┌───────────┴───────────┐
                      │                       │
              ┌───────────────┐      ┌──────────────┐
              │  PostgreSQL   │      │    Redis     │
              │   (Relational │      │   (Cache &   │
              │     Data)     │      │    Queue)    │
              └───────────────┘      └──────────────┘
```

## Production Environment

Production URL: http://54.255.202.189:8080

All backend services are deployed on Google Cloud Run with managed databases:
- Database: Google Cloud SQL (PostgreSQL)
- Cache/Queue: Managed Redis
- Deployment: Google Cloud Run with automatic scaling

## Services

### User Service
Manages authentication, authorization, and user profiles.
- Port: 8001
- Technology: FastAPI, SQLAlchemy (async), PostgreSQL
- Key Features: JWT authentication, role-based access control, password hashing
- Documentation: [services/user-service/READme.md](services/user-service/READme.md)

### Question Service
Centralized question repository and management system.
- Port: 8003
- Technology: FastAPI, SQLAlchemy, PostgreSQL
- Key Features: CRUD operations, admin controls, topic/difficulty filtering
- Documentation: [services/question-service/README.md](services/question-service/README.md)

### Matching Service
Real-time user matching based on difficulty and topic preferences.
- Port: 8002
- Technology: FastAPI, Redis, PostgreSQL
- Key Features: Redis-backed queue, WebSocket notifications, two-sided confirmation
- Documentation: [services/matching-service/README.md](services/matching-service/README.md)

### Collaboration Service
Real-time code and note synchronization between matched peers.
- Port: 8004
- Technology: FastAPI, WebSocket, Redis, RabbitMQ
- Key Features: Code editor synchronization, collaborative notes, session management
- Documentation: [services/collaboration-service/README.md](services/collaboration-service/README.md)

### Frontend
React-based single-page application.
- Port: 3000 (development), 8080 (production via Nginx)
- Technology: React 18, Tailwind CSS, Monaco Editor
- Documentation: [frontend/README.md](frontend/README.md)

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React 18, Tailwind CSS, Monaco Editor |
| API Gateway | Nginx (reverse proxy, static serving) |
| Backend Services | FastAPI, Python |
| Database | PostgreSQL |
| Cache/Queue | Redis, RabbitMQ |
| Containerization | Docker, Docker Compose |
| Cloud Platform | Cloud SQL |

## Prerequisites

- Docker Desktop (Windows/macOS) or Docker Engine (Linux)
- Docker Compose v2.0+
- Git

Verify installation:
```powershell
docker --version
docker compose version
```

## Quick Start

1. Clone the repository:
```powershell
git clone <repository-url>
cd cs3219
```

2. Start all services:
```powershell
docker compose up --build
```

3. Access the application:
- Frontend: http://localhost:8080
- User Service API: http://localhost:8001/docs
- Matching Service: http://localhost:8002/health
- Question Service API: http://localhost:8003/docs
- Collaboration Service: http://localhost:8004/health

## Docker Compose Configuration

The root `docker-compose.yml` orchestrates all services and their dependencies.

### Service Dependencies

Services start in the following order based on dependencies:
1. PostgreSQL database (with health check)
2. Redis cache
3. RabbitMQ message broker
4. Backend services (user, question, matching, collaboration)
5. Nginx gateway

### Key Components

**Gateway Service (Nginx)**
- Routes frontend requests to appropriate backend services
- Serves React static build
- Handles CORS and proxy headers
- Configuration: `gateway/nginx.dev.conf`

**Cloud SQL Proxy Services**
- Three separate proxies for different service databases
- Used for connecting to Google Cloud SQL instances
- Requires credentials file at path specified in `CLOUDSQL_CREDENTIALS_PATH`

**Backend Services**
- All use FastAPI framework
- Connect to either Cloud SQL (production) or local PostgreSQL (dev)
- Communicate via HTTP REST and WebSocket protocols

**Infrastructure Services**
- PostgreSQL: Main relational database (port 5433)
- Redis: Cache and queue management (port 6380)
- RabbitMQ: Message broker for asynchronous events (ports 5672, 15672)

### Volumes

- `pgdata`: PostgreSQL data persistence
- `rabbitmq_data`: RabbitMQ data persistence

### Networks

All services communicate via the `appnet` bridge network.

### Health Checks

- PostgreSQL: `pg_isready` command
- RabbitMQ: `rabbitmq-diagnostics -q ping`
- Services wait for dependencies before starting

## Environment Configuration

### Root Environment Variables

Create environment variables for Cloud SQL credentials:
```powershell
$env:CLOUDSQL_CREDENTIALS_PATH="./gcp-keys/credentials.json"
$env:MS_PASSWORD="your_matching_db_password"
$env:QS_PASSWORD="your_question_db_password"
```

### Service-Specific Configuration

Each service has its own configuration needs. See individual service READMEs:
- [User Service](services/user-service/READme.md#environment-configuration)
- [Question Service](services/question-service/README.md#environment-variables)
- [Matching Service](services/matching-service/README.md#environment-variables)
- [Collaboration Service](services/collaboration-service/README.md#environment-configuration)
- [Frontend](frontend/README.md#environment-variables)

## Service Ports

| Service | Internal Port | External Port | Description |
|---------|--------------|---------------|-------------|
| Frontend (Nginx) | 80 | 8080 | React app via Nginx |
| User Service | 8001 | 8001 | Authentication API |
| Matching Service | 8002 | 8002 | Matching API |
| Question Service | 8003 | 8003 | Question API |
| Collaboration Service | 8004 | 8004 | WebSocket server |
| PostgreSQL | 5432 | 5433 | Database |
| Redis | 6379 | 6380 | Cache/Queue |
| RabbitMQ | 5672 | 5672 | Message queue |
| RabbitMQ Management | 15672 | 15672 | Admin UI |

## Development Workflow

### Starting Services

```powershell
# Start all services
docker compose up

# Start in detached mode
docker compose up -d

# Start specific service
docker compose up user-service

# Rebuild and start
docker compose up --build
```

### Stopping Services

```powershell
# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Viewing Logs

```powershell
# All services
docker compose logs -f

# Specific service
docker compose logs -f user-service

# Last 100 lines
docker compose logs --tail=100
```

### Running Commands in Containers

```powershell
# Execute command in service
docker compose exec user-service bash

# Run database migrations
docker compose exec user-service alembic upgrade head

# Access PostgreSQL
docker compose exec postgres psql -U postgres -d peerprep_users
```

### Rebuilding Services

```powershell
# Rebuild all services
docker compose build

# Rebuild specific service
docker compose build user-service

# Rebuild without cache
docker compose build --no-cache
```

### Checking Service Status

```powershell
# List running containers
docker compose ps

# Check service health
curl http://localhost:8001/healthz
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
```

## Troubleshooting

### Port Conflicts

If ports are already in use:
```powershell
# Check what's using the port
netstat -ano | findstr :8080

# Stop the process using the port (replace PID)
Stop-Process -Id <PID> -Force
```

### Database Connection Issues

```powershell
# Check if PostgreSQL is running
docker compose ps postgres

# View PostgreSQL logs
docker compose logs postgres

# Restart PostgreSQL
docker compose restart postgres

# Connect to PostgreSQL to verify
docker compose exec postgres psql -U postgres -d peerprep_users
```

### Service Container Failures

```powershell
# Check service logs for errors
docker compose logs -f <service-name>

# Restart specific service
docker compose restart <service-name>

# Rebuild service from scratch
docker compose build --no-cache <service-name>
docker compose up -d <service-name>
```

### Frontend Not Updating

```powershell
# Rebuild frontend
docker compose build gateway

# Clear browser cache
# In browser: Ctrl+Shift+R (hard refresh)
```

### Redis Connection Errors

```powershell
# Check Redis status
docker compose ps redis

# Test Redis connection
docker compose exec redis redis-cli ping
# Should return: PONG
```

### RabbitMQ Issues

```powershell
# Check RabbitMQ status
docker compose logs rabbitmq

# Access RabbitMQ management UI
# Navigate to: http://localhost:15672
# Login: admin / password
```

### Clean Restart

If experiencing persistent issues:
```powershell
# Stop all services and remove volumes
docker compose down -v

# Remove dangling images
docker system prune -f

# Rebuild and restart
docker compose up --build
```

## Contributors

| Name | Role |
|------|------|
| Deanna Poh | Frontend Developer |
| Adrian Aw | Backend (User Service) |
| Hai Hui | Backend (Question Service) |
| Chia Jia Ye | Matching Service |
| Sarah Teo | Collaboration Service |

## Related Documentation

- [frontend/README.md](frontend/README.md) - React app setup and development
- [services/user-service/READme.md](services/user-service/READme.md) - User authentication service
- [services/question-service/README.md](services/question-service/README.md) - Question management service
- [services/matching-service/README.md](services/matching-service/README.md) - Real-time matching service
- [services/collaboration-service/README.md](services/collaboration-service/README.md) - Real-time collaboration service

