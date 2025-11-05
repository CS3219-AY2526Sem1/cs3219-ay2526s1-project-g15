from uuid import uuid4
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship, column_property
from sqlalchemy import (
    String, DateTime, Integer, SmallInteger, Text, func,
    CheckConstraint, Index, ForeignKey,
)
from app.models.user import Base, User  # reuse your existing Base

class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))

    # tie to user (FK is fine since this is the user-service DB)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    question_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    language: Mapped[str] = mapped_column(String, nullable=False)
    submitted_code: Mapped[str] = mapped_column(Text, nullable=False)
    passed_tests: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    total_tests: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_solved: Mapped[bool] = column_property(passed_tests == total_tests)
    user: Mapped[User] = relationship("User", back_populates="attempts")

    __table_args__ = (
        CheckConstraint("passed_tests >= 0"),
        CheckConstraint("total_tests  >= 0"),
        Index("idx_attempts_user_created", "user_id", "created_at"),
        Index("idx_attempts_user_question", "user_id", "question_id", "created_at"),
    )


class UserQuestionStatus(Base):
    __tablename__ = "user_question_status"

    user_id:  Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    question_id: Mapped[int] = mapped_column(Integer, primary_key=True)

    best_runtime_ms: Mapped[Optional[int]] = mapped_column(Integer)
    solved_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship("User", back_populates="question_statuses")
