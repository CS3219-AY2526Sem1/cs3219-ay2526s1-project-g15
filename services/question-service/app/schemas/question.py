from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.question import DifficultyLevel
import json


class QuestionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=0)
    difficulty: DifficultyLevel
    topics: List[str] = Field(..., min_items=1)
    examples: Optional[List[Dict[str, Any]]] = None
    constraints: Optional[str] = None
    test_cases: Optional[List[Dict[str, Any]]] = None
    images: Optional[List[str]] = None  # JPEG, PNG, SVG formats
    is_active: bool = True

    @validator('topics')
    def validate_topics(cls, v):
        if not v or not all(isinstance(topic, str) and topic.strip() for topic in v):
            raise ValueError('Topics must be a non-empty list of non-empty strings')
        return v

    @validator('images')
    def validate_images(cls, v):
        if v is not None:
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.svg']
            for image_url in v:
                if not any(image_url.lower().endswith(ext) for ext in allowed_extensions):
                    raise ValueError('Images must be JPEG, PNG, or SVG format')
        return v


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=0)
    difficulty: Optional[DifficultyLevel] = None
    topics: Optional[List[str]] = None
    examples: Optional[List[Dict[str, Any]]] = None
    constraints: Optional[str] = None
    test_cases: Optional[List[Dict[str, Any]]] = None
    images: Optional[List[str]] = None
    is_active: Optional[bool] = None

    @validator('topics')
    def validate_topics(cls, v):
        if v is not None and (not v or not all(isinstance(topic, str) and topic.strip() for topic in v)):
            raise ValueError('Topics must be a non-empty list of non-empty strings')
        return v

    @validator('images')
    def validate_images(cls, v):
        if v is not None:
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.svg']
            for image_url in v:
                if not any(image_url.lower().endswith(ext) for ext in allowed_extensions):
                    raise ValueError('Images must be JPEG, PNG, or SVG format')
        return v


class QuestionResponse(QuestionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @validator('topics', pre=True)
    def parse_topics(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    @validator('examples', pre=True)
    def parse_examples(cls, v):
        if isinstance(v, str) and v:
            return json.loads(v)
        return v

    @validator('test_cases', pre=True)
    def parse_test_cases(cls, v):
        if isinstance(v, str) and v:
            return json.loads(v)
        return v

    @validator('images', pre=True)
    def parse_images(cls, v):
        if isinstance(v, str) and v:
            return json.loads(v)
        return v


class QuestionList(BaseModel):
    questions: List[QuestionResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class QuestionFilter(BaseModel):
    difficulty: Optional[DifficultyLevel] = None
    topics: Optional[List[str]] = None
    search: Optional[str] = None


