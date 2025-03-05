from pydantic_settings import BaseSettings
from functools import lru_cache
from pydantic import ConfigDict


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str

    # Auth URLs
    VERIFY_EMAIL_URL: str = "http://localhost:3000/verify-email"
    RESET_PASSWORD_URL: str = "http://localhost:3000/reset-password"
    DEFAULT_ORIGIN: str = "http://localhost:3000"

    # GCP Storage Configuration
    GCP_PROJECT_ID: str
    GCP_BUCKET_NAME: str
    GCP_CREDENTIALS_PATH: str

    # Test User Credentials
    USER_EMAIL: str
    USER_PASSWORD: str

    model_config = ConfigDict(
        env_file=".env.dev",
        env_file_encoding="utf-8",
        extra="ignore",
        env_ignore_empty=True
    )


@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
