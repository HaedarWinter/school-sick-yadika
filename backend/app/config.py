from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str
    environment: str = "development"
    cors_origins: List[str] = ["http://localhost:3000"]
    session_ttl_minutes: int = 60


settings = Settings()
