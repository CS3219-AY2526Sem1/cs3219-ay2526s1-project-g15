import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_session
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.auth import RegisterIn, LoginIn, AuthOut
from app.schemas.user import UserOut
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=AuthOut)
async def register(payload: RegisterIn, request: Request, db: AsyncSession = Depends(get_session)):
    # unique email
    q = await db.execute(select(User).where(User.email == payload.email))
    if q.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already in use")

    now = datetime.now(timezone.utc)
    uid = str(uuid.uuid4())
    tid = str(uuid.uuid4())

    user = User(
        id=uid,
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
    )
    db.add(user)
    await db.flush()  

    rt = RefreshToken(
        id=tid,
        user=user,
        hashed="n/a",
        user_agent=request.headers.get("user-agent") or "n/a",
        ip=(request.client.host if request.client else None),
        expires_at=now + timedelta(seconds=settings.REFRESH_TTL_DAYS * 24 * 60 * 60),
    )
    db.add(rt)

    await db.commit()

    access = create_access_token(uid, payload.email)
    refresh = create_refresh_token(uid, tid)
    return AuthOut(access_token=access, refresh_token=refresh, refresh_token_id=tid)

@router.post("/login", response_model=AuthOut)
async def login(payload: LoginIn, request: Request, db: AsyncSession = Depends(get_session)):
    q = await db.execute(select(User).where(User.email == payload.email))
    user = q.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    tid = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    rt = RefreshToken(
        id=tid,
        user_id=user.id,
        hashed="n/a",
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
        expires_at=now + timedelta(seconds=settings.JWT_REFRESH_TTL_SECONDS),
    )
    db.add(rt)
    await db.commit()

    return AuthOut(
        access_token=create_access_token(user.id, user.email),
        refresh_token=create_refresh_token(user.id, tid),
        refresh_token_id=tid,
    )