# PeerPrep - User Service (FastAPI + SQLAlchemy)

A comprehensive microservice managing user authentication, profiles, and coding attempt tracking for the PeerPrep platform. Built with **FastAPI**, **SQLAlchemy (async)**, **Alembic** for migrations, and **PostgreSQL**. Fully containerized via **Docker Compose**.

> **Prerequisite:** Install **Docker Desktop** (Windows/macOS) or Docker Engine (Linux). Ensure `docker compose` works from your terminal.

---

## 🧩 Features

### Authentication & User Management
- User registration with email verification
- Login with JWT access + refresh tokens
- Password reset via email with 6-digit verification codes
- Account locking after failed login attempts (3 attempts = 15 min lock)
- Email verification system
- Token refresh mechanism
- Secure password hashing with Argon2
- Role-based access control (USER/ADMIN)

### Attempt Tracking System
- Record coding attempts with test results
- Track solved questions per user
- Question-level best performance tracking
- Attempt history with pagination
- Summary statistics (total attempts, solved count, last attempt)

### Security Features
- JWT-based authentication (access + refresh tokens)
- Failed login attempt tracking
- Temporary account locking
- Password reset with time-limited codes
- Email verification required for login

### API Features
- RESTful endpoints for all operations
- Async database operations
- OpenAPI documentation at `/docs`
- Health check endpoints

---

## 🗂️ Project Structure

```
services/user-service/
  ├── app/
  │   ├── main.py                     # FastAPI app, router mounting
  │   ├── core/
  │   │   ├── config.py               # Pydantic settings (loads env)
  │   │   ├── security.py             # JWT helpers, hashing
  │   │   └── email.py                # Email sending utilities
  │   ├── db/
  │   │   ├── session.py              # Async engine & session factory
  │   │   └── init_db.py              # DB initialization
  │   ├── models/
  │   │   ├── user.py                 # User model with relationships
  │   │   ├── refresh_token.py        # RefreshToken model
  │   │   ├── password_reset.py       # PasswordReset model
  │   │   └── attempt.py              # Attempt & UserQuestionStatus models
  │   ├── routers/
  │   │   ├── auth.py                 # /auth endpoints (register, login, etc.)
  │   │   ├── users.py                # /users endpoints (profile, admin check)
  │   │   ├── attempts.py             # /attempts endpoints (tracking)
  │   │   └── home.py                 # /home endpoint
  │   └── schemas/
  │       ├── auth.py                 # Auth request/response models
  │       ├── user.py                 # User schemas
  │       └── attempt.py              # Attempt schemas
  ├── alembic/
  │   ├── env.py                      # Alembic environment config
  │   └── versions/                   # Migration files
  ├── Dockerfile
  ├── docker-compose.yml
  ├── requirements.txt
  └── .env.example
```

---

## ⚙️ Configuration

Create a `.env` file (copy from `.env.example`) in `services/user-service/`:

```dotenv
# App Configuration
APP_NAME=peerprep-user-service
ENV=dev
HOST=0.0.0.0
PORT=8001

# Database (asyncpg for async operations)
DATABASE_URL=postgresql+asyncpg://peerprep_user:admin@postgres:5432/peerprep_users

# JWT Configuration
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TTL_MIN=15
REFRESH_TTL_DAYS=7

# Email Configuration (Gmail SMTP)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-email@gmail.com
MAIL_FROM_NAME=PeerPrep
MAIL_PORT=465
MAIL_SERVER=smtp.gmail.com
MAIL_STARTTLS=false
MAIL_SSL_TLS=true
USE_CREDENTIALS=true
VALIDATE_CERTS=true

# Public URL (for email verification links)
PUBLIC_BASE_URL=http://localhost:8080

# Optional
LOG_LEVEL=INFO
```

> **Note:** For Gmail, you need to generate an **App Password** from your Google Account settings.

---

## 🚀 Run with Docker (Recommended)

### 1. Start All Services

```bash
# From project root
docker compose up -d --build
```

This launches:
- `postgres` on port **5432** with DB `peerprep_users`
- `user-service` on port **8001**
- `redis` on port **6379**
- `rabbitmq` on ports **5672** (AMQP) and **15672** (Management UI)

### 2. Run Database Migrations

```bash
docker compose exec user-service alembic upgrade head
```

### 3. Verify Service is Running

```bash
curl http://localhost:8001/healthz
# {"ok": true}
```

