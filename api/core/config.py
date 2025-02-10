from pydantic_settings import BaseSettings
from functools import lru_cache
from pydantic import ConfigDict


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str

    # Auth URLs
    VERIFY_EMAIL_URL: str
    RESET_PASSWORD_URL: str
    DEFAULT_ORIGIN: str

    model_config = ConfigDict(
        env_file=".env.dev"
    )


@lru_cache()
def get_settings():
    return Settings()
