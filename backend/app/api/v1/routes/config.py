# app/api/v1/routes/config.py
"""
GET /api/config  — returns active AI/LLM/embedding configuration.
Open when DEBUG=True (dev mode); admin-only in production.
"""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session as DBSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.role import RoleName

router = APIRouter(prefix="/config", tags=["config"])

_security = HTTPBearer(auto_error=False)


def _config_access(
    request: Request,
    db: Annotated[DBSession, Depends(get_db)],
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(_security)] = None,
) -> None:
    """Allow access when DEBUG=True; require admin role in production."""
    if settings.DEBUG:
        return None
    user = get_current_user(request, db, credentials)
    if not user.role or user.role.name != RoleName.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only in production")
    return user


@router.get("")
def get_config(_=Depends(_config_access)):
    """
    Return the active configuration for LLM, embeddings, RAG, and document processing.
    Open in dev (DEBUG=True). Sensitive keys are masked in all environments.
    """
    def _mask(value: str) -> str:
        if not value:
            return "(not set)"
        return value[:6] + "…" + value[-4:] if len(value) > 12 else "***"

    return {
        "llm": {
            "provider": settings.LLM_PROVIDER,
            "model": (
                settings.GEMINI_MODEL
                if settings.LLM_PROVIDER == "gemini"
                else settings.MISTRAL_CHAT_MODEL
            ),
            "max_output_tokens": settings.LLM_MAX_OUTPUT_TOKENS,
            "temperature": settings.LLM_TEMPERATURE,
            "max_retries": settings.GEMINI_MAX_RETRIES,
            "retry_delay_s": settings.LLM_RETRY_DELAY,
            "gemini_api_key": _mask(settings.GEMINI_API_KEY),
            "mistral_api_key": _mask(settings.MISTRAL_API_KEY),
        },
        "embedding": {
            "provider": settings.EMBEDDING_PROVIDER,
            "model": (
                settings.GEMINI_EMBEDDING_MODEL
                if settings.EMBEDDING_PROVIDER == "gemini"
                else (
                    settings.MISTRAL_EMBEDDING_MODEL
                    if settings.EMBEDDING_PROVIDER == "mistral"
                    else settings.EMBEDDING_MODEL
                )
            ),
            "dimension": (
                settings.GEMINI_EMBEDDING_DIMENSION
                if settings.EMBEDDING_PROVIDER == "gemini"
                else (
                    settings.MISTRAL_EMBEDDING_DIMENSION
                    if settings.EMBEDDING_PROVIDER == "mistral"
                    else settings.EMBEDDING_DIMENSION
                )
            ),
            "cache_enabled": settings.EMBEDDING_CACHE_ENABLED,
            "cache_ttl_s": settings.EMBEDDING_CACHE_TTL,
        },
        "rag": {
            "top_k": settings.RAG_TOP_K,
            "score_threshold": settings.RAG_SCORE_THRESHOLD,
            "context_max_chars": settings.RAG_CONTEXT_MAX_CHARS,
            "history_messages": settings.RAG_HISTORY_MESSAGES,
        },
        "vector_db": {
            "url": settings.QDRANT_URL,
            "collection_prefix": settings.QDRANT_COLLECTION_PREFIX,
        },
        "document_processing": {
            "max_file_size_mb": settings.MAX_FILE_SIZE_MB,
            "chunk_size": settings.CHUNK_SIZE,
            "chunk_overlap": settings.CHUNK_OVERLAP,
            "clamav_enabled": settings.CLAMAV_ENABLED,
        },
        "app": {
            "env": settings.ENV,
            "debug": settings.DEBUG,
            "version": settings.VERSION,
        },
    }
