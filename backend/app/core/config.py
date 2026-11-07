"""Core application configuration and settings management."""

from functools import lru_cache
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    PROJECT_NAME: str = "Campus Navigator API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server Bindings
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # CORS Allowed Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000"
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        raise ValueError(v)

    # Database Connection
    DATABASE_URL: str = "sqlite:///./campus_navigator.db"
    DB_ECHO: bool = False

    # Security & Authentication
    SECRET_KEY: str = "campus-navigator-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Campus Geography Defaults (S G Balekundri Institute of Technology, Belagavi - VGJ9+6P)
    CAMPUS_NAME: str = "S G Balekundri Institute of Technology, Belagavi"
    CAMPUS_CENTER_LAT: float = 15.880562
    CAMPUS_CENTER_LON: float = 74.519312
    CAMPUS_MAX_SNAPPING_METERS: float = 300.0
    NOMINAL_WALKING_SPEED_MPS: float = 1.3
    ACCESSIBLE_WALKING_SPEED_MPS: float = 1.0

    # Initial Admin Credentials
    ADMIN_DEFAULT_USERNAME: str = "admin"
    ADMIN_DEFAULT_EMAIL: str = "admin@campusnav.edu"
    ADMIN_DEFAULT_PASSWORD: str = "admin123"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton instance."""
    return Settings()


settings = get_settings()
