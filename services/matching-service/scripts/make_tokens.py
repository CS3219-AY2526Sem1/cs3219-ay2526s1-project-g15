from jose import jwt
from app.core.config import settings

# For testing
def make(uid: str) -> str:
    return jwt.encode({"user_id": uid}, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

print("u1:", make("user-1"))
print("u2:", make("user-2"))