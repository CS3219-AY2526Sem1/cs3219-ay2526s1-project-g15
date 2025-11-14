from select import select
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.models.question import Question
from typing import List, Optional
from app.core.database import get_db
from app.core.auth import verify_token, require_admin, get_question_filter_context
from app.schemas.question import (
    QuestionCountResponse,
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    QuestionMinimal,
    QuestionList,
    QuestionFilter
)
from app.services.question_service import QuestionService
from app.models.question import DifficultyLevel

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
    difficulty: Optional[DifficultyLevel] = Query(None, description="Filter by difficulty"),
    topics: Optional[List[str]] = Query(None, description="Filter by topics"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    db: Session = Depends(get_db),
    auth_context: dict = Depends(get_question_filter_context)
):
    """Get all questions with filtering (admins see all, users see active only)"""
    filters = QuestionFilter(difficulty=difficulty, topics=topics, search=search)
    questions, total = QuestionService.get_questions(
        db=db,
        skip=0,
        limit=None,
        filters=filters,
        include_inactive=auth_context["is_admin"]
    )

    return QuestionList(
        questions=questions,
        total=total,
        page=1,
        per_page=total,
        total_pages=1
    )


@router.get("/topics", response_model=List[str])
def get_all_topics(
    db: Session = Depends(get_db),
    auth_context: dict = Depends(get_question_filter_context)
):
    """Get all unique topics from questions (admins see all, users see active only)"""
    topics = QuestionService.get_all_topics(
        db=db,
        include_inactive=auth_context["is_admin"]
    )
    return topics

@router.get("/count", response_model=QuestionCountResponse)
def get_question_count(db: Session = Depends(get_db)):
    """Get the total number of questions"""
    res = db.execute(select(func.count()).select_from(Question))
    total = int(res.scalar_one())
    return QuestionCountResponse(total=total)


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    auth_context: dict = Depends(get_question_filter_context)
):
    """Get a specific question by ID (admins can see inactive questions)"""
    question = QuestionService.get_question(db=db, question_id=question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )

    # Non-admins can only see active questions
    if not auth_context["is_admin"] and not question.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"  # Don't reveal that inactive questions exist
        )

    return question


@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: int,
    question: QuestionUpdate,
    db: Session = Depends(get_db),
    auth_context: dict = Depends(require_admin)
):
    """Update a question (admin only)"""
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
    auth_context: dict = Depends(require_admin)
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
    auth_context: dict = Depends(require_admin)
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


@router.get("/filter/topics-difficulty", response_model=List[QuestionMinimal])
def get_questions_by_topics_and_difficulty(
    topics: Optional[List[str]] = Query(None, description="List of topics to filter by"),
    difficulty: Optional[str] = Query(None, description="Difficulty level (easy, medium, hard)"),
    db: Session = Depends(get_db),
    auth_context: dict = Depends(get_question_filter_context)
):
    """Get questions filtered by topics and/or difficulty (admins see all, users see active only)"""
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
            db=db, skip=0, limit=100, filters=filter_obj, include_inactive=auth_context["is_admin"]
        )
        return questions
    except Exception as e:
        # Log the error for debugging
        print(f"Error in filtering endpoint: {e}")
        # Return all questions as fallback
        questions, _ = QuestionService.get_questions(
            db=db, skip=0, limit=100, filters=None, include_inactive=auth_context["is_admin"]
        )
        return questions