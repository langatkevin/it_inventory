from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    app_name: str = Field(default="IT Inventory")
    api_prefix: str = Field(default="/api")
    debug: bool = Field(default=False)

    database_url: str = Field(
        default="sqlite:///./inventory.db",
        description="SQLAlchemy database URL.",
    )

    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"],
        description="Origins allowed to make cross-origin requests.",
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()


def get_database_url(override: Optional[str] = None) -> str:
    """Return the database connection string, optionally overridden for tests."""

    if override:
        return override

    return get_settings().database_url
