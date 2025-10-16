from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
import requests
from typing import Optional

security = HTTPBearer(auto_error=False)  # Make auth optional for now


def verify_admin_with_user_service(user_id: str) -> bool:
    """
    Check if user is admin by making HTTP call to user service API.

    This function will call the user service endpoint to verify admin status.
    Currently using placeholder since the user service endpoint is not yet implemented.

    Args:
        user_id: The user ID to check admin status for

    Returns:
        bool: True if user is admin, False otherwise
    """
    try:
        # TODO: Implement actual HTTP call when user service endpoint is ready
        # Expected endpoint: GET /api/v1/users/{user_id}/admin-status
        #
        # response = requests.get(
        #     f"{settings.user_service_url}/api/v1/users/{user_id}/admin-status",
        #     timeout=5,
        #     headers={"Content-Type": "application/json"}
        # )
        #
        # if response.status_code == 200:
        #     return response.json().get("is_admin", False)
        # elif response.status_code == 404:
        #     return False  # User not found
        # else:
        #     # Log error and deny access for safety
        #     print(f"User service error {response.status_code}: {response.text}")
        #     return False

        # PLACEHOLDER: Return True for testing until user service implements the endpoint
        print(f"[PLACEHOLDER] HTTP call to user service for admin check - user {user_id}: returning True")
        return True

    except requests.RequestException as e:
        print(f"[ERROR] Failed to connect to user service for admin check: {e}")
        return False  # Deny access if service is unavailable


def verify_token_with_user_service(token: str) -> Optional[dict]:
    """
    Verify authentication token by making HTTP call to user service API.

    This function will call the user service to validate the token and get user info.
    Currently using placeholder since the user service endpoint is not yet implemented.

    Args:
        token: The authentication token to verify

    Returns:
        Optional[dict]: User data if token is valid, None if invalid
    """
    try:
        # TODO: Implement actual HTTP call when user service endpoint is ready
        # Expected endpoint: POST /api/v1/auth/verify-token
        #
        # response = requests.post(
        #     f"{settings.user_service_url}/api/v1/auth/verify-token",
        #     json={"token": token},
        #     timeout=5,
        #     headers={"Content-Type": "application/json"}
        # )
        #
        # if response.status_code == 200:
        #     return response.json()  # Should contain user_id, username, etc.
        # else:
        #     return None  # Invalid token

        # PLACEHOLDER: Return mock user data for any token until user service is ready
        print(f"[PLACEHOLDER] HTTP call to user service for token verification: {token[:20]}...")
        return {
            "user_id": "mock_user_123",
            "username": "testuser",
            "email": "test@example.com"
        }

    except requests.RequestException as e:
        print(f"[ERROR] Failed to connect to user service for token verification: {e}")
        return None


def get_current_user() -> dict:
    """
    Get current authenticated user.
    Returns mock user data for testing purposes.

    Returns:
        dict: Mock user data for testing
    """
    return {
        "user_id": "mock_user_123",
        "username": "testuser",
        "email": "test@example.com"
    }


def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """
    Verify authentication token by calling user service API.

    Extracts token from Authorization header and validates it with user service.
    Currently using placeholder since user service auth endpoints are not implemented.
    """
    # If no credentials provided, still return mock user for testing
    if not credentials:
        print("[PLACEHOLDER] No auth credentials provided - returning mock user")
        return get_current_user()

    # Extract token from credentials
    token = credentials.credentials

    # Verify token with user service via HTTP API call
    user_data = verify_token_with_user_service(token)

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user_data


def require_admin(current_user: dict = Depends(verify_token)) -> dict:
    """
    Ensure current user has admin privileges by calling user service API.

    This dependency function:
    1. Gets the current user from verify_token()
    2. Makes HTTP call to user service to check admin status
    3. Raises 403 if user is not admin

    Currently using placeholder HTTP calls since user service endpoints are not implemented.
    """
    user_id = current_user.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user data - missing user ID"
        )

    # Make HTTP call to user service to verify admin status
    if not verify_admin_with_user_service(user_id):
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
    user_id = current_user.get("user_id")
    
    # Check if user is admin
    is_admin = verify_admin_with_user_service(user_id) if user_id else False
    
    return {
        "user": current_user,
        "is_admin": is_admin,
        "filter_active_only": not is_admin  # Non-admins get filtered results
    }