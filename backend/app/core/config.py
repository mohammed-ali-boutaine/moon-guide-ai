from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    FRONTEND_URL: str = "http://localhost:3000"
    ENV: str | None = None
    SECRET_KEY: str

    model_config = ConfigDict(env_file=".env")


settings = Settings()
