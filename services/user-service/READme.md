# PeerPrep - User Service (FastAPI + SQLAlchemy)

A self‑contained microservice that manages users (register, login, profile) and issues JWT access/refresh tokens. Built with **FastAPI**, **SQLAlchemy (async)**, **Alembic** for migrations, and **PostgreSQL**. Containerized via **Docker Compose**.

> **Prerequisite:** Install **Docker Desktop** (Windows/macOS) or Docker Engine (Linux). Ensure `docker compose` works from your terminal.

---

## 🧩 Features

* REST endpoints: register, login, `GET /users/me`, health checks
* JWT **access** token + DB‑backed **refresh** tokens
* Password hashing
* Account safety fields: `failed_attempts`, `locked_until`
* Alembic migrations
* OpenAPI docs at `/docs`

---

## 🗂️ Project structure (key parts)

```
services/user-service/
  ├─ app/
  │  ├─ main.py                # FastAPI app, router mounting
  │  ├─ core/
  │  │  ├─ config.py           # Pydantic settings (loads env)
  │  │  └─ security.py         # JWT helpers, hashing
  │  ├─ db/
  │  │  └─ session.py          # async engine & session factory
  │  ├─ models/
  │  │  ├─ user.py             # User model
  │  │  └─ refresh_token.py    # RefreshToken model
  │  └─ routers/
  │     ├─ auth.py             # /auth endpoints
  │     └─ users.py            # /users endpoints
  ├─ alembic/
  │  ├─ env.py
  │  ├─ alembic.ini            # sometimes at repo root depending on setup
  │  └─ versions/              # migration files
  ├─ Dockerfile
  ├─ docker-compose.yml
  ├─ requirements.txt
  └─ .env.example
```

---

## ⚙️ Configuration

Create a `.env` file (you can copy `.env.example`) in `services/user-service/`:

```dotenv
# App
APP_NAME=peerprep-user-service
ENV=dev
PORT=8001
CORS_ALLOW_ORIGINS=*

# Database (app uses asyncpg; alembic strips +asyncpg at runtime)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/peerprep_users

# JWT
JWT_ALG=HS256
JWT_SECRET=devsecret_change_me
ACCESS_TTL_MIN=15
REFRESH_TTL_DAYS=7

# Optional: logging
LOG_LEVEL=INFO
```

> **Note:** The Alembic `env.py` automatically converts `postgresql+asyncpg://…` to sync `postgresql://…` for migrations.

---

## 🚀 Run with Docker (recommended)

1. **Start Postgres + service**

```bash
# from services/user-service
docker compose up -d --build
```

This will:

* launch `postgres` on port **5432** with DB `peerprep_users`
* build and run `user-service` on port **8001**

2. **Run migrations**

```bash
docker compose exec user-service alembic upgrade head
```

3. **Smoke test**

```bash
curl http://localhost:8001/healthz
# {"ok": true}
```

Open docs: [http://localhost:8001/docs](http://localhost:8001/docs)

---

## 🏗️ Local development (no Docker)

> Only if you have Python & Postgres installed locally.

```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# set DATABASE_URL to point at your local Postgres
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

---

## 🧪 API Quickstart

### Register

```bash
curl -X POST http://localhost:8001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Secret123!","name":"Alice"}'
```

Response contains `access_token`, `refresh_token`, and `refresh_token_id`.

### Login

```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Secret123!"}'
```

### Get current user

```bash
curl http://localhost:8001/users/me \
  -H "Authorization: Bearer <access_token>"
```

---

## 📦 Common Docker commands

```bash
# logs
docker compose logs -f user-service

# open a shell in the service
docker compose exec user-service sh

# run alembic commands
docker compose exec user-service alembic history --verbose

# connect to Postgres psql
docker compose exec postgres psql -U postgres -d peerprep_users
psql> \dt
psql> SELECT id,email FROM users LIMIT 5;
```

---

## 🛤️ Migrations (Alembic)

**Autogenerate a new migration** (after editing models):

```bash
docker compose exec user-service alembic revision -m "<message>" --autogenerate
```

Apply it:

```bash
docker compose exec user-service alembic upgrade head
```

Troubleshooting tips:

* Ensure migration headers use `branch_labels = None` and `depends_on = None` (unquoted `None`).
* If a NOT NULL column is added to a non‑empty table, add a temporary `server_default` or backfill in the migration.

---

## 🔐 Auth model (current)

* **Access JWT**: short‑lived (`ACCESS_TTL_MIN`), carried in `Authorization: Bearer <token>`.
* **Refresh token**: persisted in `refresh_tokens` table (per device) with expiry (`REFRESH_TTL_DAYS`).
* Passwords are hashed; account safety supported via `failed_attempts` and `locked_until`.

---

## 🧰 Troubleshooting

* **`docker: command not found`**** on Windows** → Install **Docker Desktop**, restart terminal, ensure `docker compose version` works.
* **Migrations generated in container are not visible on host** → ensure your compose mounts code: `volumes: - ./:/app` for `user-service`.
* **`alembic dependency cycle`** → verify each migration header has correct `revision` and `down_revision` chain and real `None` values.
* **`psycopg2.errors.NotNullViolation`** while adding a new NOT NULL column → add `server_default='0'` or backfill then set `nullable=False`.

---

## 🧱 Compose snippet (reference)

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: peerprep_users
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  user-service:
    build: .
    env_file:
      - .env
    ports:
      - "8001:8001"
    depends_on:
      - postgres
    volumes:
      - ./:/app

volumes:
  pgdata: {}
```

---

## 📄 License

MIT (or your organization’s preferred license).
