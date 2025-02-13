from pydantic_settings import BaseSettings
from functools import lru_cache
from pydantic import ConfigDict

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str

    model_config = ConfigDict(
        env_file=".env.dev",
        env_file_encoding="utf-8",
        extra="ignore",
        env_ignore_empty=True
    )


@lru_cache()
def get_settings():
    return Settings()
