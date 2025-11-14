from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from datetime import datetime
from app.core.database import Base
import enum

class DifficultyLevel(str, enum.Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"

class MatchStatus(str, enum.Enum):
    PENDING = "pending"
    MATCHED = "matched"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"

class MatchRequest(Base):
    __tablename__ = "match_requests"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    difficulty = Column(SQLEnum(DifficultyLevel), nullable=False, index=True)
    topic = Column(String, nullable=False, index=True)
    status = Column(SQLEnum(MatchStatus), default=MatchStatus.PENDING, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    matched_at = Column(DateTime, nullable=True)
    timeout_at = Column(DateTime, nullable=True)