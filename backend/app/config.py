from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache


# Locate workspace root .env (two levels up from backend/app/config.py)
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://epal:epal@localhost:5432/epal"
    REDIS_URL: str = "redis://localhost:6379/0"
    VLLM_BASE_URL: str = "http://localhost:8001/v1"
    VLLM_MODEL: str = "Qwen3-4B-GGUF"
    COMFYUI_URL: str = "http://localhost:8188"
    COMFYUI_INPUT_PATH: str | None = None
    SECRET_KEY: str = "supersecretkeychangethis"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    model_config = ConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
