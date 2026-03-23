# app/db/init_db.py
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, create_tables, engine
from app.core.logging import logger
from app.core.security import hash_password
from app.models.role import Role, RoleName
from app.models.user import User
from app.models.user_profile import UserProfile

ADMIN_EMAIL = "moon@gmail.com"
ADMIN_PASSWORD = "password"
ADMIN_FIRST_NAME = "Moon"
ADMIN_LAST_NAME = "Admin"


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


def seed_admin(db: Session) -> None:
    """Seed default admin user if not present"""
    existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if existing:
        logger.info(f"Admin user already exists: {ADMIN_EMAIL}")
        return

    admin_role = db.query(Role).filter(Role.name == RoleName.ADMIN).first()
    if not admin_role:
        logger.error("ADMIN role not found — cannot seed admin user")
        return

    admin_user = User(
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        role_id=admin_role.id,
        is_active=True,
    )
    db.add(admin_user)
    db.flush()

    profile = UserProfile(
        user_id=admin_user.id,
        first_name=ADMIN_FIRST_NAME,
        last_name=ADMIN_LAST_NAME,
    )
    db.add(profile)
    db.commit()
    logger.info(f"[OK] Default admin seeded: {ADMIN_EMAIL}")


def init_db() -> None:
    """Initialize database with tables and default data"""
    logger.info("Starting database initialization...")
    
    # Create tables
    create_tables()
    
    # Initialize roles and seed admin
    db = SessionLocal()
    try:
        init_roles(db)
        seed_admin(db)
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
        raise
    finally:
        db.close()
    
    logger.info("Database initialization completed")


if __name__ == "__main__":
    init_db()