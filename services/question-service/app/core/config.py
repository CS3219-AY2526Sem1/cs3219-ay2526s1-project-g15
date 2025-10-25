from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import List, Optional, Union


class Settings(BaseSettings):
    # App settings
    app_name: str = "peerprep-question-service"
    env: str = "dev"
    host: str = "localhost"
    port: int = 8003

    # Database configuration based on environment
    # Each microservice gets its own database for proper isolation
    database_url: Optional[str] = None
    test_database_url: Optional[str] = None

    # Database connection details (environment-specific)
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "peerprep"
    db_password: str = "peerprep"
    db_name: str = "peerprep_questions"

    # User Service settings (for API calls)
    user_service_url: str = "http://localhost:8001"

    # AWS settings
    aws_region: str = "us-east-1"
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None

    # Redis settings
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: Optional[str] = None

    # Logging settings
    log_level: str = "INFO"
    log_format: str = "json"

    # CORS
    allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:3001"
    )

    @field_validator('allowed_origins', mode='after')
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse ALLOWED_ORIGINS from comma-separated string"""
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            # Handle comma-separated string
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return ["http://localhost:3000", "http://localhost:3001"]

    def get_database_url(self) -> str:
        """Get PostgreSQL database URL based on environment"""
        # Use explicit DATABASE_URL if provided, otherwise construct from components
        if self.database_url:
            return self.database_url

        # Environment-specific database names for proper separation
        env_db_name = f"{self.db_name}_{self.env}"
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{env_db_name}"

    def get_test_database_url(self) -> str:
        """Get PostgreSQL test database URL with environment separation"""
        if self.test_database_url:
            return self.test_database_url

        # Test database always gets _test suffix
        test_db_name = f"{self.db_name}_{self.env}_test"
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{test_db_name}"

    class Config:
        env_file = [".env.dev", ".env"]  # Try .env.dev first, fallback to .env
        case_sensitive = False


settings = Settings()