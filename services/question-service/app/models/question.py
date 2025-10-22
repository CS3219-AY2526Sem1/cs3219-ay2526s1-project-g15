from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class DifficultyLevel(enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    difficulty = Column(SQLEnum(DifficultyLevel), nullable=False, index=True)
    topics = Column(String(500), nullable=False)  # JSON array
    examples = Column(Text)  # JSON array
    constraints = Column(Text)
    test_cases = Column(Text)  # JSON array
    images = Column(Text)  # JSON array of URLs
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Question(id={self.id}, title='{self.title}', difficulty='{self.difficulty}')>"