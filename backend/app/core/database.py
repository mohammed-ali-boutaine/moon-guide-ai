from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# from app.core.config import settings
# engine = create_engine(settings.DATABASE_URL, future=True, echo=True)


class Base(DeclarativeBase):
    pass


# Database URL - replace with your actual database URL
SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/dbname"
# For SQLite (development):
# SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # For SQLite only:
    # connect_args={"check_same_thread": False}
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Dependency to get database session
def get_db():
    """
    Database session dependency

    Usage in FastAPI endpoints:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
