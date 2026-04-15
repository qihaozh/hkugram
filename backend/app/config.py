from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "HKUgram API"
    database_url: str = Field(
        default="mysql+pymysql://hkugram:hkugram@127.0.0.1:3306/hkugram"
    )
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )
    session_secret: str = "dev-hkugram-session-secret"
    session_cookie_name: str = "hkugram_session"
    session_max_age_seconds: int = 60 * 60 * 24 * 14


@lru_cache
def get_settings() -> Settings:
    return Settings()
