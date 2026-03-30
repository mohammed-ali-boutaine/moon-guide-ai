# tests/conftest.py
import os
import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session as DbSession, sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.class_ import Class
from app.models.role import Role, RoleName
from app.models.user import User
from app.models.user_profile import UserProfile

# Database URLs
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/moon_guide_test"
)
SYSTEM_DATABASE_URL = os.getenv(
    "SYSTEM_DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/postgres"
)


def _setup_test_database():
    """Create and setup test database. Retries for CI where Postgres may lag healthcheck."""
    test_db = "moon_guide_test"
    attempts = max(1, int(os.getenv("TEST_DB_CONNECT_ATTEMPTS", "30")))
    delay_s = float(os.getenv("TEST_DB_CONNECT_DELAY_SEC", "1.0"))
    last_error = None
    for _ in range(attempts):
        engine = None
        try:
            engine = create_engine(
                SYSTEM_DATABASE_URL,
                echo=False,
                isolation_level="AUTOCOMMIT",
            )
            with engine.connect() as conn:
                conn.execute(
                    text(
                        """
                        SELECT pg_terminate_backend(pg_stat_activity.pid)
                        FROM pg_stat_activity
                        WHERE pg_stat_activity.datname = :dbname
                          AND pid <> pg_backend_pid()
                        """
                    ),
                    {"dbname": test_db},
                )
                try:
                    conn.execute(text(f'DROP DATABASE IF EXISTS "{test_db}"'))
                except Exception:
                    pass
                try:
                    conn.execute(text(f'CREATE DATABASE "{test_db}"'))
                except Exception as e:
                    if (
                        "already exists" not in str(e).lower()
                        and "duplicate" not in str(e).lower()
                    ):
                        raise
            return None
        except OperationalError as e:
            last_error = e
            time.sleep(delay_s)
        finally:
            if engine is not None:
                engine.dispose()
    return last_error


@pytest.fixture(scope="session")
def test_engine():
    """Create a test database engine (session scope - created once)."""
    err = _setup_test_database()
    if err is not None:
        pytest.skip(
            "\n" + "=" * 70 + "\n"
            f"PostgreSQL is not reachable after retries ({SYSTEM_DATABASE_URL}): {err}\n\n"
            "Option 1 — Docker:  docker compose up -d postgres\n"
            "Option 2 — Native:  PostgreSQL on localhost:5432, user postgres, then create DB moon_guide_test\n\n"
            "CI: set SYSTEM_DATABASE_URL and TEST_DATABASE_URL (use 127.0.0.1 if localhost fails).\n"
            "=" * 70 + "\n"
        )

    # Now connect to the test database
    test_engine = create_engine(TEST_DATABASE_URL, echo=False)
    
    yield test_engine

    # Clean up at end of test session
    test_engine.dispose()


@pytest.fixture(scope="function")
def db_session(test_engine):
    """
    Create a fresh database session for each test.
    Creates all tables before test, drops them after.
    """
    # Create all tables
    Base.metadata.create_all(bind=test_engine)
    
    # Create session
    TestingSessionLocal = sessionmaker(
        bind=test_engine, 
        autoflush=False, 
        autocommit=False
    )
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        session.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session: DbSession):
    """Create a test client with overridden database dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def setup_roles(db_session: DbSession):
    """Create default roles in test database."""
    # Clear existing roles
    db_session.query(Role).delete()
    db_session.commit()
    
    roles = [
        Role(name=RoleName.STUDENT),
        Role(name=RoleName.TEACHER),
        Role(name=RoleName.ADMIN),
    ]
    for role in roles:
        db_session.add(role)
    db_session.commit()
    return roles


@pytest.fixture(scope="function")
def test_user(db_session: DbSession, setup_roles):
    """Create a test student user."""
    student_role = db_session.query(Role).filter(
        Role.name == RoleName.STUDENT
    ).first()
    
    user = User(
        email="testuser@example.com",
        password_hash=hash_password("Test123456"),
        role_id=student_role.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    
    profile = UserProfile(
        user_id=user.id,
        first_name="Test",
        last_name="User",
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture(scope="function")
def inactive_user(db_session: DbSession, setup_roles):
    """Create an inactive test user."""
    student_role = db_session.query(Role).filter(
        Role.name == RoleName.STUDENT
    ).first()
    
    user = User(
        email="inactive@example.com",
        password_hash=hash_password("Test123456"),
        role_id=student_role.id,
        is_active=False,
    )
    db_session.add(user)
    db_session.flush()
    
    profile = UserProfile(
        user_id=user.id,
        first_name="Inactive",
        last_name="User",
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture(scope="function")
def teacher_user(db_session: DbSession, setup_roles):
    """Create a teacher test user."""
    teacher_role = db_session.query(Role).filter(
        Role.name == RoleName.TEACHER
    ).first()
    
    user = User(
        email="teacher@example.com",
        password_hash=hash_password("Teacher123456"),
        role_id=teacher_role.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    
    profile = UserProfile(
        user_id=user.id,
        first_name="Teacher",
        last_name="User",
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture(scope="function")
def admin_user(db_session: DbSession, setup_roles):
    """Create an admin test user."""
    admin_role = db_session.query(Role).filter(
        Role.name == RoleName.ADMIN
    ).first()
    
    user = User(
        email="admin@example.com",
        password_hash=hash_password("Admin123456"),
        role_id=admin_role.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    
    profile = UserProfile(
        user_id=user.id,
        first_name="Admin",
        last_name="User",
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture(scope="function")
def student_user(db_session: DbSession, setup_roles):
    """Create another student test user (alias for compatibility)."""
    student_role = db_session.query(Role).filter(
        Role.name == RoleName.STUDENT
    ).first()
    
    user = User(
        email="student@example.com",
        password_hash=hash_password("Student123456"),
        role_id=student_role.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    
    profile = UserProfile(
        user_id=user.id,
        first_name="Student",
        last_name="User",
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture(scope="function")
def auth_headers(client: TestClient, test_user):
    """Get authentication headers for test user."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "testuser@example.com",
            "password": "Test123456"
        }
    )
    tokens = response.json()
    return {
        "Authorization": f"Bearer {tokens['access_token']}",
        "refresh_token": tokens["refresh_token"]
    }


@pytest.fixture(scope="function")
def teacher_auth_headers(client: TestClient, teacher_user):
    """Get authentication headers for teacher user."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "teacher@example.com",
            "password": "Teacher123456"
        }
    )
    tokens = response.json()
    return {
        "Authorization": f"Bearer {tokens['access_token']}",
        "refresh_token": tokens["refresh_token"]
    }


@pytest.fixture(scope="function")
def admin_auth_headers(client: TestClient, admin_user):
    """Get authentication headers for admin user."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "admin@example.com",
            "password": "Admin123456"
        }
    )
    tokens = response.json()
    return {
        "Authorization": f"Bearer {tokens['access_token']}",
        "refresh_token": tokens["refresh_token"]
    }


# Additional fixtures for class testing
@pytest.fixture
def test_class(db_session: DbSession, teacher_user):
    """Create a test class."""
    test_class = Class(
        name="Python 101",
        description="Introduction to Python",
        teacher_id=teacher_user.id,
    )
    db_session.add(test_class)
    db_session.commit()
    db_session.refresh(test_class)
    return test_class