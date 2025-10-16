# Question Service

Question repository and management for PeerPrep.

## Prerequisites

- Python 3.8+
- PostgreSQL database (local or remote)
- pip package manager

## Setup Options

### Option 1: Standalone Setup

**1. Database Setup**
```powershell
# Create PostgreSQL databases
createdb peerprep_questions_dev
createdb peerprep_questions_dev_test
```

**2. Environment Configuration**
```powershell
# Copy environment template
cp .env.example .env

# Edit .env file with your database credentials
# Update DATABASE_URL if using different credentials/host
```

**3. Python Dependencies**
```powershell
# Install required packages
pip install -r requirements.txt
```

**4. Database Schema & Data**
```powershell
# Create database tables
python scripts/database_architecture_setup.py

# Seed with questions (tries API first, falls back to hardcoded)
python scripts/seed_data.py
```

**5. Start Service**
```powershell
python run.py
```

### Option 2: Infrastructure Scripts

```powershell
# From project root - sets up all services including database
python infrastructure/scripts/setup-infrastructure.py
```

## Data Population

**Primary Seeding Script:**
```powershell
# API-first seeding (10 questions from API, fallback to hardcoded)
python scripts/seed_data.py
```
- Tries LeetCode API first for fresh questions
- Falls back to 5 hardcoded questions if API fails
- Skips seeding if questions already exist

**Alternative Scripts:**
```powershell
# Production API fetching (30+ questions, requires internet)
python scripts/fetch_questions.py

# Database setup (creates tables)
python scripts/database_architecture_setup.py
```

## API Endpoints

**Base URL:** `http://localhost:8003`

### Question Management
- `GET /api/v1/questions/` - List questions (with pagination and filtering)
- `GET /api/v1/questions/{id}` - Get specific question
- `GET /api/v1/questions/{id}/preview` - Preview question (user view)
- `POST /api/v1/questions/` - Create question (Admin only)
- `PUT /api/v1/questions/{id}` - Update question (Admin only)
- `DELETE /api/v1/questions/{id}` - Delete question (Admin only)
- `PUT /api/v1/questions/{id}/toggle-status` - Enable/disable question (Admin only)

### Advanced Filtering
- `GET /api/v1/questions/filter/topics-difficulty` - Filter by topics and/or difficulty
  - Query Parameters:
    - `topics` (optional): Array of topic strings (e.g., `topics=Array&topics=Hash Table`)
    - `difficulty` (optional): Difficulty level (`easy`, `medium`, `hard`)
  - Examples:
    - Filter by difficulty only: `/api/v1/questions/filter/topics-difficulty?difficulty=easy`
    - Filter by topics only: `/api/v1/questions/filter/topics-difficulty?topics=Array&topics=String`
    - Combined filtering: `/api/v1/questions/filter/topics-difficulty?difficulty=medium&topics=Dynamic Programming`

### Standard Filtering (via /questions endpoint)
- Query Parameters:
  - `skip` - Number of items to skip (pagination)
  - `limit` - Number of items to return (max 100)
  - `difficulty` - Filter by difficulty level
  - `topics` - Filter by topics (comma-separated)
  - `search` - Search in title and description

**Interactive Documentation:** http://localhost:8003/docs

## Question JSON Format

### Question Response Format
```json
{
  "id": 1,
  "title": "Two Sum",
  "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
  "difficulty": "easy",
  "topics": ["Array", "Hash Table"],
  "examples": [
    {
      "input": "[2,7,11,15], target = 9",
      "output": "[0,1]",
      "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
    }
  ],
  "constraints": "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.",
  "test_cases": [
    {
      "input": {"nums": [2, 7, 11, 15], "target": 9},
      "output": [0, 1]
    }
  ],
  "images": ["https://example.com/diagram.png"],
  "is_active": true,
  "created_at": "2025-10-16T07:00:00Z",
  "updated_at": "2025-10-16T07:00:00Z"
}
```

### Question Creation Format (POST)
```json
{
  "title": "Two Sum",
  "description": "Given an array of integers nums and an integer target...",
  "difficulty": "easy",
  "topics": ["Array", "Hash Table"],
  "examples": [
    {
      "input": "[2,7,11,15], target = 9",
      "output": "[0,1]",
      "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
    }
  ],
  "constraints": "2 <= nums.length <= 10^4",
  "test_cases": [
    {
      "input": {"nums": [2, 7, 11, 15], "target": 9},
      "output": [0, 1]
    }
  ],
  "images": ["https://example.com/diagram.png"],
  "is_active": true
}
```

### Field Descriptions
- **`id`**: Unique identifier (auto-generated)
- **`title`**: Question title (1-255 characters)
- **`description`**: Question description (can be empty string)
- **`difficulty`**: Difficulty level (`"easy"`, `"medium"`, `"hard"`)
- **`topics`**: Array of topic strings (at least 1 required)
- **`examples`**: Array of example objects with input, output, and explanation
- **`constraints`**: Optional constraints text
- **`test_cases`**: Array of test case objects for validation
- **`images`**: Optional array of image URLs (JPEG, PNG, SVG only)
- **`is_active`**: Boolean flag for question visibility
- **`created_at`**: Timestamp when question was created (response only)
- **`updated_at`**: Timestamp when question was last modified (response only)

## Development

**Database Migrations:**
```powershell
alembic upgrade head
```

**Testing:**
```powershell
pytest test_service.py -v
```

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `USER_SERVICE_URL` - User service API URL for auth calls (default: http://localhost:8001)
- `ENV` - Environment (dev/staging/prod)
- `PORT` - Service port (default: 8003)

**Package Notes:**
- Uses `psycopg[binary]` (psycopg3) instead of psycopg2-binary for better Windows compatibility
- All tests should pass with proper database connection
- Authentication currently uses placeholder functions - ready for User Service integration

**Testing the API:**
```powershell
# Test basic questions list
Invoke-WebRequest -Uri "http://localhost:8003/api/v1/questions" -Method GET

# Test new filtering endpoint
Invoke-WebRequest -Uri "http://localhost:8003/api/v1/questions/filter/topics-difficulty?difficulty=easy&topics=Array" -Method GET
```

## Troubleshooting

**Database Connection Issues:**
- Verify PostgreSQL is running
- Check DATABASE_URL in .env file
- Ensure database exists

**Import Errors:**
- Run `pip install -r requirements.txt`
- Check Python version (3.8+ required)

**Port Conflicts:**
- Change PORT in .env file
- Kill existing processes on port 8003

**Seeding Failures:**
- API timeouts will automatically fallback to hardcoded questions (5 questions)
- Check internet connection for API-based seeding (10 questions)
- Verify database connection before seeding
- Script skips seeding if questions already exist

**psycopg2 Installation Issues:**
- Use `pip install "psycopg[binary]"` instead of psycopg2-binary
- psycopg3 provides better Windows compatibility without requiring PostgreSQL dev tools