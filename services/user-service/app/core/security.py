from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.hash import argon2
from app.core.config import settings

ACCESS_TTL = settings.ACCESS_TTL_MIN * 60
REFRESH_TTL = settings.REFRESH_TTL_DAYS * 24 * 60 * 60
ALGORITHM = settings.ALGORITHM
SECRET = settings.SECRET_KEY

def hash_password(password: str) -> str:
    return argon2.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    return argon2.verify(password, hashed_password)

def _exp(seconds: int) -> int:
    return datetime.now(timezone.utc) + timedelta(seconds=seconds)

def create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.ACCESS_TTL_MIN)).timestamp()),
        "iss": "user-service",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(user_id: str, token_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "tid": token_id,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=settings.REFRESH_TTL_DAYS)).timestamp()),
        "iss": "user-service",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET, algorithms=[ALGORITHM])

def create_verification_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(hours=24)
    payload = {
        "sub": user_id,
        "type": "verify",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "iss": "user-service",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
