from fastapi import APIRouter
from app.api import questions

api_router = APIRouter()
api_router.include_router(questions.router)