"""
Enhanced script to seed database with programming questions.
First tries to fetch from API, falls back to hardcoded questions if API fails.
"""

import json
import sys
import os
import requests
import time

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine
from app.core.database import Base
from app.models.question import Question, DifficultyLevel

# API Configuration
ALFA_LEETCODE_API = "https://alfa-leetcode-api.onrender.com"
DELAY_BETWEEN_REQUESTS = 0.5  # seconds to respect rate limiting


def map_difficulty(difficulty_str):
    """Map API difficulty strings to our enum"""
    difficulty_map = {
        "Easy": DifficultyLevel.EASY,
        "Medium": DifficultyLevel.MEDIUM,
        "Hard": DifficultyLevel.HARD
    }
    return difficulty_map.get(difficulty_str, DifficultyLevel.MEDIUM)


def fetch_questions_from_api(limit=10):
    """
    Try to fetch questions from API
    Returns list of questions or empty list if failed
    """
    print(f"Attempting to fetch {limit} questions from API...")

    try:
        # Get list of problems
        response = requests.get(f"{ALFA_LEETCODE_API}/problems?limit={limit}", timeout=10)
        response.raise_for_status()

        problems_data = response.json()
        problem_list = problems_data.get('problemsetQuestionList', [])
        print(f"Found {len(problem_list)} problems from API")

        questions = []

        for idx, problem in enumerate(problem_list[:limit]):
            print(f"Processing {idx + 1}/{limit}: {problem.get('title', 'Unknown')}")

            # Get detailed problem info
            title_slug = problem.get('titleSlug')
            if title_slug:
                try:
                    detail_response = requests.get(f"{ALFA_LEETCODE_API}/select?titleSlug={title_slug}", timeout=10)
                    if detail_response.status_code == 200:
                        detail_data = detail_response.json()

                        # Extract problem details
                        question_data = {
                            "title": problem.get('title', ''),
                            "description": detail_data.get('content', '').replace('<p>', '').replace('</p>', '\n').replace('<strong>', '**').replace('</strong>', '**'),
                            "difficulty": map_difficulty(problem.get('difficulty', 'Medium')),
                            "topics": [tag.get('name', '') for tag in detail_data.get('topicTags', [])],
                            "examples": [],
                            "constraints": detail_data.get('constraints', ''),
                            "is_active": True
                        }

                        # Extract examples if available
                        if 'exampleTestcases' in detail_data:
                            examples = []
                            test_cases = detail_data.get('exampleTestcases', '').split('\n')
                            for i in range(0, len(test_cases), 2):
                                if i + 1 < len(test_cases):
                                    examples.append({
                                        "input": test_cases[i],
                                        "output": test_cases[i + 1],
                                        "explanation": ""
                                    })
                            question_data["examples"] = examples

                        questions.append(question_data)

                    time.sleep(DELAY_BETWEEN_REQUESTS)  # Respect rate limiting

                except Exception as e:
                    print(f"Error fetching details for {title_slug}: {e}")
                    continue

        print(f"Successfully fetched {len(questions)} questions from API")
        return questions

    except Exception as e:
        print(f"API fetch failed: {e}")
        return []


