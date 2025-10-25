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
        self.question_slugs = []
        self.current_index = 0
        
    def log(self, message: str, level: str = "INFO"):
        """Log with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
    
    def get_question_list(self) -> bool:
        """Fetch the list of all question slugs"""
        try:
            self.log("Fetching question list from LeetCode API...")
            response = requests.get(
                f"{ALFA_LEETCODE_API}/problems",
                params={"limit": 3000},  # Get as many as possible
                timeout=REQUEST_TIMEOUT
            )
            
            if response.status_code == 200:
                data = response.json()
                problems = data.get('problemsetQuestionList', [])
                self.question_slugs = [p.get('titleSlug') for p in problems if p.get('titleSlug')]
                self.log(f"Found {len(self.question_slugs)} questions available")
                return True
            else:
                self.log(f"Failed to fetch question list: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Error fetching question list: {e}", "ERROR")
            return False
    
    def check_if_exists(self, title: str) -> bool:
        """Check if question already exists in database"""
        existing = self.db.query(Question).filter(Question.title == title).first()
        return existing is not None
    
    def fetch_question_details(self, title_slug: str) -> Optional[Dict[str, Any]]:
        """Fetch detailed information for a single question"""
        try:
            response = requests.get(
                f"{ALFA_LEETCODE_API}/select",
                params={"titleSlug": title_slug},
                timeout=REQUEST_TIMEOUT
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                self.log(f"Failed to fetch {title_slug}: HTTP {response.status_code}", "WARN")
                return None
                
        except requests.RequestException as e:
            self.log(f"Network error fetching {title_slug}: {e}", "WARN")
            return None
        except Exception as e:
            self.log(f"Unexpected error fetching {title_slug}: {e}", "ERROR")
            return None
    
    def parse_and_save_question(self, detail_data: Dict[str, Any]) -> bool:
        """Parse question data and save to database"""
        try:
            title = detail_data.get('title', 'Untitled')
            
            # Check for duplicates
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
            
            # Parse examples
            examples = []
            if 'exampleTestcases' in detail_data and detail_data['exampleTestcases']:
                test_cases = detail_data.get('exampleTestcases', '').strip().split('\n')
                for i in range(0, len(test_cases), 2):
                    if i + 1 < len(test_cases):
                        examples.append({
                            "input": test_cases[i].strip(),
                            "output": test_cases[i + 1].strip(),
                            "explanation": ""
                        })
            
            # Create question object
            question = Question(
                title=title,
                description=detail_data.get('content', '').replace('<p>', '').replace('</p>', '\n').replace('<strong>', '**').replace('</strong>', '**'),
                difficulty=difficulty,
                topics=json.dumps(topics),
                examples=json.dumps(examples) if examples else None,
                constraints=detail_data.get('constraints', ''),
                test_cases=json.dumps(examples) if examples else None,  # Use examples as test cases
                is_active=True
            )
            
            self.db.add(question)
            self.db.commit()
            
            self.log(f"✓ Saved: '{title}' ({difficulty_str}, {len(topics)} topics)")
            self.fetched_count += 1
            return True
            
        except IntegrityError:
            self.db.rollback()
            self.log(f"Duplicate detected for '{title}', skipping", "WARN")
            self.duplicate_count += 1
            return True
        except Exception as e:
            self.db.rollback()
            self.log(f"Error saving question: {e}", "ERROR")
            return False
    
    def fetch_single_question_with_retry(self, title_slug: str) -> bool:
        """Fetch a single question with retry logic"""
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                # Fetch question details
                detail_data = self.fetch_question_details(title_slug)
                
                if detail_data:
                    # Parse and save
                    success = self.parse_and_save_question(detail_data)
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
        print(f"📝 Questions processed: {self.current_index}/{len(self.question_slugs)}")
        if self.current_index > 0:
            progress = (self.current_index / len(self.question_slugs)) * 100
            print(f"📈 Progress: {progress:.1f}%")
        print("="*60 + "\n")
    
    def run(self):
        """Main loop - fetch questions continuously"""
        try:
            self.log("🚀 Starting continuous question fetcher...")
            self.log(f"Configuration: {DELAY_BETWEEN_QUESTIONS}s delay, {MAX_RETRIES} retries")
            
            # Get list of all questions
            if not self.get_question_list():
                self.log("Failed to get question list. Exiting.", "ERROR")
                return
            
            if not self.question_slugs:
                self.log("No questions found to fetch. Exiting.", "ERROR")
                return
            
            self.log(f"Starting to fetch {len(self.question_slugs)} questions...")
            self.log("Press Ctrl+C to stop gracefully\n")
            
            # Infinite loop through questions
            while True:
                # Get next question slug
                title_slug = self.question_slugs[self.current_index]
                
                self.log(f"[{self.current_index + 1}/{len(self.question_slugs)}] Fetching: {title_slug}")
                
                # Fetch with retry
                self.fetch_single_question_with_retry(title_slug)
                
                # Move to next question
                self.current_index += 1
                
                # If we've gone through all questions, start over
                if self.current_index >= len(self.question_slugs):
                    self.log("Reached end of question list, starting over from beginning...")
                    self.current_index = 0
                
                # Print stats every 10 questions
                if (self.current_index) % 10 == 0:
                    self.print_stats()
                
                # Rate limiting delay
                self.log(f"Waiting {DELAY_BETWEEN_QUESTIONS}s before next fetch...")
                time.sleep(DELAY_BETWEEN_QUESTIONS)
                
        except KeyboardInterrupt:
            self.log("\n\n🛑 Received shutdown signal (Ctrl+C)", "INFO")
            self.print_stats()
            self.log("Shutting down gracefully...", "INFO")
        except Exception as e:
            self.log(f"Fatal error: {e}", "ERROR")
            self.print_stats()
        finally:
            self.db.close()
            self.log("Database connection closed. Goodbye! 👋", "INFO")


if __name__ == "__main__":
    fetcher = QuestionFetcher()
    fetcher.run()