Open API docs: [http://localhost:8001/docs](http://localhost:8001/docs)

---

## 🧪 API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login with credentials | No |
| POST | `/auth/logout` | Logout and invalidate tokens | Yes |
| POST | `/auth/refresh` | Refresh access token | No (refresh token) |
| POST | `/auth/forgot-password` | Request password reset code | No |
| POST | `/auth/verify-reset-code` | Verify reset code validity | No |
| POST | `/auth/reset-password` | Reset password with code | No |
| POST | `/auth/verify-password` | Verify user's current password | Yes |
| GET | `/auth/verify-email` | Verify email with token | No |

### User Management (`/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/me` | Get current user profile | Yes |
| PUT | `/users/me` | Update profile (name, password) | Yes |
| DELETE | `/users/me` | Delete user account | Yes |
| GET | `/users/is-admin` | Check if user is admin | Yes |

### Attempt Tracking (`/api/v1/attempts`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/attempts/` | Submit coding attempt | Yes |
| GET | `/api/v1/attempts/me` | Get user's attempt history | Yes |
| GET | `/api/v1/attempts/me/summary` | Get attempt statistics | Yes |
| GET | `/api/v1/attempts/{attempt_id}` | Get specific attempt details | Yes |

### Health Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/healthz` | Basic health check |
| GET | `/readyz` | Database readiness check |

---

## 📝 API Usage Examples

### Register New User

```bash
curl -X POST http://localhost:8001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!",
    "name": "Alice"
  }'
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token_id": "uuid-string"
}
```

### Verify Email

User clicks link in email: `http://localhost:8080/verify-email?token=...`

### Login

```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!"
  }'
```

### Get Current User

```bash
curl http://localhost:8001/users/me \
  -H "Authorization: Bearer <access_token>"
```

**Response:**
```json
{
  "id": "uuid",
  "email": "alice@example.com",
  "name": "Alice",
  "role": "USER"
}
```

### Submit Coding Attempt

```bash
curl -X POST http://localhost:8001/api/v1/attempts/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "question_id": 1,
    "language": "python",
    "submitted_code": "def solution(nums): return sum(nums)",
    "passed_tests": 8,
    "total_tests": 10
  }'
```

### Get Attempt History

```bash
curl http://localhost:8001/api/v1/attempts/me?limit=20&offset=0 \
  -H "Authorization: Bearer <access_token>"
```

### Password Reset Flow

**1. Request Reset Code:**
```bash
curl -X POST http://localhost:8001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com"}'
```

**2. Verify Code:**
```bash
curl -X POST http://localhost:8001/auth/verify-reset-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "code": "123456"
  }'
```

**3. Reset Password:**
```bash
curl -X POST http://localhost:8001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "code": "123456",
    "new_password": "NewSecurePass123!"
  }'
```

---

## 🏗️ Local Development (Without Docker)

> Only if you have Python 3.11+ & PostgreSQL installed locally.

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set DATABASE_URL to point at your local Postgres
export DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/peerprep_users"

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8001
```

---

## 🛤️ Database Migrations (Alembic)

### View Migration History
```bash
docker compose exec user-service alembic history --verbose
```

### Create New Migration (After Model Changes)
```bash
docker compose exec user-service alembic revision -m "description" --autogenerate
```

### Apply Migrations
```bash
docker compose exec user-service alembic upgrade head
```

### Rollback One Migration
```bash
docker compose exec user-service alembic downgrade -1
```

### Current Migration State
```bash
docker compose exec user-service alembic current
```

---

## 📊 Database Schema

### Users Table
- `id` (String, PK)
- `email` (String, unique)
- `password_hash` (String)
- `name` (String, nullable)
- `role` (String, default: "USER")
- `is_verified` (Boolean, default: false)
- `failed_attempts` (Integer, default: 0)
- `locked_until` (DateTime, nullable)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Refresh Tokens Table
- `id` (String, PK)
- `user_id` (String, FK → users)
- `hashed` (String)
- `user_agent` (String, nullable)
- `ip` (String, nullable)
- `created_at` (DateTime)
- `revoked_at` (DateTime, nullable)
- `expires_at` (DateTime)

### Password Resets Table
- `id` (String, PK)
- `user_id` (String, FK → users)
- `code_hash` (String)
- `expires_at` (DateTime)
- `used_at` (DateTime, nullable)
- `created_at` (DateTime)

### Attempts Table
- `id` (String, PK)
- `user_id` (String, FK → users)
- `question_id` (Integer)
- `language` (String)
- `submitted_code` (Text)
- `passed_tests` (SmallInteger)
- `total_tests` (SmallInteger)
- `created_at` (DateTime)

### User Question Status Table
- `user_id` (String, PK, FK → users)
- `question_id` (Integer, PK)
- `best_runtime_ms` (Integer, nullable)
- `solved_at` (DateTime, nullable)

---

## 🔐 Security Features

### Account Protection
- **Failed Login Tracking**: Increments on wrong password
- **Account Locking**: Locks for 15 minutes after 3 failed attempts
- **Email Alerts**: Console log for suspicious login attempts
- **Automatic Unlock**: Lock expires automatically

### Password Security
- **Argon2 Hashing**: Industry-standard password hashing
- **Minimum Length**: 8 characters enforced
- **Reset Codes**: 6-digit numeric codes, expire in 10 minutes
- **One-Time Use**: Reset codes invalidated after use

### Token Management
- **Access Tokens**: Short-lived (15 minutes)
- **Refresh Tokens**: Long-lived (7 days), stored in database
- **Device Tracking**: Stores user-agent and IP for each token
- **Global Logout**: Revokes all refresh tokens for user

---

## 📦 Common Docker Commands

```bash
# View logs
docker compose logs -f user-service

# Open shell in container
docker compose exec user-service sh

# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d peerprep_users

# PostgreSQL commands
\dt                           # List tables
\d users                      # Describe users table
SELECT * FROM users LIMIT 5;  # Query users
SELECT * FROM attempts WHERE user_id = 'uuid';  # Query attempts

# Restart service
docker compose restart user-service

# Rebuild after code changes
docker compose up -d --build user-service
```

---

## 🧰 Troubleshooting

### Docker Issues
- **`docker: command not found`** → Install Docker Desktop, restart terminal
- **Port conflicts** → Change PORT in `.env` or stop conflicting services
- **Container won't start** → Check logs with `docker compose logs user-service`

### Database Issues
- **Connection refused** → Verify PostgreSQL is running and DATABASE_URL is correct
- **Migration errors** → Check migration files have correct revision chain
- **Table not found** → Run `alembic upgrade head`

### Email Issues
- **Email not sending** → Verify Gmail App Password is correct
- **SMTP connection failed** → Check MAIL_PORT, MAIL_SERVER settings
- **Emails going to spam** → Gmail may flag test emails

### Authentication Issues
- **Token expired** → Use refresh token to get new access token
- **Invalid token** → Check SECRET_KEY matches between services
- **Email not verified** → User must click verification link before login

---

## 🔄 Integration with Other Services

### API Gateway (Nginx)
Routes `/api/v1/users` and `/auth` to this service on port 8001.

### Matching Service
Calls `/users/me` to verify user authentication when creating match requests.

### Question Service
Calls `/users/is-admin` to verify admin privileges for question management.

### Collaboration Service
Uses JWT tokens to authenticate WebSocket connections.

---

## 📚 Dependencies

```txt
fastapi              # Web framework
uvicorn              # ASGI server
SQLAlchemy           # ORM
asyncpg              # Async PostgreSQL driver
alembic              # Database migrations
pydantic             # Data validation
pydantic-settings    # Settings management
passlib              # Password hashing
argon2-cffi          # Argon2 implementation
python-jose          # JWT handling
email-validator      # Email validation
psycopg2-binary      # PostgreSQL adapter
fastapi-mail         # Email sending
```

---

## 🚀 Production Considerations

1. **Environment Variables**: Use secrets manager (AWS Secrets Manager, etc.)
2. **Database**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
3. **Email**: Consider transactional email service (SendGrid, AWS SES)
4. **Logging**: Implement structured logging (JSON format)
5. **Monitoring**: Set up APM (Datadog, New Relic)
6. **Rate Limiting**: Add rate limiting middleware
7. **HTTPS**: Configure SSL/TLS certificates
8. **Backup**: Regular database backups
9. **Secrets**: Rotate JWT secrets periodically
10. **Scaling**: Use horizontal scaling with load balancer

---

## 👥 Contributors

**CS3219 AY2526S1 - Group G15**
- User Service development and authentication system
- Attempt tracking and history features
- Email verification and password reset flows

---

## 📞 Support

For issues or questions:
- Check service logs: `docker compose logs -f user-service`
- Review API documentation: http://localhost:8001/docs
- Verify database state: Connect via psql
- Test endpoints: Use Postman or curl

---