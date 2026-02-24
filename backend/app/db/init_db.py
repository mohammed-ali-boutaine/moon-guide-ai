# app/db/init_db.py
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, create_tables, engine
from app.core.logging import logger
from app.models.role import Role, RoleName


def init_roles(db: Session) -> None:
    """Initialize default roles in database"""
    roles_data = [
        RoleName.STUDENT,
        RoleName.TEACHER,
        RoleName.ADMIN,
    ]
    
    created_count = 0
    for role_name in roles_data:
        existing = db.query(Role).filter(Role.name == role_name).first()
        if not existing:
            role = Role(name=role_name)
            db.add(role)
            created_count += 1
            logger.info(f"Created role: {role_name.value}")
        else:
            logger.info(f"Role already exists: {role_name.value}")
    
    if created_count > 0:
        db.commit()
        logger.info(f"[OK] {created_count} role(s) initialized successfully")
    else:
        logger.info("All roles already exist")


def init_db() -> None:
    """Initialize database with tables and default data"""
    logger.info("Starting database initialization...")
    
    # Create tables
    create_tables()
    
    # Initialize roles
    db = SessionLocal()
    try:
        init_roles(db)
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
        raise
    finally:
        db.close()
    
    logger.info("Database initialization completed")


if __name__ == "__main__":
    init_db()