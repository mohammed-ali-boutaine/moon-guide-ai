# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/moon_guide"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # App
    APP_NAME: str = "Moon Guide AI"
    DEBUG: bool = False
    VERSION: str = "1.0.0"
    
    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Cookie settings
    COOKIE_SECURE: bool = False  # True in production (HTTPS only)
    COOKIE_SAMESITE: str = "lax"  # lax | strict | none
    COOKIE_HTTPONLY: bool = True
    ACCESS_TOKEN_COOKIE_NAME: str = "access_token"
    REFRESH_TOKEN_COOKIE_NAME: str = "refresh_token"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Qdrant Vector DB
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION_PREFIX: str = "moonguide"
    
    # Embedding
    EMBEDDING_PROVIDER: str = "gemini"  # "gemini" | "sentence-transformers" | "mistral"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"  # Sentence Transformers model (fallback)
    EMBEDDING_DIMENSION: int = 384  # Dimension for all-MiniLM-L6-v2

    # Gemini Embedding
    GEMINI_EMBEDDING_MODEL: str = "models/text-embedding-004"
    GEMINI_EMBEDDING_DIMENSION: int = 768
    GEMINI_EMBEDDING_BATCH_SIZE: int = 100  # Max texts per API call

    # Mistral Embedding
    MISTRAL_API_KEY: str = ""
    MISTRAL_EMBEDDING_MODEL: str = "mistral-embed"  # Mistral's embedding model (1024 dim)
    MISTRAL_EMBEDDING_DIMENSION: int = 1024
    MISTRAL_EMBEDDING_BATCH_SIZE: int = 32  # Max texts per API call
    MISTRAL_RATE_LIMIT_RPM: int = 300  # Requests per minute

    # Embedding Caching
    EMBEDDING_CACHE_ENABLED: bool = True
    EMBEDDING_CACHE_TTL: int = 86400  # 24 hours in seconds
    EMBEDDING_CACHE_PREFIX: str = "emb:"  # Redis key prefix
    
    # Document Processing
    MAX_FILE_SIZE_MB: int = 50
    CHUNK_SIZE: int = 1000  # tokens
    CHUNK_OVERLAP: int = 120  # ~12% overlap
    
    # ClamAV
    CLAMAV_ENABLED: bool = False  # Disable by default for dev
    CLAMAV_HOST: str = "localhost"
    CLAMAV_PORT: int = 3310
    
    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Environment
    ENV: str = "development"
    
    # Google SSO
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_CLIENT_ID: str = ""

    # Backend_URL
    BACKEND_URL: str = "http://localhost:8000"

    # Gemini LLM
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_MAX_OUTPUT_TOKENS: int = 1024
    GEMINI_TEMPERATURE: float = 0.7
    GEMINI_MAX_RETRIES: int = 3
    GEMINI_RETRY_DELAY: float = 2.0  # seconds between retries

    # RAG settings
    RAG_TOP_K: int = 5                   # chunks to retrieve
    RAG_SCORE_THRESHOLD: float = 0.35    # minimum similarity score
    RAG_CONTEXT_MAX_CHARS: int = 12000   # ~3 000 tokens of context
    RAG_HISTORY_MESSAGES: int = 6        # last N messages included in prompt

    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra='ignore'
    )

@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()