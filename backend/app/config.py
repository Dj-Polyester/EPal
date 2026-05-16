from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://epal:epal@localhost:5432/epal"
    REDIS_URL: str = "redis://localhost:6379/0"
    VLLM_BASE_URL: str = "http://localhost:8001/v1"
    VLLM_MODEL: str = "Qwen/Qwen2.5-1.5B-Instruct"
    COMFYUI_URL: str = "http://localhost:8188"
    SECRET_KEY: str = "supersecretkeychangethis"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
