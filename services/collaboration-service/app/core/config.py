from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App info
    APP_NAME: str = "peerprep-collaboration-service"
    ENV: str = "dev"
    HOST: str = "localhost"
    PORT: int = 8003
    DEBUG: bool = True

    # Database settings
    DATABASE_URL: Optional[str] = None

    # JWT settings
    JWT_SECRET_KEY: str = "your-secret"
    JWT_ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()