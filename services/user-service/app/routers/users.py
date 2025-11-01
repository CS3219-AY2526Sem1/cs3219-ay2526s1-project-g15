from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError
from app.db.session import get_session
from app.models.user import User
from app.schemas.user import UserOut
from app.core.security import decode_token, hash_password, verify_password
from app.schemas.user import UserUpdateIn

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

@router.put("/me", response_model=UserOut)
async def update_profile(
    payload: UserUpdateIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
    ):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.name and payload.name != user.name:
        user.name = payload.name

    if payload.new_password:
        if not payload.old_password:
            raise HTTPException(status_code=400, detail="Old password required.")
        if not verify_password(payload.old_password, user.password_hash):
            raise HTTPException(status_code=401, detail="Old password incorrect.")
        user.password_hash = hash_password(payload.new_password)

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/me")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
    ):
    
    await db.execute(delete(User).where(User.id == current_user.id))
    await db.commit()
    return {"message": "Account deleted successfully."}