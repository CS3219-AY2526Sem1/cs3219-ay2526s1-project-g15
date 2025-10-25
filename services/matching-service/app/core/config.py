from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "peerprep-matching-service"
    ENV: str = "dev"
    HOST: str = "localhost"
    PORT: int = 8002

    # Database
    DATABASE_URL: str = Field(
        default="postgresql://peerprep:peerprep@localhost:5432/peerprep_matches"
    )
    REDIS_URL: str = Field(
        default="redis://localhost:6380/0"
    )
    LOG_LEVEL: str = Field(default="INFO")

    # Authentication
    AUTH_ALGORITHM: str = "HS256"
    AUTH_ACCESS_SECRET: str = Field(default="secretkey", alias="JWT_SECRET_KEY")  # Added default
    AUTH_ISSUER: str | None = None
    AUTH_AUDIENCE: str | None = None
    
    # Matching
    MATCHING_TIMEOUT_SECONDS: int = 60
    CONFIRM_MATCH_TIMEOUT_SECONDS: int = 120
    MAX_CONCURRENT_MATCHES: int = 5000

    class Config:
        env_file = ".env"
        extra = "ignore"
        populate_by_name = True

settings = Settings()