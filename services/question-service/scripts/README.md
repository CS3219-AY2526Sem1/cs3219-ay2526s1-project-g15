# Question Service Scripts

## Automated Setup (Recommended)

The easiest way to get started - everything is done automatically:

```powershell
# From project root - this automatically:
# 1. Starts PostgreSQL infrastructure
# 2. Creates databases
# 3. Generates .env.dev file
# 4. Seeds database with sample questions
py infrastructure/scripts/setup-infrastructure.py

# Then just start the service
cd services/question-service
py run.py
```

## Manual Scripts (if needed)

### Database Setup
- `database_architecture_setup.py` - Verify database connection and create tables

### Data Population (choose one)
- `seed_data.py` - **Auto-run during setup**: Quick setup with 6 sample questions for development
- `populate_questions.py` - Extended set with 20+ questions for more comprehensive testing
- `fetch_questions.py` - Fetch questions from external APIs (requires API keys)

## Manual Usage (if not using automated setup)

```powershell
# 1. Setup database
py scripts/database_architecture_setup.py

# 2. Add sample data (choose one)
py scripts/seed_data.py              # Quick dev setup (or use automated setup)
py scripts/populate_questions.py    # More comprehensive
py scripts/fetch_questions.py       # External data (requires setup)
```