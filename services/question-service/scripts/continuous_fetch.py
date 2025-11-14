"""
Continuous Question Fetcher for PeerPrep Question Service

Fetches LeetCode questions one at a time indefinitely until manually stopped.
Features:
- Rate limiting with configurable delays
- Retry logic (3 attempts per question)
- Duplicate detection
- Graceful shutdown on Ctrl+C
- Progress tracking
"""

import requests
import time
import json
import sys
import os
from datetime import datetime
from typing import Optional, Dict, Any

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.question import Question, DifficultyLevel
from sqlalchemy.exc import IntegrityError

# Configuration
ALFA_LEETCODE_API = "https://alfa-leetcode-api.onrender.com"
DELAY_BETWEEN_QUESTIONS = 5  # seconds between successful fetches
RETRY_DELAY = 10  # seconds between retries
MAX_RETRIES = 3
REQUEST_TIMEOUT = 30  # seconds
MAX_QUESTIONS = 1000  # Maximum number of questions to fetch (set to None for unlimited)

# Difficulty mapping
DIFFICULTY_MAP = {
    "Easy": DifficultyLevel.EASY,
    "Medium": DifficultyLevel.MEDIUM,
    "Hard": DifficultyLevel.HARD
}


class QuestionFetcher:
    def __init__(self):
        self.db = SessionLocal()
        self.fetched_count = 0
        self.skipped_count = 0
        self.duplicate_count = 0
        self.error_count = 0
        self.start_time = datetime.now()
        self.current_skip = 0  # For batch pagination
        self.BATCH_SIZE = 5

    def log(self, message: str, level: str = "INFO"):
        """Log with timestamp, safely handling invalid Unicode characters"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        # Replace invalid characters to avoid UnicodeEncodeError
        safe_message = message.encode("utf-8", errors="replace").decode("utf-8")
        print(f"[{timestamp}] [{level}] {safe_message}")

    def fetch_questions_batch(self, skip: int, limit: int) -> list:
        """Fetch a batch of questions using skip/limit"""
        try:
            print(f"[DEBUG] About to request: {ALFA_LEETCODE_API}/problems?limit={limit}&skip={skip}")
            response = requests.get(
                f"{ALFA_LEETCODE_API}/problems",
                params={"limit": limit, "skip": skip},
                timeout=REQUEST_TIMEOUT
            )
            print(f"[DEBUG] Response received: status_code={response.status_code}")
            if response.status_code == 200:
                data = response.json()
                problems = data.get('problemsetQuestionList', [])
                print(f"[DEBUG] Batch size received: {len(problems)}")
                return problems
            print(f"[DEBUG] No problems found or bad status code.")
            return []
        except Exception as e:
            self.log(f"Error fetching batch (skip={skip}): {e}", "ERROR")
            return []

    def check_if_exists(self, title: str) -> bool:
        """Check if question already exists in database"""
        existing = self.db.query(Question).filter(Question.title == title).first()
        return existing is not None

    def fetch_question_details(self, title_slug: str) -> Optional[Dict[str, Any]]:
        """Fetch detailed information for a single question"""
        try:
            print(f"[DEBUG] About to request: {ALFA_LEETCODE_API}/select?titleSlug={title_slug}")
            response = requests.get(
                f"{ALFA_LEETCODE_API}/select",
                params={"titleSlug": title_slug},
                timeout=REQUEST_TIMEOUT
            )
            print(f"[DEBUG] Response received from /select: status_code={response.status_code}")

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                self.log(f"Received 429 Too Many Requests for {title_slug}. Waiting 5 minutes before retrying...", "WARN")
                time.sleep(300)  # 5 minutes
                return None
            else:
                self.log(f"Failed to fetch {title_slug}: HTTP {response.status_code}", "WARN")
                return None

        except requests.RequestException as e:
            self.log(f"Network error fetching {title_slug}: {e}", "WARN")
            return None
        except Exception as e:
            self.log(f"Unexpected error fetching {locals().get('title_slug', '<unknown>')}: {e}", "ERROR")
            return None

    def parse_and_save_question(self, problem: Dict[str, Any], detail_data: Dict[str, Any]) -> bool:
        """Parse question data and save to database"""
        try:
            title = problem.get('title', 'Untitled')
            print(f"[DEBUG] DB URL: {os.environ.get('DATABASE_URL')}")

            # Check for duplicates
            print("[DEBUG] Checking for duplicates in DB...")
            if self.check_if_exists(title):
                self.log(f"Question '{title}' already exists, skipping", "INFO")
                self.duplicate_count += 1
                return True

            # Parse difficulty
            difficulty_str = detail_data.get('difficulty', 'Medium')
            difficulty = DIFFICULTY_MAP.get(difficulty_str, DifficultyLevel.MEDIUM)

            # Parse topics
            topic_tags = detail_data.get('topicTags', [])
            topics = [tag.get('name', '') for tag in topic_tags if tag.get('name')]

            # Parse examples from HTML description
            import re
            from html import unescape

            examples = []
            desc_html = detail_data.get('question', '')
            pre_blocks = re.findall(r'<pre>(.*?)</pre>', desc_html, re.DOTALL)
            for block in pre_blocks:
                block = unescape(block)
                # Only process blocks that contain both Input and Output
                if 'Input:' in block and 'Output:' in block:
                    # Remove HTML tags from block
                    block_clean = re.sub(r'<.*?>', '', block)
                    input_match = re.search(r'Input:\s*(.*?)\n', block_clean)
                    output_match = re.search(r'Output:\s*(.*?)\n', block_clean)
                    input_val = None
                    if input_match:
                        input_str = input_match.group(1).strip()
                        # Use regex to match key = value pairs, allowing for arrays and quoted strings
                        input_dict = {}
                        for m in re.finditer(r'(\w+)\s*=\s*(\[[^\]]*\]|\"[^\"]*\"|[^,]+)', input_str):
                            k, v = m.group(1), m.group(2)
                            input_dict[k] = v.strip().strip('"')
                        if len(input_dict) > 1:
                            input_val = input_dict
                        elif len(input_dict) == 1:
                            input_val = list(input_dict.values())[0]
                        else:
                            input_val = input_str
                    else:
                        input_val = None
                    output_val = output_match.group(1).strip() if output_match else None
                    examples.append({
                        "input": input_val,
                        "output": output_val
                    })

            # Create question object
            question = Question(
                title=title,
                description=detail_data.get('question', ''),  # Store raw HTML
                difficulty=difficulty,
                topics=json.dumps(topics),
                examples=json.dumps(examples) if examples else None,
                constraints=detail_data.get('constraints', ''),
                test_cases=json.dumps(examples) if examples else None,  # Use examples as test cases
                is_active=True
            )

            print("[DEBUG] Adding question to DB session...")
            self.db.add(question)
            print("[DEBUG] About to commit to DB...")
            self.db.commit()
            print("[DEBUG] DB commit successful")

            self.log(f"✓ Saved: '{title}' ({difficulty_str}, {len(topics)} topics)")
            self.fetched_count += 1
            return True

        except IntegrityError as ie:
            print("[DEBUG] IntegrityError encountered, rolling back DB session...")
            self.db.rollback()
            # Use problem title if available, else 'Unknown'
            safe_title = problem.get('title', 'Unknown')
            self.log(f"Duplicate detected for '{safe_title}', skipping", "WARN")
            self.duplicate_count += 1
            return True
        except Exception as e:
            print(f"[DEBUG] Exception encountered: {e}, rolling back DB session...")
            self.db.rollback()
            self.log(f"Error saving question: {e}", "ERROR")
            return False

    def fetch_single_question_with_retry(self, problem: Dict[str, Any]) -> bool:
        """Fetch a single question with retry logic"""
        title_slug = problem.get('titleSlug')
        if not title_slug:
            self.log("No titleSlug found in problem, skipping fetch_question_details", "ERROR")
            self.skipped_count += 1
            return False

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                print(f"[DEBUG] [Attempt {attempt}] About to call fetch_question_details for titleSlug: {title_slug}")
                # Fetch question details
                detail_data = self.fetch_question_details(title_slug)
                print(f"[DEBUG] [Attempt {attempt}] Returned from fetch_question_details for titleSlug: {title_slug}")

                if detail_data:
                    print(f"[DEBUG] [Attempt {attempt}] About to call parse_and_save_question for titleSlug: {title_slug}")
                    success = self.parse_and_save_question(problem, detail_data)
                    print(f"[DEBUG] [Attempt {attempt}] Returned from parse_and_save_question for titleSlug: {title_slug}, success={success}")
                    if success:
                        return True

                # If we got here, fetch failed
                if attempt < MAX_RETRIES:
                    self.log(f"Retry {attempt}/{MAX_RETRIES} for '{title_slug}' in {RETRY_DELAY}s...", "WARN")
                    time.sleep(RETRY_DELAY)
                else:
                    self.log(f"Failed to fetch '{title_slug}' after {MAX_RETRIES} attempts, skipping", "ERROR")
                    self.skipped_count += 1
                    return False

            except KeyboardInterrupt:
                raise
            except Exception as e:
                self.log(f"Unexpected error on attempt {attempt}: {e}", "ERROR")
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_DELAY)
                else:
                    self.skipped_count += 1
                    return False

        return False

    def print_stats(self):
        """Print current statistics"""
        elapsed = (datetime.now() - self.start_time).total_seconds()
        hours = int(elapsed // 3600)
        minutes = int((elapsed % 3600) // 60)
        seconds = int(elapsed % 60)

        print("\n" + "="*60)
        print("📊 PROGRESS STATISTICS")
        print("="*60)
        print(f"⏱️  Runtime: {hours:02d}:{minutes:02d}:{seconds:02d}")
        print(f"✅ Successfully fetched: {self.fetched_count}")
        print(f"🔁 Duplicates skipped: {self.duplicate_count}")
        print(f"❌ Failed/Skipped: {self.skipped_count}")
        print(f"📝 Current batch skip: {self.current_skip}")
        print("="*60 + "\n")

    def run(self):
        """Main loop - fetch questions in batches, then fetch details for each titleSlug"""
        try:
            self.log("\uD83D\uDE80 Starting continuous question fetcher (batch mode)...")
            self.log(f"Configuration: batch size {self.BATCH_SIZE}, {DELAY_BETWEEN_QUESTIONS}s delay, {MAX_RETRIES} retries")

            if MAX_QUESTIONS:
                self.log(f"Will stop after successfully fetching {MAX_QUESTIONS} questions")
            self.log("Press Ctrl+C to stop gracefully\n")

            while True:
                # Check if we've reached the max question limit
                if MAX_QUESTIONS and self.fetched_count >= MAX_QUESTIONS:
                    self.log(f"\n✅ Reached maximum of {MAX_QUESTIONS} questions!", "INFO")
                    self.print_stats()
                    break

                # Fetch a batch of questions
                self.log(f"[Batch skip={self.current_skip}] Fetching batch from API...")
                problems = self.fetch_questions_batch(self.current_skip, self.BATCH_SIZE)

                if not problems:
                    self.log(f"No questions found at skip={self.current_skip}, stopping.", "WARN")
                    break

                for idx, problem in enumerate(problems):
                    if MAX_QUESTIONS and self.fetched_count >= MAX_QUESTIONS:
                        break
                    self.log(f"[Batch {self.current_skip} | {idx+1}/{len(problems)}] Processing: {problem.get('title', 'Unknown')}")
                    self.fetch_single_question_with_retry(problem)
                    # Short delay between detail fetches to respect rate limits
                    time.sleep(DELAY_BETWEEN_QUESTIONS)

                self.current_skip += self.BATCH_SIZE

                # Print stats every 10 questions
                if self.current_skip % 10 == 0:
                    self.print_stats()

        except KeyboardInterrupt:
            self.log("\n\n🛑 Received shutdown signal (Ctrl+C)", "INFO")
            self.print_stats()
            self.log("Shutting down gracefully...", "INFO")
        except Exception as e:
            self.log(f"Fatal error: {e}", "ERROR")
            self.print_stats()

if __name__ == "__main__":
    fetcher = QuestionFetcher()
    fetcher.run()
