import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.routers import auth_router, class_router, student_router

# Setup logging
logger = setup_logging(app_name="moon-guide-ai")

app = FastAPI(title="Moon Guide AI API")


# Logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware to log all incoming requests and responses"""
    start_time = time.time()

    # Log incoming request
    logger.info(
        f"[{request.method}] {request.url.path} - Client: {request.client.host if request.client else 'Unknown'}"
    )

    try:
        response = await call_next(request)
        duration = time.time() - start_time

        # Log response
        logger.info(
            f"[{request.method}] {request.url.path} - "
            f"Status: {response.status_code} - Duration: {duration:.3f}s"
        )

        return response
    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            f"[{request.method}] {request.url.path} - "
            f"Error: {str(e)} - Duration: {duration:.3f}s",
            exc_info=True,
        )
        raise


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1/health", tags=["Health"])
app.include_router(auth_router.router)
app.include_router(class_router.router)
app.include_router(student_router.router)


@app.get("/")
async def root():
    return {"message": "Moon Guide AI API is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
