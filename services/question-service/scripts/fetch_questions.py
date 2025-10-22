"""
Script to fetch programming questions from public APIs and populate the database
"""
import requests
import json
import time
from sqlalchemy.orm import Session

# Add the parent directory to Python path to access app modules
import os
import sys
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from app.core.database import SessionLocal, engine
from app.models.question import Question, DifficultyLevel
from app.core.database import Base

# API Configuration
ALFA_LEETCODE_API = "https://alfa-leetcode-api.onrender.com"
DELAY_BETWEEN_REQUESTS = 1  # seconds to respect rate limiting

def map_difficulty(difficulty_str):
    """Map API difficulty strings to our enum"""
    difficulty_map = {
        "Easy": DifficultyLevel.EASY,
        "Medium": DifficultyLevel.MEDIUM,
        "Hard": DifficultyLevel.HARD
    }
    return difficulty_map.get(difficulty_str, DifficultyLevel.MEDIUM)

def fetch_problems_from_alfa_api(limit=50):
    """
    Fetch problems from Alfa LeetCode API
    Enhanced to extract comprehensive test case data
    """
    print(f"Fetching {limit} problems from Alfa LeetCode API...")

    try:
        # Get list of problems
        response = requests.get(f"{ALFA_LEETCODE_API}/problems?limit={limit}")
        response.raise_for_status()

        problems_data = response.json()
        print(f"Successfully fetched {len(problems_data.get('problemsetQuestionList', []))} problems")

        questions = []
        problem_list = problems_data.get('problemsetQuestionList', [])

        for idx, problem in enumerate(problem_list[:limit]):
            print(f"Processing problem {idx + 1}/{min(limit, len(problem_list))}: {problem.get('title', 'Unknown')}")

            # Get detailed problem info
            title_slug = problem.get('titleSlug')
            if title_slug:
                try:
                    detail_response = requests.get(f"{ALFA_LEETCODE_API}/select?titleSlug={title_slug}")
                    if detail_response.status_code == 200:
                        detail_data = detail_response.json()

                        # Extract problem details
                        question_data = {
                            "title": problem.get('title', ''),
                            "description": detail_data.get('content', '').replace('<p>', '').replace('</p>', '\n').replace('<strong>', '**').replace('</strong>', '**'),
                            "difficulty": map_difficulty(problem.get('difficulty', 'Medium')),
                            "topics": detail_data.get('topicTags', []),
                            "examples": [],
                            "constraints": detail_data.get('constraints', ''),
                            "is_active": True
                        }

                        # Extract examples from API and use them as test cases for PeerPrep
                        examples = []
                        test_cases = []

                        if 'exampleTestcases' in detail_data:
                            raw_test_cases = detail_data.get('exampleTestcases', '').strip().split('\n')

                            # Parse test cases - format is usually input/output pairs
                            for i in range(0, len(raw_test_cases), 2):
                                if i + 1 < len(raw_test_cases):
                                    input_data = raw_test_cases[i].strip()
                                    expected_output = raw_test_cases[i + 1].strip()

                                    # Add to examples for display in problem description
                                    example = {
                                        "input": input_data,
                                        "output": expected_output,
                                        "explanation": ""
                                    }
                                    examples.append(example)

                                    # Use the same examples as test cases for PeerPrep validation
                                    # Try to parse as structured data for better validation
                                    try:
                                        import ast
                                        # Attempt to parse input and output as Python literals
                                        parsed_input = ast.literal_eval(input_data)
                                        parsed_output = ast.literal_eval(expected_output)

                                        test_case = {
                                            "input": parsed_input,
                                            "output": parsed_output
                                        }
                                    except:
                                        # If parsing fails, store as strings (still usable for comparison)
                                        test_case = {
                                            "input": input_data,
                                            "output": expected_output
                                        }

                                    test_cases.append(test_case)

                            question_data["examples"] = examples
                            question_data["test_cases"] = test_cases

                        # Fallback: if no exampleTestcases, look for other sample data
                        if not examples and 'sampleTestCase' in detail_data:
                            sample_test = detail_data.get('sampleTestCase', '')
                            if sample_test:
                                example = {
                                    "input": sample_test,
                                    "output": "See problem description",
                                    "explanation": "Sample from API"
                                }
                                examples.append(example)

                                # Also add as test case
                                test_cases.append({
                                    "input": sample_test,
                                    "output": "See problem description"
                                })

                                question_data["examples"] = examples
                                question_data["test_cases"] = test_cases

                        questions.append(question_data)

                    time.sleep(DELAY_BETWEEN_REQUESTS)  # Respect rate limiting

                except Exception as e:
                    print(f"Error fetching details for {title_slug}: {e}")
                    continue

        return questions

    except requests.RequestException as e:
        print(f"Error fetching from Alfa LeetCode API: {e}")
        return []