def get_hardcoded_questions():
    """Hardcoded programming problems as fallback when API fails"""
    return [
        {
            "title": "Two Sum",
            "description": "Given an array of integers nums and an integer target, return indices of two numbers that add up to target.",
            "difficulty": DifficultyLevel.EASY,
            "topics": ["Array", "Hash Table"],
            "examples": [
                {
                    "input": "nums = [2,7,11,15], target = 9",
                    "output": "[0,1]",
                    "explanation": "nums[0] + nums[1] == 9"
                }
            ],
            "constraints": "2 <= nums.length <= 10^4"
        },
        {
            "title": "Reverse Linked List",
            "description": "Given the head of a singly linked list, reverse the list, and return the reversed list.",
            "difficulty": DifficultyLevel.EASY,
            "topics": ["Linked List", "Recursion"],
            "examples": [
                {
                    "input": "head = [1,2,3,4,5]",
                    "output": "[5,4,3,2,1]",
                    "explanation": "The linked list is reversed."
                }
            ],
            "constraints": "The number of nodes in the list is the range [0, 5000]."
        },
        {
            "title": "Maximum Subarray",
            "description": "Given an integer array nums, find the contiguous subarray with the largest sum and return its sum.",
            "difficulty": DifficultyLevel.MEDIUM,
            "topics": ["Array", "Dynamic Programming"],
            "examples": [
                {
                    "input": "nums = [-2,1,-3,4,-1,2,1,-5,4]",
                    "output": "6",
                    "explanation": "The subarray [4,-1,2,1] has the largest sum of 6."
                }
            ],
            "constraints": "1 <= nums.length <= 10^5"
        },
        {
            "title": "Valid Parentheses",
            "description": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
            "difficulty": DifficultyLevel.EASY,
            "topics": ["String", "Stack"],
            "examples": [
                {
                    "input": "s = \"()\"",
                    "output": "true",
                    "explanation": "The string has valid parentheses."
                }
            ],
            "constraints": "1 <= s.length <= 10^4"
        },
        {
            "title": "Merge Two Sorted Lists",
            "description": "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list.",
            "difficulty": DifficultyLevel.EASY,
            "topics": ["Linked List", "Recursion"],
            "examples": [
                {
                    "input": "list1 = [1,2,4], list2 = [1,3,4]",
                    "output": "[1,1,2,3,4,4]",
                    "explanation": "Merge two sorted linked lists."
                }
            ],
            "constraints": "The number of nodes in both lists is in the range [0, 50]."
        },
        {
            "title": "Best Time to Buy and Sell Stock",
            "description": "You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.",
            "difficulty": DifficultyLevel.EASY,
            "topics": ["Array", "Dynamic Programming"],
            "examples": [
                {
                    "input": "prices = [7,1,5,3,6,4]",
                    "output": "5",
                    "explanation": "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5."
                }
            ],
            "constraints": "1 <= prices.length <= 10^5"
        },
        {
            "title": "3Sum",
            "description": "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.",
            "difficulty": DifficultyLevel.MEDIUM,
            "topics": ["Array", "Two Pointers", "Sorting"],
            "examples": [
                {
                    "input": "nums = [-1,0,1,2,-1,-4]",
                    "output": "[[-1,-1,2],[-1,0,1]]",
                    "explanation": "The distinct triplets that sum to 0."
                }
            ],
            "constraints": "3 <= nums.length <= 3000"
        },
        {
            "title": "Container With Most Water",
            "description": "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container that holds the most water.",
            "difficulty": DifficultyLevel.MEDIUM,
            "topics": ["Array", "Two Pointers", "Greedy"],
            "examples": [
                {
                    "input": "height = [1,8,6,2,5,4,8,3,7]",
                    "output": "49",
                    "explanation": "The above vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water the container can contain is 49."
                }
            ],
            "constraints": "n >= 2, 1 <= height[i] <= 10^4"
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
            "constraints": "0 <= s.length <= 5 * 10^4"
        },
        {
            "title": "Add Two Numbers",
            "description": "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.",
            "difficulty": DifficultyLevel.MEDIUM,
            "topics": ["Linked List", "Math", "Recursion"],
            "examples": [
                {
                    "input": "l1 = [2,4,3], l2 = [5,6,4]",
                    "output": "[7,0,8]",
                    "explanation": "342 + 465 = 807."
                }
            ],
            "constraints": "The number of nodes in each linked list is in the range [1, 100]."
        },
        {
            "title": "Palindromic Substrings",
            "description": "Given a string s, return the number of palindromic substrings in it. A string is a palindrome when it reads the same backward as forward.",
            "difficulty": DifficultyLevel.MEDIUM,
            "topics": ["String", "Dynamic Programming"],
            "examples": [
                {
                    "input": "s = \"abc\"",
                    "output": "3",
                    "explanation": "Three palindromic strings: \"a\", \"b\", \"c\"."
                }
            ],
            "constraints": "1 <= s.length <= 1000"
        }
    ]


def seed_database():
    """Seed the database with questions - API first, hardcoded fallback"""
    print("Starting database seeding...")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing_count = db.query(Question).count()
        if existing_count > 0:
            print(f"Database already contains {existing_count} questions. Skipping seed.")
            return

        # Try API first
        print("Strategy: API first (15 questions), hardcoded fallback")
        questions = fetch_questions_from_api(limit=15)

        # Fallback to hardcoded if API failed
        if not questions:
            print("API failed, using hardcoded questions...")
            questions = get_hardcoded_questions()

        saved_count = 0

        for question_data in questions:
            existing = db.query(Question).filter(Question.title == question_data["title"]).first()
            if existing:
                print(f"Skipping existing question: {question_data['title']}")
                continue

            db_question = Question(
                title=question_data["title"],
                description=question_data["description"],
                difficulty=question_data["difficulty"],
                topics=json.dumps(question_data["topics"]),
                examples=json.dumps(question_data["examples"]),
                constraints=question_data.get("constraints", ""),
                is_active=True
            )
            db.add(db_question)
            saved_count += 1

        db.commit()
        print(f"Successfully seeded database with {saved_count} questions.")

        total_questions = db.query(Question).count()
        print(f"Total questions in database: {total_questions}")

        # Show difficulty breakdown
        easy_count = db.query(Question).filter(Question.difficulty == DifficultyLevel.EASY).count()
        medium_count = db.query(Question).filter(Question.difficulty == DifficultyLevel.MEDIUM).count()
        hard_count = db.query(Question).filter(Question.difficulty == DifficultyLevel.HARD).count()

        print(f"Difficulty breakdown:")
        print(f"   Easy: {easy_count}")
        print(f"   Medium: {medium_count}")
        print(f"   Hard: {hard_count}")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
