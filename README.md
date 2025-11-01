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

## Architecture Overview

PeerPrep follows a **microservices architecture**, with each service containerized and orchestrated via **Docker Compose**.

```
                          ┌─────────────────────┐
                          │  Frontend (React)   │
                          │  served via Nginx   │
                          └──────────┬──────────┘
                                     │
                             HTTP / API Gateway
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

---

## Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React 18+, Tailwind CSS, Shadcn/UI, Monaco Editor |
| **API Gateway** | Nginx (Reverse Proxy, Routing) |
| **Backend Services** | Python (FastAPI / Flask) and Node.js (Express) |
| **Database** | PostgreSQL |
| **Cache / Queue** | Redis |
| **Containerization** | Docker & Docker Compose |
| **Deployment** | Configured for local and cloud setups |

---

## Repository Structure

```
peerprep/
├── frontend/               # React web app (UI, served via Nginx)
│   └── README.md           # Frontend-specific documentation
│
├── services
│   ├── user-service/           # Handles authentication & user management
│   │   ├── app/                # Routes, models, controllers
│   │   └── Dockerfile
│   │
│   ├── question-service/       # Manages coding questions & metadata
│   │   ├── scripts/            # Database setup, seeding scripts
│   │   └── Dockerfile
│   │
│   ├── matching-service/       # Handles real-time matching between users
│   │   ├── src/                # Matching logic, queues, health routes
│   │   └── Dockerfile
│   │
│   └── matching-service/       # Handles collaboration logic between users
│       ├── src/                
│       └── Dockerfile
│ 
├── gateway/                # API gateway and reverse proxy configuration
│   └── nginx.conf
│
├── docker-compose.yml      # Orchestration for all services
├── README.md               # This file
└── docs/                   # Optional diagrams, documentation, or assets
```

---

## Services and Ports

| Service | Port (Internal) | Description |
|----------|-----------------|--------------|
| **Frontend** | 3000 / 80 | React app served through Nginx |
| **User Service** | 8001 | Authentication, user CRUD |
| **Question Service** | 8002 | Question management and admin features |
| **Matching Service** | 8003 | Peer matching and pairing service |
| **Database (Postgres)** | 5432 | Relational data store |
| **Cache (Redis)** | 6379 | Queue and temporary session storage |
| **Gateway (Nginx)** | 8080 | Unified entry point for all APIs |

---

## Environment Setup

Each service reads from its own `.env` file. For local development, copy the provided templates:

```bash
cp .env.example .env
```

Populate with your own credentials (DB URL, JWT secrets, etc.).

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
REACT_APP_API_BASE=/api/v1
```

---

## 🧱 Development Setup

### 1. Prerequisites

- **Docker & Docker Compose** (required)
- **Node.js 16+** (optional, for local frontend development)
- **Python 3.9+** (optional, if running services manually)

### 2. Start All Services

From the root directory:

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
| **User Service** | http://localhost:8001/api/v1/users/healthz | `{ "status": "healthy" }` |
| **Question Service** | http://localhost:8002/api/v1/questions/health | `{ "status": "healthy" }` |
| **Matching Service** | http://localhost:8003/api/v1/matching/health | `{ "status": "healthy" }` |

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

## 👥 Contributors

| Name | Role |
|------|------|
| Poh Sher Yin, Deanna | Frontend Developer         |
| Adrian Aw            | Backend (User Service)     |
| Hai Hui              | Backend (Question Service) |
| Chia Jia Ye          | Matching Service           |
| Sarah Teo            | Collaboration Service      |

---

## 🗂️ Related Documentation

- **[frontend/README.md](frontend/README.md)** – React app documentation
- **[question-service/README.md](services/question-service/README.md)** – Question management microservice
- **[user-service/README.md](services/user-service/README.md)** – Authentication microservice
- **[matching-service/README.md](services/matching-service/README.md)** – Real-time matching microservice
- **[collaboration-service/README.md](services/collaboration-service/README.md)** – Real-time collaboration microservice
---

## 🚀 Deployment

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
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the development team
- Check existing documentation in `/docs`

---

