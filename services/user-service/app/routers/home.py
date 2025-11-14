from fastapi import Depends, APIRouter
from app.routers.users import get_current_user
from app.models.user import User

router = APIRouter(prefix="/home", tags=["home"])

@router.get("/")
async def home(current_user: User = Depends(get_current_user)):
    return {"message": f"Welcome, {current_user.name}!"}
