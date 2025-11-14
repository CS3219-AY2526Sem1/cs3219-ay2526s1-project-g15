from http.client import HTTPException
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.db.session import get_session
from app.models.attempt import Attempt, UserQuestionStatus
from app.schemas.attempt import AttemptCreate, AttemptOut, AttemptRead, AttemptSummary
from app.routers.users import get_current_user

router = APIRouter(prefix="/api/v1/attempts", tags=["attempts"])

@router.post("/", response_model=AttemptRead, status_code=201)
async def create_attempt(
    payload: AttemptCreate,
    db: AsyncSession = Depends(get_session),
    user=Depends(get_current_user),
):
    a = Attempt(
        user_id=user.id,
        question_id=payload.question_id,
        language=payload.language,
        submitted_code=payload.submitted_code,
        passed_tests=payload.passed_tests,
        total_tests=payload.total_tests,
    )
    db.add(a)

    if payload.passed_tests >= payload.total_tests:
        res = await db.execute(
            select(UserQuestionStatus).where(
                UserQuestionStatus.user_id == user.id,
                UserQuestionStatus.question_id == payload.question_id,
            )
        )
        row = res.scalar_one_or_none()
        if row is None:
            row = UserQuestionStatus(
                user_id=user.id,
                question_id=payload.question_id,
                solved_at=func.now(),
            )
            db.add(row)
        else:
            if row.solved_at is None:
                row.solved_at = func.now()

    await db.commit()
    await db.refresh(a)

    return AttemptRead(
        id=a.id,
        question_id=a.question_id,
        language=a.language,
        passed_tests=a.passed_tests,
        total_tests=a.total_tests,
        created_at=a.created_at,
        is_solved=(a.passed_tests == a.total_tests),
    )

@router.get("/me", response_model=list[AttemptRead])
async def list_my_attempts(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_session),
    user=Depends(get_current_user),
):
    res = await db.execute(
        select(Attempt)
        .where(Attempt.user_id == user.id)
        .order_by(Attempt.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = res.scalars().all()
    return [
        AttemptRead(
            id=r.id,
            question_id=r.question_id,
            language=r.language,
            passed_tests=r.passed_tests,
            total_tests=r.total_tests,
            created_at=r.created_at,
            is_solved=(r.passed_tests == r.total_tests),
        )
        for r in rows
    ]

@router.get("/me/summary", response_model=AttemptSummary)
async def attempts_summary(
    db: AsyncSession = Depends(get_session),
    user=Depends(get_current_user),
):
    res = await db.execute(
        select(
            func.count(),
            func.sum(case((Attempt.passed_tests == Attempt.total_tests, 1), else_=0)),
            func.max(Attempt.created_at),
        ).where(Attempt.user_id == user.id)
    )
    total, solved, last = res.one()
    return AttemptSummary(
        total_attempts=int(total or 0),
        solved=int(solved or 0),
        last_attempt_at=last,
    )

@router.get("/{attempt_id}", response_model=AttemptOut)
async def get_attempt(
    attempt_id: str,
    db: AsyncSession = Depends(get_session),
    user=Depends(get_current_user),
):
    res = await db.execute(
        select(Attempt)
        .where(Attempt.user_id == user.id, Attempt.id == attempt_id)
        .order_by(Attempt.created_at.desc())
        .limit(1)
    )
    attempt = res.scalars().first()
    if attempt is None:
        raise HTTPException(status_code=404, detail="No attempt found")
    return attempt
