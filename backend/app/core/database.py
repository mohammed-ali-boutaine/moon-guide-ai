# app/core/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, Session, sessionmaker
from app.core.config import settings
Base = declarative_base()
# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
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
    print("✅ Database tables created successfully")
def drop_tables():
    """Drop all tables (use with caution!)"""
    Base.metadata.drop_all(bind=engine)
    print("⚠️  All tables dropped")
