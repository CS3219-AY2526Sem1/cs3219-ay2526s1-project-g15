from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, func, Integer
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, default="USER", nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    failed_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    password_resets: Mapped[list["PasswordReset"]] = relationship(
        "PasswordReset", 
        back_populates="user", 
        cascade="all,delete-orphan",
    )

    attempts: Mapped[list["Attempt"]] = relationship(
        "Attempt", back_populates="user", cascade="all, delete-orphan"
    )

    question_statuses: Mapped[list["UserQuestionStatus"]] = relationship(
        "UserQuestionStatus", back_populates="user", cascade="all, delete-orphan"
    )

    from app.models.password_reset import PasswordReset