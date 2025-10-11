# PeerPrep Matching Service

A FastAPI microservice that pairs users for collaborative coding sessions based on **difficulty** and **topic**.  
Tech stack: **Python**, **FastAPI**, **PostgreSQL (SQLAlchemy + Psycopg)**, **Redis**, **JWT auth**, **Uvicorn**.

---

## Features

- Create a **match request** per user for a given `difficulty` and `topic`.
- **Redis-backed queue** for quick pairing (`matching_queue:{difficulty}:{topic}`).
- Background task that polls every 2s to pair compatible users.
- **WebSocket** channel to push `"match_found"`/`"match_ready"` events to each user.
- Two-step confirmation: both users call `/confirm` to finalize a match.
- (Extension) Orchestrate with **Question** and **Collaboration** services once both confirm.

---

## Configuration

All config values are loaded from environment variables (via `.env`).

| Key | Example | Notes |
|---|---|---|
| `ENV` | `dev` | Environment name |
| `HOST` | `127.0.0.1` | Bind host |
| `PORT` | `8002` | Bind port |
| `DATABASE_URL` | `postgresql+psycopg://peerprep:peerprep@localhost:5433/peerprep_matches` | Use `+psycopg` (psycopg v3) or install `psycopg2-binary` and use `postgresql://...` |
| `REDIS_URL` | `redis://localhost:6380/0` | Redis connection string |
| `JWT_SECRET_KEY` | `secretkey` | JWT HMAC secret used to **sign and verify** tokens |
| `JWT_ALGORITHM` | `HS256` | Algorithm for JWT |
| `LOG_LEVEL` | `INFO` | Logging level |
| `MATCHING_TIMEOUT_SECONDS` | `60` | How long a request remains in the queue |

> Put these in `.env` for local development.

---

## Local Dev: Bring Up Dependencies (Docker)

```powershell
# Redis (port 6380)
docker run --name redis-matches -p 6380:6379 -d redis:7

# Postgres (port 5433) with known credentials/db
docker run --name pg-matches-2 `
  -e POSTGRES_USER=peerprep `
  -e POSTGRES_PASSWORD=peerprep `
  -e POSTGRES_DB=peerprep_matches `
  -p 5433:5432 -d postgres:16
```

---

## Install & Run

```powershell
# from services\matching-service
python -m venv .venv
. .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
pip install "psycopg[binary]" redis httpx  # drivers & client libs

# Environment for this shell
$env:REDIS_URL    = "redis://localhost:6380/0"
$env:DATABASE_URL = "postgresql+psycopg://peerprep:peerprep@localhost:5433/peerprep_matches"
$env:JWT_SECRET_KEY = "secretkey"
$env:JWT_ALGORITHM = "HS256"
$env:LOG_LEVEL = "INFO"

# Alembic: create versions folder ONCE if missing
mkdir .\alembic\versions -ErrorAction Ignore

# Autogenerate & apply initial migration
alembic revision --autogenerate -m "init schema"
alembic upgrade head

# Start API
python -m uvicorn app.main:app --reload --port 8002 --host 127.0.0.1
```

You should see on startup:
```
✓ Database connection successful
✓ Redis connection successful
```

---

## API (HTTP)

Base path: `http://127.0.0.1:8002/api/v1/matching`  
FastAPI: `http://127.0.0.1:8002/docs` (click **Authorize** and paste the raw token string)

### Auth
All endpoints require `Authorization: Bearer <JWT>` with payload containing `"user_id"`.

### Endpoints

#### Create request
```
POST /request
Body: { "difficulty": "Easy" | "Medium" | "Hard", "topic": "Arrays" }
Resp: MatchRequestResponse
```

#### Cancel request
```
DELETE /request/{id}
Resp: { "message": "Match request cancelled" }
```

#### Confirm match
```
POST /confirm
Body: { "match_id": "<uuid>", "confirmed": true }
Resp 200 (both confirmed):
  { "match_id": "...", "collaboration_session_id": "...", "question_id": "...", "partner_id": "..." }
Resp 202 (waiting):
  { "detail": "Waiting for partner confirmation" }
```

### WebSocket

```
GET /ws?token=<JWT>
```
- Server pushes `{"type":"match_found","match_id":"...","partner_id":"...","difficulty":"...","topic":"..."}`
- After both confirm (and orchestration), server can push `{"type":"match_ready","match_id":"...","collab_session_id":"...","question_id":"..."}`

---

## Matching Logic (High Level)

1. `POST /request` creates a `MatchRequest` row (status `PENDING`), then enqueues into Redis zset  
   key: `matching_queue:{difficulty}:{topic}` with score = enqueue time.
