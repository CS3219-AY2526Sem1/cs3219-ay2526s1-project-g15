# Continuous Question Fetcher

This script continuously fetches LeetCode questions one at a time until manually stopped.

## Features
- ✅ Fetches questions one at a time with rate limiting
- ✅ Automatic retry (3 attempts per question)
- ✅ Duplicate detection (skips existing questions)
- ✅ Progress tracking and statistics
- ✅ Graceful shutdown with Ctrl+C
- ✅ Infinite loop (cycles through all questions repeatedly)

## Configuration

Edit `scripts/continuous_fetch.py` to adjust:
```python
DELAY_BETWEEN_QUESTIONS = 5  # seconds between successful fetches
RETRY_DELAY = 10             # seconds between retries
MAX_RETRIES = 3              # attempts per question
```

## Usage

### On Your Server (Cloud SQL):

1. **Update DATABASE_URL** in `.env` or set environment variable:
```bash
export DATABASE_URL="postgresql://user:password@<cloud-sql-ip>:5432/peerprep_questions"
```

2. **Run the script**:
```bash
cd services/question-service
python scripts/continuous_fetch.py
```

3. **Let it run** - it will fetch questions continuously

4. **Stop when done** - Press `Ctrl+C` to stop gracefully

### Output Example:
```
[2025-10-25 20:30:00] [INFO] 🚀 Starting continuous question fetcher...
[2025-10-25 20:30:00] [INFO] Configuration: 5s delay, 3 retries
[2025-10-25 20:30:01] [INFO] Found 2500 questions available
[2025-10-25 20:30:01] [INFO] Starting to fetch 2500 questions...
[2025-10-25 20:30:01] [INFO] Press Ctrl+C to stop gracefully

[2025-10-25 20:30:01] [INFO] [1/2500] Fetching: two-sum
[2025-10-25 20:30:02] [INFO] ✓ Saved: 'Two Sum' (Easy, 2 topics)
[2025-10-25 20:30:02] [INFO] Waiting 5s before next fetch...

[2025-10-25 20:30:07] [INFO] [2/2500] Fetching: add-two-numbers
[2025-10-25 20:30:08] [INFO] ✓ Saved: 'Add Two Numbers' (Medium, 3 topics)
...

============================================================
📊 PROGRESS STATISTICS
============================================================
⏱️  Runtime: 01:23:45
✅ Successfully fetched: 450
🔁 Duplicates skipped: 19
❌ Failed/Skipped: 3
📝 Questions processed: 472/2500
📈 Progress: 18.9%
============================================================
```

## Important Notes

### Rate Limiting
- Default: 5 seconds between questions
- Adjust if you get rate limited (increase delay)
- API may have daily/hourly limits

### Database Space
- ~428 KB per question (average)
- 10 GB = ~24,000 questions (plenty of room)
- Script will fail if DB runs out of space
- Monitor with: `SELECT pg_size_pretty(pg_database_size(current_database()));`

### Duplicate Handling
- **Detects duplicates by title only**
- Checks if a question with the same exact title exists in database
- Automatically skips questions already in database
- Safe to restart script multiple times
- Won't create duplicates if titles match exactly

**Important Notes:**
- If an admin manually adds a question with a different title than LeetCode (e.g., "Two Sum Problem" vs "Two Sum"), the script will treat them as separate questions
- If titles match exactly, the script will skip the LeetCode version
- This allows admins to add custom questions without conflicts

### Error Handling
- Retries failed fetches 3 times
- Skips questions that fail all retries
- Continues with next question
- Shows statistics on shutdown

### Stopping the Script
- Press `Ctrl+C` for graceful shutdown
- Shows final statistics
- Safely closes database connection

## Monitoring Database Size

While script is running, check database size:
```bash
python -c "import psycopg; conn = psycopg.connect('YOUR_DATABASE_URL'); cur = conn.cursor(); cur.execute('SELECT pg_size_pretty(pg_database_size(current_database()))'); print('Size:', cur.fetchone()[0]); conn.close()"
```

## Troubleshooting

**"Connection refused"**
- Check DATABASE_URL is correct
- Verify database is accessible
- Check firewall/authorized networks

**"Rate limited"**
- Increase `DELAY_BETWEEN_QUESTIONS`
- Try `10` or `15` seconds

**"Out of disk space"**
- Stop script with Ctrl+C
- Delete old/unwanted questions
- Or increase Cloud SQL disk size

**"Module not found"**
- Ensure you're in the right directory
- Check requirements.txt is installed

## Tips

- Run in `screen` or `tmux` to keep running after SSH disconnect
- Redirect output to log file: `python scripts/continuous_fetch.py > fetch.log 2>&1`
- Use `nohup` for background execution: `nohup python scripts/continuous_fetch.py &`
