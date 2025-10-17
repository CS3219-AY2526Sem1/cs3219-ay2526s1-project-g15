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
        default="redis://localhost:6380/0", env="REDIS_URL"
    )
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    
    # Matching
    MATCHING_TIMEOUT_SECONDS: int = 60
    CONFIRM_MATCH_TIMEOUT_SECONDS: int = 120
    MAX_CONCURRENT_MATCHES: int = 5000

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()