def fetch_sample_problems():
    """
    Fallback: Create sample problems if API fails
    """
    print("Using fallback sample problems...")

    return [
        {
            "title": "Valid Parentheses",
            "description": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if: Open brackets must be closed by the same type of brackets. Open brackets must be closed in the correct order.",
            "difficulty": DifficultyLevel.EASY,
            "topics": ["String", "Stack"],
            "examples": [
                {
                    "input": "s = \"()\"",
                    "output": "true",
                    "explanation": "The string has valid parentheses."
                },
                {
                    "input": "s = \"()[]{}\"",
                    "output": "true",
                    "explanation": "All brackets are properly closed."
                }
            ],
            "constraints": "1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}'."
        },
        {
            "title": "Longest Substring Without Repeating Characters",
            "description": "Given a string s, find the length of the longest substring without repeating characters.",
            "difficulty": DifficultyLevel.MEDIUM,
            "topics": ["Hash Table", "String", "Sliding Window"],
            "examples": [
                {
                    "input": "s = \"abcabcbb\"",
                    "output": "3",
                    "explanation": "The answer is \"abc\", with the length of 3."
                }
            ],
            "constraints": "0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces."
        },
        {
            "title": "Median of Two Sorted Arrays",
            "description": "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).",
            "difficulty": DifficultyLevel.HARD,
            "topics": ["Array", "Binary Search", "Divide and Conquer"],
            "examples": [
                {
                    "input": "nums1 = [1,3], nums2 = [2]",
                    "output": "2.00000",
                    "explanation": "merged array = [1,2,3] and median is 2."
                }
            ],
            "constraints": "nums1.length == m\nnums2.length == n\n0 <= m <= 1000\n0 <= n <= 1000"
        }
    ]

def save_questions_to_db(questions):
    """Save questions to the database"""
    print(f"💾 Saving {len(questions)} questions to database...")

    db = SessionLocal()
    try:
        saved_count = 0
        for question_data in questions:
            # Check if question already exists
            existing = db.query(Question).filter(Question.title == question_data["title"]).first()
            if existing:
                print(f"Skipping existing question: {question_data['title']}")
                continue

            # Create new question
            question = Question(
                title=question_data["title"],
                description=question_data["description"],
                difficulty=question_data["difficulty"],
                topics=json.dumps(question_data["topics"]),
                examples=json.dumps(question_data["examples"]),
                constraints=question_data.get("constraints", ""),
                is_active=question_data.get("is_active", True)
            )

            db.add(question)
            saved_count += 1
            print(f"Added: {question_data['title']}")

        db.commit()
        print(f"Successfully saved {saved_count} new questions to database!")

    except Exception as e:
        db.rollback()
        print(f"Error saving to database: {e}")
    finally:
        db.close()

def main():
    """Main function to fetch and save questions"""
    print("Starting question fetching process...")

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Try to fetch from API first
    questions = fetch_problems_from_alfa_api(limit=30)

    # Fallback to sample problems if API fails
    if not questions:
        print("API fetch failed, using sample problems...")
        questions = fetch_sample_problems()

    # Save to database
    if questions:
        save_questions_to_db(questions)
    else:
        print("No questions to save!")

    print("Process completed!")

if __name__ == "__main__":
    main()