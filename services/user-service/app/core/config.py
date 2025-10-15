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

    MAIL_USERNAME: str = "peerprep244@gmail.com"
    MAIL_PASSWORD: str = "gjxr mone bqkp aanh"
    MAIL_FROM: str = "peerprep244@gmail.com"
    MAIL_FROM_NAME: str = "PeerPrep"
    MAIL_PORT: int = 465
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = False
    MAIL_SSL_TLS: bool = True
    USE_CREDENTIALS: bool = True
    VALIDATE_CERTS: bool = True
    SUPPRESS_SEND: int = 0
    PUBLIC_BASE_URL: str = f"http://{HOST}:{PORT}"


settings = Settings()