2. A background task polls every 2s up to 60s to find a partner:
   - Pops a small batch from zset, skips self, picks the first other user, reinserts skipped entries.
   - Creates a `Match` row, flips both requests to `MATCHED`, removes entries from zset.
   - Notifies both users over WebSocket with `"match_found"`.
3. Each user calls `POST /confirm`. When both sides are confirmed:
   - (Optional orchestration) call **Question** service to select a question.
   - call **Collaboration** service to create a room.
   - Persist `question_id` & `collaboration_session_id`, push `"match_ready"` to both users.

---

## Quick Test Flow (PowerShell)

```powershell
# 0) Mint two tokens
python -m scripts.make_tokens
$token1 = 'PASTE_TOKEN_FROM_u1'
$token2 = 'PASTE_TOKEN_FROM_u2'
$H1 = @{ Authorization = "Bearer $token1" }
$H2 = @{ Authorization = "Bearer $token2" }

# 1) Sanity auth
Invoke-RestMethod "http://127.0.0.1:8002/api/v1/matching/debug/whoami" -Headers $H1

# 2) Create two requests (same topic+difficulty)
$r1 = Invoke-RestMethod -Method POST "http://127.0.0.1:8002/api/v1/matching/request" -Headers $H1 -ContentType "application/json" -Body '{"difficulty":"Easy","topic":"Arrays"}'
$r2 = Invoke-RestMethod -Method POST "http://127.0.0.1:8002/api/v1/matching/request" -Headers $H2 -ContentType "application/json" -Body '{"difficulty":"Easy","topic":"Arrays"}'

# 3) Observe match (dev-only)
Invoke-RestMethod "http://127.0.0.1:8002/api/v1/matching/debug/matches"

# 4) Confirm from both users
$matchId = "<paste id from /debug/matches>"
Invoke-RestMethod -Method POST "http://127.0.0.1:8002/api/v1/matching/confirm" -Headers $H1 -ContentType "application/json" -Body (@{ match_id = $matchId; confirmed = $true } | ConvertTo-Json)
Invoke-RestMethod -Method POST "http://127.0.0.1:8002/api/v1/matching/confirm" -Headers $H2 -ContentType "application/json" -Body (@{ match_id = $matchId; confirmed = $true } | ConvertTo-Json)
```

---

## Dev‑Only Debug Endpoints

> Add these to `app/api/matching.py` while developing; remove before production.

- `GET /debug/whoami` → returns `{ "user_id": ... }` based on JWT.
- `GET /debug/matches` → list all `Match` rows.
- `GET /debug/my-requests` → list all `MatchRequest` for the caller.
- `GET /debug/queue/{difficulty}/{topic}` → inspect Redis zset for a bucket.
- `POST /debug/poll/{request_id}` → force a single matching attempt for that request.

---

## Troubleshooting

- **401 Invalid authentication credentials**  
  Make sure header is `Authorization: Bearer <raw-token>` (no `< >`). JWT secret/algorithm in `.env` must match the token generator.

- **500 on `/request`**  
  Ensure Redis and Postgres are up and `REDIS_URL` / `DATABASE_URL` env vars are set **in the shell** that runs uvicorn. Check startup logs for ✓ Redis/DB. Verify migrations: `alembic upgrade head`.

- **`psycopg` / driver errors**  
  Install `pip install "psycopg[binary]"` and use `postgresql+psycopg://...` in `DATABASE_URL`. For `psycopg2-binary`, use `postgresql://...`.

- **Alembic `versions` folder missing**  
  `mkdir alembic/versions` then rerun `alembic revision --autogenerate -m "init schema"`.

- **Cannot bind Redis 6379**  
  Another process uses the port. Either reuse it, stop it, or map a different host port (e.g., `-p 6380:6379` and set `REDIS_URL=redis://localhost:6380/0`).

- **“User already has a pending match request”**  
  Either cancel the pending one (`DELETE /request/{id}`) or make the endpoint idempotent (return existing when params match). Dev-only DB reset: set all `PENDING` → `CANCELLED` in `match_requests`.

---

## Extending: Orchestration on Confirm

When both users confirm, call your other services:

```python
# Question service
POST {QUESTION_SVC_URL}/api/v1/questions/select
{ "difficulty": "Easy", "topic": "Arrays" } -> { "id": "q123", ... }

# Collaboration service
POST {COLLAB_SVC_URL}/api/v1/collab/sessions
{ "user_ids": ["user-1","user-2"], "question_id": "q123" } -> { "session_id": "room-xyz" }
```

Save these IDs to the `matches` row and notify both users via WebSocket.
