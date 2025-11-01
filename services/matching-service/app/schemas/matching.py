from pydantic import BaseModel
from typing import Literal, Optional
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

class MatchRequestStatusResponse(BaseModel):
    status: Literal["pending","matched","cancelled","timeout"]
    match_id: Optional[str] = None

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
    session_id: str
    question_id: str
    partner_id: str

class MatchCancelledResponse(BaseModel):
    status: Literal["cancelled"] = "cancelled"
    requeued_partner: bool = True
    match_id: str