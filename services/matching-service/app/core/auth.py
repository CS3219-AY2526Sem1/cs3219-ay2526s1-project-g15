from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=True)

def verify_token(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    """Verify JWT token and return user info"""
    # Must be "Bearer"
    if (creds is None) or (creds.scheme.lower() != "bearer"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme")
    token = creds.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return {"user_id": user_id}