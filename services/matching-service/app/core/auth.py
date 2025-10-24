from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError
from app.core.config import settings
from fastapi import Depends, HTTPException, status

bearer = HTTPBearer(auto_error=True)

def verify_token(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    token = creds.credentials
    try:
        claims = jwt.decode(
            token,
            settings.AUTH_ACCESS_SECRET,
            algorithms=[settings.AUTH_ALGORITHM],
            issuer=settings.AUTH_ISSUER,
            options={"verify_aud": bool(settings.AUTH_AUDIENCE)},
            audience=settings.AUTH_AUDIENCE,
        )
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    if claims.get("type") != "access":
        raise HTTPException(status_code=401, detail="Wrong token type")

    user_id = claims.get("sub")  # user-service sets sub = user id
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user id")

    return {"user_id": user_id, "claims": claims}
