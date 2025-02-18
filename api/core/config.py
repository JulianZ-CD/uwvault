from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pydantic import ConfigDict, field_validator
from typing import Dict, Set, List
import json

class Settings(BaseSettings):
    # Project Configuration
    PROJECT_NAME: str = "UWvault"
    DEBUG: bool = True
    API_PREFIX: str = "/api/py"
    
    # GCP Storage Configuration
    GCP_PROJECT_ID: str = "uwvault"
    GCP_BUCKET_NAME: str = "uwvault-resources-01"
    GCP_CREDENTIALS_PATH: str = "credentials/uwvault-5be43e2849a7.json"
    
    # 文件配置
    ALLOWED_MIME_TYPES: List[str] = [
        "application/pdf", 
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    
    FILE_SIZE_LIMITS: Dict[str, int] = {
        "application/pdf": 52428800,  # 50MB
        "application/msword": 31457280,  # 30MB
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 31457280  # 30MB
    }
    
    DEFAULT_MAX_FILE_SIZE: int = 10485760  # 10MB 默认大小限制
    
    MIME_TO_EXTENSION: Dict[str, str] = {
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
    }
    
    @field_validator('ALLOWED_MIME_TYPES', mode='before')
    @classmethod
    def parse_mime_types(cls, v):
        if isinstance(v, str):
            return set(v.split(','))
        return v
    
    # 使用新的 ConfigDict 替代旧的 Config 类
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra='ignore'
    )
    
    @classmethod
    def parse_env_var(cls, field_name: str, raw_val: str):
        if field_name in ["ALLOWED_MIME_TYPES", "FILE_SIZE_LIMITS", "MIME_TO_EXTENSION"]:
            return json.loads(raw_val)
        return raw_val


@lru_cache()
def get_settings():
    return Settings()

settings = Settings()
