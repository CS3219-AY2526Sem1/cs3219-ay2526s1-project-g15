# app/core/auth.py
from typing import Optional, Dict
import os, requests
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=True)
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user-service:8001").rstrip("/")
USER_SERVICE_VERIFY_PATH = os.getenv("USER_SERVICE_VERIFY_PATH", "/users/me")
TIMEOUT = float(os.getenv("AUTH_HTTP_TIMEOUT", "5"))

def _verify_with_user_service(token: str) -> Optional[Dict]:
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{USER_SERVICE_URL}{USER_SERVICE_VERIFY_PATH}"
    try:
        r = requests.get(url, headers=headers, timeout=TIMEOUT)
        if r.status_code == 200:
            data = r.json() or {}
            # user-service /users/me returns `id`, so accept that
            uid = data.get("user_id") or data.get("sub") or data.get("id")
            if uid:
                return {"user_id": uid}
        elif r.status_code in (401, 403):
            return None
    except requests.RequestException as e:
        print(f"[auth] user-service error: {e}")
    return None

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    user = _verify_with_user_service(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token", headers={"WWW-Authenticate":"Bearer"})
    return user
