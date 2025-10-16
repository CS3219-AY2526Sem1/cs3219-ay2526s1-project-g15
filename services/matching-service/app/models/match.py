from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.sql import func
from datetime import datetime
from app.core.database import Base

class Match(Base):
    __tablename__ = "matches"
    
    id = Column(String, primary_key=True)
    request1_id = Column(String, nullable=False)
    request2_id = Column(String, nullable=False)
    user1_id = Column(String, nullable=False)
    user2_id = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    
    # Confirmation tracking
    user1_confirmed = Column(Boolean, default=False)
    user2_confirmed = Column(Boolean, default=False)
    
    # Session info
    collaboration_session_id = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)