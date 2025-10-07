"""Custom exceptions for Question Service"""
from typing import Optional


class QuestionServiceError(Exception):
    """Base exception for Question Service"""

    def __init__(self, message: str, code: Optional[str] = None):
        self.message = message
        self.code = code
        super().__init__(self.message)


class QuestionNotFoundError(QuestionServiceError):
    """Raised when a question is not found"""

    def __init__(self, question_id: int):
        super().__init__(f"Question with ID {question_id} not found", "QUESTION_NOT_FOUND")
        self.question_id = question_id


class QuestionValidationError(QuestionServiceError):
    """Raised when question data validation fails"""

    def __init__(self, field: str, message: str):
        super().__init__(f"Validation error for {field}: {message}", "VALIDATION_ERROR")
        self.field = field


class DatabaseError(QuestionServiceError):
    """Raised when database operations fail"""

    def __init__(self, operation: str, original_error: Exception):
        super().__init__(f"Database {operation} failed: {str(original_error)}", "DATABASE_ERROR")
        self.operation = operation
        self.original_error = original_error