import os

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models import Class, User

# Use PostgreSQL for testing
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/moon_guide_test"
)
SYSTEM_DATABASE_URL = os.getenv(
    "SYSTEM_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres"
)


def _setup_test_database():
    """Create and setup test database."""
    try:
        # Try to connect to system database
        engine = create_engine(
            SYSTEM_DATABASE_URL, echo=False, isolation_level="AUTOCOMMIT"
        )
        with engine.connect() as conn:
            # Drop if exists and create fresh database
            try:
                conn.execute(text("DROP DATABASE IF EXISTS moon_guide_test"))
            except Exception:
                pass
            try:
                conn.execute(text("CREATE DATABASE moon_guide_test"))
            except Exception as e:
                # Database might already exist, that's okay
                if (
                    "already exists" not in str(e).lower()
                    and "duplicate" not in str(e).lower()
                ):
                    raise
        engine.dispose()
        return True
    except OperationalError:
        return False


@pytest.fixture(scope="function")
def test_engine():
    """Create a test database engine."""
    if not _setup_test_database():
        pytest.skip(
            "\n" + "=" * 70 + "\n"
            "PostgreSQL is not running. To run tests, start PostgreSQL:\n\n"
            "Option 1 - Using Docker (recommended):\n"
            "  cd c:\\Users\\ELITBOOK\\Documents\\moon-guide-ai\n"
            "  docker-compose up -d postgres\n"
            "  (Requires Docker Desktop to be running)\n\n"
            "Option 2 - Using native PostgreSQL:\n"
            "  Install PostgreSQL and ensure it's running on localhost:5432\n"
            "  Create test database: psql -U postgres -c 'CREATE DATABASE moon_guide_test'\n\n"
            "=" * 70 + "\n"
        )

    # Now connect to the test database and create tables
    test_engine = create_engine(TEST_DATABASE_URL, echo=False)
    Base.metadata.create_all(bind=test_engine)
    yield test_engine

    # Clean up
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


@pytest.fixture(scope="function")
def test_session(test_engine):
    """Create a test database session."""
    TestingSessionLocal = sessionmaker(
        bind=test_engine, autoflush=False, autocommit=False
    )
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture
def teacher_user(test_session):
    """Create a test teacher user."""
    teacher = User(
        email="teacher@example.com",
        password_hash="hashed_password",
        is_active=True,
    )
    test_session.add(teacher)
    test_session.commit()
    test_session.refresh(teacher)
    return teacher


@pytest.fixture
def student_user(test_session):
    """Create a test student user."""
    student = User(
        email="student@example.com",
        password_hash="hashed_password",
        is_active=True,
    )
    test_session.add(student)
    test_session.commit()
    test_session.refresh(student)
    return student


@pytest.fixture
def test_class(test_session, teacher_user):
    """Create a test class."""
    test_class = Class(
        name="Python 101",
        description="Introduction to Python",
        teacher_id=teacher_user.id,
    )
    test_session.add(test_class)
    test_session.commit()
    test_session.refresh(test_class)
    return test_class
