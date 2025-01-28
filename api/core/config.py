from pydantic_settings import BaseSettings
from functools import lru_cache
from pydantic import ConfigDict


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # JWT config
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_LIFETIME_SECONDS: int = 3600

    model_config = ConfigDict(
        env_file=".env.dev"
    )


@lru_cache()
def get_settings():
    return Settings()
