import asyncio, hashlib, secrets
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Query, BackgroundTasks
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.session import get_session
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.auth import RegisterIn, LoginIn, AuthOut, ForgotPasswordIn, ResetPasswordIn, VerifyCodeIn, PasswordVerifyIn
from app.schemas.user import UserOut
from app.models.password_reset import PasswordReset
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, create_verification_token
from app.core.config import settings
from app.core.email import send_verification_email, send_reset_code_email
from app.routers.users import get_current_user
from jose import JWTError, jwt

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

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
    token = create_verification_token(uid)
    asyncio.create_task(send_verification_email(payload.email, token))
    return AuthOut(access_token=access, refresh_token=refresh, refresh_token_id=tid)

@router.post("/login", response_model=AuthOut)
async def login(payload: LoginIn, request: Request, db: AsyncSession = Depends(get_session)):
    q = await db.execute(select(User).where(User.email == payload.email))
    user = q.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not getattr(user, "is_verified", False):
        raise HTTPException(status_code=403, detail="Email not verified")

    now = datetime.now(timezone.utc)

    if user.locked_until and user.locked_until > now:
        raise HTTPException(status_code=403, detail="Account is locked. Please try again later.")
    
    if not verify_password(payload.password, user.password_hash):
        user.failed_attempts = (user.failed_attempts or 0) + 1
        if user.failed_attempts >= 3:
            user.locked_until = now + timedelta(minutes=15)
            # stub “email alert”
            ip = request.client.host if request.client else "unknown"
            ua = request.headers.get("user-agent")
            print(f"[ALERT] Suspicious login for {user.email} from {ip} ({ua})")
        db.add(user)
        await db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user.failed_attempts = 0
    user.locked_until = None
    db.add(user)


    tid = str(uuid.uuid4())
    rt = RefreshToken(
        id=tid,
        user_id=user.id,
        hashed="n/a",
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
        expires_at=now + timedelta(seconds=settings.REFRESH_TTL_DAYS * 24 * 60 * 60),
    )
    db.add(rt)
    await db.commit()

    return AuthOut(
        access_token=create_access_token(user.id, user.email),
        refresh_token=create_refresh_token(user.id, tid),
        refresh_token_id=tid,
    )


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordIn, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_session)):
    # generate a short code but never reveal account existence
    q = await db.execute(select(User).where(User.email == payload.email))
    user = q.scalar_one_or_none()
    if not user:
        return {"ok": True}

    code = f"{secrets.randbelow(1000000):06d}"  # 6-digit numeric
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    pr = PasswordReset(
        id=str(uuid.uuid4()),
        user_id=user.id,
        code_hash=code_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(pr)
    await db.commit()

    background_tasks.add_task(send_reset_code_email, user.email, code)

    return {"ok": True}

@router.post("/verify-reset-code")
async def verify_reset_code(payload: VerifyCodeIn, db: AsyncSession = Depends(get_session)):
    q = await db.execute(select(User).where(User.email == payload.email))
    user = q.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid reset request")
    
    q = await db.execute(
        select(PasswordReset)
        .where(PasswordReset.user_id == user.id, 
               PasswordReset.used_at.is_(None))
        .order_by(PasswordReset.created_at.desc())
    )
    pr = q.scalars().first()
    if not pr or pr.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Reset code expired")
    
    given_hash = hashlib.sha256(payload.code.encode()).hexdigest()
    if given_hash != pr.code_hash:
        raise HTTPException(status_code=401, detail="Invalid reset code")
    return {"ok": True}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordIn, db: AsyncSession = Depends(get_session)):
    # find user
    q = await db.execute(select(User).where(User.email == payload.email))
    user = q.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid reset request")

    # latest unused reset
    q = await db.execute(
        select(PasswordReset)
        .where(PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None))
        .order_by(PasswordReset.created_at.desc())
    )
    pr = q.scalars().first()
    if not pr or pr.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Reset code expired")

    # verify code
    given_hash = hashlib.sha256(payload.code.encode()).hexdigest()
    if given_hash != pr.code_hash:
        raise HTTPException(status_code=401, detail="Invalid reset code")

    # update password & mark used
    user.password_hash = hash_password(payload.new_password)
    pr.used_at = datetime.now(timezone.utc)
    db.add_all([user, pr])
    await db.commit()
    return {"ok": True}

@router.get("/verify-email")
async def verify_email(token: str = Query(...), db: AsyncSession = Depends(get_session)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "verify":
            raise HTTPException(status_code=400, detail="Invalid token type")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    q = await db.execute(select(User).where(User.id == user_id))
    user = q.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not getattr(user, "is_verified", False):
        user.is_verified = True
        db.add(user)
        await db.commit()

    return {"ok": True}

@router.post("/logout")
async def logout(
    creds: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_session),
    ):
    try:
        payload = jwt.decode(creds.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=400, detail="Invalid token type")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Delete all refresh tokens for this user (global logout)
    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user_id))
    await db.commit()
    return {"ok": True, "message": "Logged out successfully"}

@router.post("/verify-password")
async def verify_user_password(
    payload: PasswordVerifyIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
    ):
    if verify_password(payload.password, current_user.password_hash):
        return {"ok": True}
    else:
        return {"ok": False}