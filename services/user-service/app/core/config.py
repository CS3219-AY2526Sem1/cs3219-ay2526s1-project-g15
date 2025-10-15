from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    APP_NAME: str = "peerprep-user-service"
    ENV: str = "dev"
    HOST: str = "localhost"
    PORT: int = 8001

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@postgres:5432/peerprep_users"
    )

    SECRET_KEY: str = Field(default="dev-only-change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TTL_MIN: int = 15
    REFRESH_TTL_DAYS: int = 7

    MAIL_USERNAME: str = "you@example.com"
    MAIL_PASSWORD: str = "password"
    MAIL_FROM: str = "no-reply@example.com"
    MAIL_FROM_NAME: str = "PeerPrep"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.example.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    USE_CREDENTIALS: bool = True
    VALIDATE_CERTS: bool = True
    SUPPRESS_SEND: int = 0
    PUBLIC_BASE_URL: str = f"http://{HOST}:{PORT}"


settings = Settings()