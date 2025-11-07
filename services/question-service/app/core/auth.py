from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
import requests
from typing import Optional

security = HTTPBearer(auto_error=True)

def verify_token_with_user_service(token: str) -> Optional[dict]:
    """
    Verify authentication token by making HTTP call to user service API.
    This function will call the user service to check if the token is valid and if the user is admin.
    Args:
        token: The authentication token to verify
    Returns:
        Optional[dict]: User data if token is valid, None if invalid
    """
    try:
        user_service_url = getattr(settings, "USER_SERVICE_URL", "http://user-service:8001")
        url = f"{user_service_url}/users/is-admin"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return {"is_admin": data.get("is_admin", False)}
        elif response.status_code == 401:
            return None  # Invalid token
        else:
            print(f"[ERROR] User service is-admin check failed: {response.status_code} {response.text}")
            return None
    except requests.RequestException as e:
        print(f"[ERROR] Failed to connect to user service for is-admin check: {e}")
        return None

def get_current_user(is_admin: bool = False) -> dict:
    """
    Get current authenticated user. Since we only know is_admin, return minimal info.
    Returns:
        dict: Minimal user data
    """
    return {
        "user_id": None,
        "is_admin": is_admin
    }

def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """
    Verify authentication token by calling user service API.
    Extracts token from Authorization header and validates it with user service.
    Returns minimal user info with is_admin status.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"}
        )
    token = credentials.credentials
    user_data = verify_token_with_user_service(token)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return get_current_user(is_admin=user_data.get("is_admin", False))

def require_admin(current_user: dict = Depends(verify_token)) -> dict:
    """
    Ensure current user has admin privileges by calling user service API.
    This dependency function:
    1. Gets the current user from verify_token()
    2. Checks is_admin field
    3. Raises 403 if user is not admin
    """
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required for this operation"
        )
    return current_user

def get_question_filter_context(current_user: dict = Depends(verify_token)) -> dict:
    """
    Get filtering context for questions based on user permissions.
    Regular users can only see active questions (is_active=True).
    Admins can see all questions regardless of active status.
    Returns:
        dict: Context with user info and filtering requirements
    """
    is_admin = current_user.get("is_admin", False)
    return {
        "user": current_user,
        "is_admin": is_admin,
        "filter_active_only": not is_admin  # Non-admins get filtered results
    }