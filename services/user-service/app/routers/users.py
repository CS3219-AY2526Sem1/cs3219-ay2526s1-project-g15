from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError
from app.db.session import get_session
from app.models.user import User
from app.schemas.user import UserOut
from app.core.security import decode_token

router = APIRouter(prefix="/users", tags=["users"])
security = HTTPBearer()

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_session)) -> User:
    try:
        payload = decode_token(creds.credentials)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    q = await db.execute(select(User).where(User.id == payload["sub"]))
    user = q.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.get("/me", response_model=UserOut)
async def me(current: User = Depends(get_current_user)):
    return current

@router.get("/is-admin")
async def is_admin(current_user: User = Depends(get_current_user)):
    return {"is_admin": current_user.role == "ADMIN"}