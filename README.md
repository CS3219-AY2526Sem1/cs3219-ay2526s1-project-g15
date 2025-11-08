[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/QUdQy4ix)
# CS3219 Project (PeerPrep) - AY2526S1
## Group: G15

# PeerPrep

PeerPrep is a **collaborative coding interview preparation platform** built as a microservices-based system. It enables users to **practice technical interview questions together in real time**, featuring:

- Real-time peer **matching and collaboration**
- Integrated **code editor and question environment**
- Comprehensive **question management** with admin controls
- Secure **authentication** and **role-based access**
- Production-grade **Docker + Nginx** infrastructure

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Microservices Overview](#microservices-overview)
3. [Tech Stack](#tech-stack)
4. [Repository Structure](#repository-structure)
5. [Development Set Up](#development-setup)
6. [Environment Set Up](#environment-setup)
7. [Services and Ports](#services-and-ports)
8. [Key Features](#key-features)
9. [Troubleshooting](#troubleshooting)
10. [Contributors](#contributors)

---

## Architecture Overview

PeerPrep follows a **reverse-proxied microservices** layout. Nginx sits in front and routes `/api/v1/...` to the correct backend. Each service is containerized and orchestrated via **Docker Compose**.

```
                          ┌─────────────────────┐
                          │  Frontend (React)   │
                          │  served via Nginx   │
                          └──────────┬──────────┘
                                     │
                        HTTP (REST) / Websocket (WS)
                                     │
   ┌────────────────────────┬────────┴────────┬────────────────────────┐
   │                        │                 │                        │
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐
│ User Service │ │ Question Svc │ │ Matching Svc │ │ Collaboration  │
│ (Auth, Roles)│ │ (CRUD, Admin)│ │ (Queue, Pair)│ │  (WebSocket)   │
└──────────────┘ └──────────────┘ └──────────────┘ └────────────────┘
       │                 │                 │                 │
       └─────────────────┴─────────────────┴─────────────────┘
                              │
                   ┌──────────┴──────────┐
                   │  PostgreSQL / Redis │
                   └─────────────────────┘
```

## Production Environment
**Cloud Run Deployment**: http://54.255.202.189:8080

All backend services are deployed on Google Cloud Run and connected to Google Cloud SQL instances for persistent data storage.

Current Production Deployment: 
- Production URL: http://54.255.202.189:8080
- Database: Google Cloud SQL (PostgreSQL)
- Deployment Method: Google Cloud Run
- Scaling: Automatic based on traffic

---
## Microservices Overview
### User Service (`/api/v1/users`)
Manages **authentication**, **authorization**, and **user profiles**.  
Built with **FastAPI**, **SQLAlchemy (async)**, and **PostgreSQL**.

**Key features:**
- JWT-based access and refresh tokens
- Password hashing + account safety fields
- Alembic migrations
- REST endpoints for register, login, profile, and health checks

**Default port:** `8001`

Docs: [http://localhost:8001/docs](http://localhost:8001/docs)

---

### Matching Service (`/api/v1/matching`)
Pairs users in **real time** based on difficulty and topic preferences.  
Built with **FastAPI**, **Redis**, and **PostgreSQL**.

**Features:**
- Redis-backed queue for fast matchmaking
- WebSocket notifications for `match_found` and `match_ready`
- Polling loop every 2 seconds to match compatible users
- JWT authentication required for all endpoints

**Default port:** `8002`

---

### Question Service (`/api/v1/questions`)
Centralized question repository and management system.  
Built with **Flask + SQLAlchemy** and **PostgreSQL**.

**Features:**
- CRUD operations for coding questions
- Admin-only question creation and status toggling
- Filtering by topic and difficulty
- Hardcoded + LeetCode API seeding
- Supports images, examples, and test cases

**Default port:** `8003`

Docs: [http://localhost:8003/docs](http://localhost:8003/docs)

---

### Collaboration Service
Handles **real-time code and note synchronization** between matched peers.  
Implements a WebSocket-based message relay layer.

**Features:**
- Code editor synchronization
- Collaborative notes
- Cursor position & language sharing
- User presence notifications
- Reconnection + session state restoration

**Default port:** `8004`

**WebSocket Endpoint:** ws://localhost:8003/api/v1/ws/session/{session_id}?user_id={user_id}&username={username}

---

### Frontend (`/frontend`)
A modern **React 18** single-page application with **TailwindCSS**.

**Features:**
- User authentication (via User Service)
- Real-time matching interface
- Monaco-based collaborative editor
- Session state & test cases display
- Question browsing and admin management
- Integrated API gateway routing via Nginx

**Runs on:** `http://localhost:8080`  

**Dockerfile:** Multi-stage build → Node build → Nginx static hosting

---

## Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React 18+, Tailwind CSS, Shadcn/UI, Monaco Editor |
| **API Gateway** | Nginx (Reverse Proxy, static serving) |
| **Backend Services** | FastAPI, Flask, Python |
| **Database** | PostgreSQL |
| **Cache / Queue** | Redis |
| **Containerization** | Docker & Docker Compose |
| **Deployment** | Google Cloud|

---

## Repository Structure

```
peerprep/
├── frontend/                    # React web app (UI, served via Nginx)
│   └── README.md
│
├── services/
│   ├── user-service/            # Auth, users, JWT
│   ├── question-service/        # Coding questions
│   ├── matching-service/        # Real-time matching
│   └── collaboration-service/   # WebSocket collaboration
│
├── gateway/                     # Nginx reverse proxy config
│   └── nginx.conf
│
├── docker-compose.yml           # Orchestration for all services
├── docs/                        # Extra API docs, diagrams
└── README.md                    # (this file)
```

---

## Development Setup

### 1. Prerequisites

- **Docker & Docker Compose** (required)
- **Node.js 16+** (optional, for local frontend development)
- **Python 3.9+** (optional, if running services manually)

### 2. Start All Services

From the **root** directory:

```bash
docker compose build
docker compose up
```

This will:
- Build all service containers
- Launch Nginx as a unified gateway
- Expose the app at: **🔗 http://localhost:8080**

### 3. Verify Setup

Check each service health:

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| **Gateway** | http://localhost:8080 | Frontend landing page |
| **User Service** | http://localhost:8001/healthz | `{"ok": true}` |
| **Matching Service** | http://localhost:8002/health | `return {"status": "healthy", "environment": settings.ENV, "service": "matching-service", "port": settings.PORT,}` |
| **Question Service** | http://localhost:8003/health | `{"status": "healthy", "service": "question-service"}` |
| **Collaboration Service** | http://localhost:8004/health | `{"status": "healthy"}` | 

---

## Environment Setup

Each service reads from its own `.env` file. For local development, copy the provided templates:

```bash
cp .env.example .env
```

### Example (base `.env`):

```env
ENV=dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=peerprep
REDIS_URL=redis://redis:6379
JWT_SECRET=your_secret_key_here
```

### Frontend `.env`:

```env
REACT_APP_API_BASE_URL=/api/v1
```

---

## Services and Ports

| Service | Port (Internal) | Description |
|----------|-----------------|--------------|
| **Frontend (Nginx)** | 3000 / 8080 | React app served through Nginx |
| **User Service** | 8001 | Authentication, users |
| **Matching Service** | 8002 | Peer matching and pairing service |
| **Question Service** | 8003 | Question management and admin features |
| **Collaboration Service** | 8004 | Peer collaboration service |
| **Database (Postgres)** | 5432 | Relational data store |
| **Cache (Redis)** | 6379 | Queue and temporary session storage |

---

## Key Features

### Authentication & User Management
- User registration, login, and password reset
- JWT-based authentication with secure token handling
- Role-based authorization (User/Admin)

### Question Service
- Full CRUD operations for interview questions
- Topic and difficulty level management
- Database seed and sync scripts
- Admin-only question management interface

### Matching & Collaboration
- Real-time peer matching based on difficulty and topics
- WebSocket-based collaboration rooms
- Shared Monaco code editor with live synchronization
- Session management and history tracking

### Gateway Integration
- Centralized API routing via Nginx reverse proxy
- Simplified frontend API base (`/api/v1/...`)
- Load balancing and request forwarding
- CORS handling and security headers

### Cloud Infrastructure
- **Google Cloud SQL**: Managed PostgreSQL databases with automatic backups and high availability
- **Cloud Run**: Containerized microservices with automatic scaling
- **Managed Redis**: For caching and real-time queue management
- **Production-ready**: Deployed at http://54.255.202.189:8080/
---

## Development Commands

| Command | Description |
|---------|-------------|
| `docker compose build` | Build all services |
| `docker compose up` | Start all containers |
| `docker compose up -d` | Start containers in detached mode |
| `docker compose down` | Stop all containers |
| `docker compose logs -f` | Follow logs from all services |
| `docker compose logs -f <service>` | Follow logs for specific service |
| `docker compose restart <service>` | Restart a specific service |
| `docker compose ps` | List running containers |

---

## Troubleshooting

| Issue | Possible Fix |
|-------|--------------|
| **404 Not Found on `/api/v1/...`** | Ensure correct Nginx config and backend service ports are properly mapped |
| **Service container failing** | Check logs with `docker compose logs <service>` for error details |
| **Database connection errors** | Verify `POSTGRES_*` environment variables and ensure database container is running |
| **CORS issues** | Confirm Nginx proxy headers and CORS setup in backend services |
| **Frontend not updating** | Rebuild frontend image: `docker compose build frontend` |
| **Port already in use** | Stop conflicting services or change ports in `docker-compose.yml` |
| **Redis connection failed** | Verify Redis container is running and `REDIS_URL` is correct |

---

## Contributors

| Name | Role |
|------|------|
| Deanna Poh           | Frontend Developer         |
| Adrian Aw            | Backend (User Service)     |
| Hai Hui              | Backend (Question Service) |
| Chia Jia Ye          | Matching Service           |
| Sarah Teo            | Collaboration Service      |

---

## Related Documentation

- **[frontend/README.md](frontend/README.md)** – React app documentation
- **[question-service/README.md](services/question-service/README.md)** – Question management microservice
- **[user-service/README.md](services/user-service/README.md)** – Authentication microservice
- **[matching-service/README.md](services/matching-service/README.md)** – Real-time matching microservice
- **[collaboration-service/README.md](services/collaboration-service/README.md)** – Real-time collaboration microservice
---

## Deployment

### Production Deployment

For production deployment, consider:

1. **Environment Variables**: Update all `.env` files with production credentials
2. **Database**: Use managed PostgreSQL service (e.g., AWS RDS, Google Cloud SQL)
3. **Redis**: Use managed Redis service (e.g., AWS ElastiCache, Redis Cloud)
4. **Nginx**: Configure SSL/TLS certificates for HTTPS
5. **Monitoring**: Set up logging and monitoring (e.g., Prometheus, Grafana)
6. **CI/CD**: Implement automated testing and deployment pipelines

### Quick Production Build

```bash
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d
```

---

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the development team
- Check existing documentation in `/docs`

---

