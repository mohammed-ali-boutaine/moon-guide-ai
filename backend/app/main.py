from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from contextlib import asynccontextmanager
from app.core.config import settings  
from fastapi import FastAPI
from app.db.init_db import init_db  
from app.core.logging import logger
from app.api.health import router as health_router
from app.routers.auth_router import router as auth_router
from app.routers.class_router import router as class_router
from app.routers.student_router import router as student_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting application...")
    try:
        init_db()
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
    
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

# Include routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(class_router)
app.include_router(student_router)

# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # SQL logging in debug mode
    pool_pre_ping=True,  # Verify connections before using
    pool_size=10,
    max_overflow=20,
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Database session dependency for FastAPI
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables in the database"""
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully")


def drop_tables():
    """Drop all tables (use with caution!)"""
    Base.metadata.drop_all(bind=engine)
    print(" All tables dropped")