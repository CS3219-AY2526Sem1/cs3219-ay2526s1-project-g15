from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AttemptCreate(BaseModel):
    question_id: int
    language: str
    submitted_code: str
    passed_tests: int = Field(ge=0)
    total_tests: int  = Field(ge=0)

class AttemptRead(BaseModel):
    id: str
    question_id: int
    language: str
    passed_tests: int
    total_tests: int
    created_at: datetime
    is_solved: bool

    class Config:
        from_attributes = True

class AttemptSummary(BaseModel):
    total_attempts: int
    solved: int
    last_attempt_at: Optional[datetime]
