# Question Service - Docker Setup

## Quick Start

### 1. Build and start the service with its database:
```bash
docker-compose up --build
```

### 2. The service will be available at:
- **API Docs**: http://localhost:8003/docs
- **API**: http://localhost:8003

### 3. To run in detached mode:
```bash
docker-compose up -d --build
```

## Common Commands

### View logs:
```bash
docker-compose logs -f
```

### Stop services:
```bash
docker-compose down
```

### Rebuild after code changes:
```bash
docker-compose up --build
```

### Access PostgreSQL:
```bash
docker-compose exec postgres psql -U postgres -d peerprep_questions_dev
```

### Run migrations/seed data:
```bash
docker-compose exec question-service python scripts/seed_data.py
```

## Environment Variables

The service uses `.env.dev` file. Make sure it exists with:
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/peerprep_questions_dev
SECRET_KEY=your-secret-key
USER_SERVICE_URL=http://localhost:8001
```

## Development

Hot reload is enabled - any changes to Python files will automatically restart the service.

## Database

The PostgreSQL container creates a database called `peerprep_questions_dev` by default. Data persists in a Docker volume named `pgdata`.
