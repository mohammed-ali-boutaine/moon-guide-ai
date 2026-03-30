from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import logger
from app.db.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting application...")
    try:
        init_db()
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
    
    # Initialize Qdrant connection
    try:
        from app.services.qdrant_service import get_qdrant_client
        get_qdrant_client()
        logger.info("Qdrant vector database connected")
    except Exception as e:
        logger.warning(f"Qdrant not available (non-fatal): {e}")

    # Print active configuration (non-sensitive values only)
    logger.info("=" * 40)
    logger.info("  Moon Guide AI — Active Configuration")
    logger.info("=" * 40)
    logger.info(f"  Environment      : {settings.ENV}")
    logger.info(f"  LLM Provider     : {settings.LLM_PROVIDER}")
    logger.info(f"  LLM Model        : {settings.GEMINI_MODEL if settings.LLM_PROVIDER == 'gemini' else settings.MISTRAL_CHAT_MODEL if settings.LLM_PROVIDER == 'mistral' else settings.OLLAMA_MODEL}")
    logger.info(f"  Embedding        : {settings.EMBEDDING_PROVIDER}")
    logger.info(f"  Embedding Cache  : {settings.EMBEDDING_CACHE_ENABLED}")
    logger.info(f"  Qdrant URL       : {settings.QDRANT_URL}")
    logger.info(f"  Redis URL        : {settings.REDIS_URL}")
    logger.info(f"  Chunk Size       : {settings.CHUNK_SIZE} tokens")
    logger.info(f"  RAG Top K        : {settings.RAG_TOP_K}")
    logger.info(f"  RAG Threshold    : {settings.RAG_SCORE_THRESHOLD}")
    logger.info(f"  Frontend URL     : {settings.FRONTEND_URL}")
    logger.info(f"  Debug Mode       : {settings.DEBUG}")
    logger.info("=" * 40)

    yield
    
    # Shutdown
    logger.info("Shutting down application...")


# Create FastAPI app instance
app = FastAPI(
    title="Moon Guide AI API",
    description="Backend API for Moon Guide AI",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "healthy"}


# Mount all v1 routes
app.include_router(api_router)

if settings.PROMETHEUS_METRICS_ENABLED:
    Instrumentator(
        excluded_handlers=["/health", "/metrics"],
    ).instrument(app).expose(app, include_in_schema=False)

