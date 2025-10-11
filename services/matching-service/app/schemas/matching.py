from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class DifficultyLevel(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"

class MatchRequestCreate(BaseModel):
    difficulty: DifficultyLevel
    topic: str

class MatchRequestResponse(BaseModel):
    id: str
    user_id: str
    difficulty: DifficultyLevel
    topic: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class MatchFoundResponse(BaseModel):
    match_id: str
    partner_id: str
    difficulty: DifficultyLevel
    topic: str
    requires_confirmation: bool = True

class MatchConfirmRequest(BaseModel):
    match_id: str
    confirmed: bool

class MatchConfirmedResponse(BaseModel):
    match_id: str
    collaboration_session_id: str
    question_id: str
    partner_id: str