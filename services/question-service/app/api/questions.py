from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.auth import verify_token, require_admin
from app.schemas.question import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    QuestionMinimal,
    QuestionList,
    QuestionFilter
)
from app.services.question_service import QuestionService
from app.models.question import DifficultyLevel
import math

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    question: QuestionCreate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(require_admin)
):
    """Create a new question (Admin only)"""
    return QuestionService.create_question(db=db, question_data=question)


@router.get("/", response_model=QuestionList)
def get_questions(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    difficulty: Optional[DifficultyLevel] = Query(None, description="Filter by difficulty"),
    topics: Optional[List[str]] = Query(None, description="Filter by topics"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Get questions with pagination and filtering"""
    skip = (page - 1) * per_page

    filters = QuestionFilter(difficulty=difficulty, topics=topics, search=search)
    questions, total = QuestionService.get_questions(
        db=db, skip=skip, limit=per_page, filters=filters
    )

    total_pages = math.ceil(total / per_page) if total > 0 else 1

    return QuestionList(
        questions=questions,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Get a specific question by ID"""
    question = QuestionService.get_question(db=db, question_id=question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    return question


@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: int,
    question: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update a question"""
    updated_question = QuestionService.update_question(
        db=db, question_id=question_id, question_data=question
    )
    if not updated_question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    return updated_question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete a question"""
    success = QuestionService.delete_question(db=db, question_id=question_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )


@router.put("/{question_id}/toggle-status", response_model=QuestionResponse)
def toggle_question_status(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Toggle question visibility (enable/disable)"""
    question = QuestionService.get_question(db=db, question_id=question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )


    update_data = QuestionUpdate(is_active=not question.is_active)
    updated_question = QuestionService.update_question(
        db=db, question_id=question_id, question_data=update_data
    )

    return updated_question


@router.get("/{question_id}/preview", response_model=QuestionResponse)
def preview_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Preview question as end-users will see it"""
    question = QuestionService.get_question(db=db, question_id=question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    return question


@router.get("/filter/topics-difficulty", response_model=List[QuestionMinimal])
def get_questions_by_topics_and_difficulty(
    topics: Optional[List[str]] = Query(None, description="List of topics to filter by"),
    difficulty: Optional[str] = Query(None, description="Difficulty level (easy, medium, hard)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Get questions filtered by topics and/or difficulty level"""
    try:
        # Use the existing get_questions method with filters
        from app.schemas.question import QuestionFilter

        # Create filter object
        filter_data = {}
        if difficulty:
            # Convert string to DifficultyLevel enum
            filter_data['difficulty'] = DifficultyLevel(difficulty)
        if topics:
            filter_data['topics'] = topics

        filter_obj = QuestionFilter(**filter_data) if filter_data else None

        questions, _ = QuestionService.get_questions(
            db=db, skip=0, limit=100, filters=filter_obj, include_inactive=False
        )
        return questions
    except Exception as e:
        # Log the error for debugging
        print(f"Error in filtering endpoint: {e}")
        # Return all questions as fallback
        questions, _ = QuestionService.get_questions(
            db=db, skip=0, limit=100, filters=None, include_inactive=False
        )
        return questions