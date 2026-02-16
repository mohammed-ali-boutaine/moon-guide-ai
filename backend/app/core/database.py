from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase,Session, sessionmaker

from app.models.role import Role, RoleName

# from app.core.config import settings
# engine = create_engine(settings.DATABASE_URL, future=True, echo=True)



def init_roles(db: Session):
    """Initialize default roles in database"""
    roles = [
        Role(name=RoleName.STUDENT),
        Role(name=RoleName.TEACHER),
        Role(name=RoleName.ADMIN),
    ]
    
    for role in roles:
        existing = db.query(Role).filter(Role.name == role.name).first()
        if not existing:
            db.add(role)
    
    db.commit()
    print("Roles initialized successfully")


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

if __name__ == "__main__":
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        init_roles(db)
    finally:
        db.close()
        
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
