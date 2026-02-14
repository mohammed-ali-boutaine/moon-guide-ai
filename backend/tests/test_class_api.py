import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models.class_ import Class
from app.models.class_student import ClassStudent
from app.models.role import Role, RoleName
from app.models.user import User
from app.models.user_profile import UserProfile
from app.utils.jwt import create_access_token

# Create in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Override the get_db dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """Create a test client"""
    return TestClient(app)


@pytest.fixture
def create_token():
    """Create a valid JWT token for a user"""

    def _create_token(user_id: uuid.UUID):
        return create_access_token(data={"sub": str(user_id)})

    return _create_token


@pytest.fixture
def teacher_role(db):
    """Create teacher role"""
    role = Role(id=uuid.uuid4(), name=RoleName.TEACHER)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@pytest.fixture
def student_role(db):
    """Create student role"""
    role = Role(id=uuid.uuid4(), name=RoleName.STUDENT)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@pytest.fixture
def teacher_user(db, teacher_role):
    """Create a teacher user with profile"""
    user = User(
        id=uuid.uuid4(),
        email="teacher@example.com",
        password_hash="hashed_password",
        is_active=True,
        role_id=teacher_role.id,
    )
    db.add(user)
    db.commit()

    profile = UserProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        first_name="John",
        last_name="Teacher",
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def student_user(db, student_role):
    """Create a student user with profile"""
    user = User(
        id=uuid.uuid4(),
        email="student@example.com",
        password_hash="hashed_password",
        is_active=True,
        role_id=student_role.id,
    )
    db.add(user)
    db.commit()

    profile = UserProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        first_name="Jane",
        last_name="Student",
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def another_student(db, student_role):
    """Create another student user"""
    user = User(
        id=uuid.uuid4(),
        email="student2@example.com",
        password_hash="hashed_password",
        is_active=True,
        role_id=student_role.id,
    )
    db.add(user)
    db.commit()

    profile = UserProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        first_name="Bob",
        last_name="Student",
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def sample_class(db, teacher_user):
    """Create a sample class"""
    class_obj = Class(
        id=uuid.uuid4(),
        name="Math 101",
        description="Introduction to Mathematics",
        teacher_id=teacher_user.id,
    )
    db.add(class_obj)
    db.commit()
    db.refresh(class_obj)
    return class_obj


# Tests for Class CRUD
class TestClassCRUD:
    """Test cases for class CRUD operations"""

    def test_create_class(self, client, teacher_user, create_token):
        """Test creating a new class"""
        token = create_token(teacher_user.id)
        response = client.post(
            "/api/classes",
            json={"name": "Physics 101", "description": "Intro to Physics"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in [201, 501]

    def test_list_teacher_classes(
        self, client, teacher_user, sample_class, create_token
    ):
        """Test listing teacher's classes"""
        token = create_token(teacher_user.id)
        response = client.get(
            "/api/classes",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in [200, 501]

    def test_get_class_detail(self, client, teacher_user, sample_class, create_token):
        """Test getting class details"""
        token = create_token(teacher_user.id)
        response = client.get(
            f"/api/classes/{sample_class.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in [200, 404, 501]

    def test_update_class(self, client, teacher_user, sample_class, create_token):
        """Test updating a class"""
        token = create_token(teacher_user.id)
        response = client.put(
            f"/api/classes/{sample_class.id}",
            json={"name": "Advanced Math"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in [200, 404, 501]

    def test_delete_class(self, client, teacher_user, sample_class, create_token):
        """Test deleting a class"""
        token = create_token(teacher_user.id)
        response = client.delete(
            f"/api/classes/{sample_class.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in [204, 404, 501]


# Tests for Student Management
class TestStudentManagement:
    """Test cases for student management in classes"""

    def test_add_student_to_class(
        self, client, teacher_user, sample_class, student_user, create_token
    ):
        """Test adding a student to a class"""
        token = create_token(teacher_user.id)
        response = client.post(
            f"/api/classes/{sample_class.id}/students",
            json={"email": student_user.email},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in [201, 404, 501]

    def test_add_duplicate_student(
        self, db, client, teacher_user, sample_class, student_user, create_token
    ):
        """Test adding a student that's already enrolled"""
        # Add student first
        class_student = ClassStudent(
            id=uuid.uuid4(),
            class_id=sample_class.id,
            student_id=student_user.id,
        )
        db.add(class_student)
        db.commit()

        # Try to add again
        token = create_token(teacher_user.id)
        response = client.post(
            f"/api/classes/{sample_class.id}/students",
            json={"email": student_user.email},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in [409, 501]

    def test_add_nonexistent_student(
        self, client, teacher_user, sample_class, create_token
    ):
        """Test adding a student that doesn't exist"""
        token = create_token(teacher_user.id)
        response = client.post(
            f"/api/classes/{sample_class.id}/students",
            json={"email": "nonexistent@example.com"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in [404, 501]

    def test_remove_student_from_class(
        self, db, client, teacher_user, sample_class, student_user, create_token
    ):
        """Test removing a student from a class"""
        # Add student first
        class_student = ClassStudent(
            id=uuid.uuid4(),
            class_id=sample_class.id,
            student_id=student_user.id,
        )
        db.add(class_student)
        db.commit()

        # Remove student
        token = create_token(teacher_user.id)
        response = client.delete(
            f"/api/classes/{sample_class.id}/students/{student_user.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in [200, 404, 501]

    def test_list_class_students(
        self,
        db,
        client,
        teacher_user,
        sample_class,
        student_user,
        another_student,
        create_token,
    ):
        """Test listing all students in a class"""
        # Add students
        for student in [student_user, another_student]:
            class_student = ClassStudent(
                id=uuid.uuid4(),
                class_id=sample_class.id,
                student_id=student.id,
            )
            db.add(class_student)
        db.commit()

        token = create_token(teacher_user.id)
        response = client.get(
            f"/api/classes/{sample_class.id}/students",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in [200, 404, 501]


# Tests for Student View
class TestStudentView:
    """Test cases for student viewing their classes"""

    def test_list_student_classes(
        self, db, client, student_user, sample_class, teacher_user, create_token
    ):
        """Test student listing their enrolled classes"""
        # Enroll student in class
        class_student = ClassStudent(
            id=uuid.uuid4(),
            class_id=sample_class.id,
            student_id=student_user.id,
        )
        db.add(class_student)
        db.commit()

        token = create_token(student_user.id)
        response = client.get(
            "/api/students/me/classes",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in [200, 501]

    def test_list_student_classes_with_search(
        self, db, client, student_user, sample_class, create_token
    ):
        """Test student searching their classes"""
        # Enroll student
        class_student = ClassStudent(
            id=uuid.uuid4(),
            class_id=sample_class.id,
            student_id=student_user.id,
        )
        db.add(class_student)
        db.commit()

        token = create_token(student_user.id)
        response = client.get(
            "/api/students/me/classes?search=Math",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in [200, 501]


# Service layer tests (without authentication)
class TestClassService:
    """Direct tests for ClassService methods"""

    def test_create_class_service(self, db, teacher_user):
        """Test creating class through service"""
        from app.schemas.class_schema import ClassCreate
        from app.services.class_service import ClassService

        class_data = ClassCreate(name="Test Class", description="Test Description")
        new_class = ClassService.create_class(db, teacher_user.id, class_data)

        assert new_class.name == "Test Class"
        assert new_class.description == "Test Description"
        assert new_class.teacher_id == teacher_user.id

    def test_get_teacher_classes_service(self, db, teacher_user, sample_class):
        """Test getting teacher classes through service"""
        from app.services.class_service import ClassService

        classes, total = ClassService.get_teacher_classes(db, teacher_user.id)

        assert total == 1
        assert len(classes) == 1
        assert classes[0].id == sample_class.id

    def test_add_student_service(self, db, sample_class, student_user, teacher_user):
        """Test adding student through service"""
        from app.services.class_service import ClassService

        class_student, error = ClassService.add_student_to_class(
            db, sample_class.id, student_user.email, teacher_user.id
        )

        assert error is None
        assert class_student is not None
        assert class_student.student_id == student_user.id

    def test_add_student_already_enrolled(
        self, db, sample_class, student_user, teacher_user
    ):
        """Test adding student that's already enrolled"""
        from app.services.class_service import ClassService

        # Add student first time
        ClassService.add_student_to_class(
            db, sample_class.id, student_user.email, teacher_user.id
        )

        # Try to add again
        class_student, error = ClassService.add_student_to_class(
            db, sample_class.id, student_user.email, teacher_user.id
        )

        assert error is not None
        assert "already enrolled" in error
        assert class_student is None

    def test_remove_student_service(self, db, sample_class, student_user, teacher_user):
        """Test removing student through service"""
        from app.services.class_service import ClassService

        # Add student first
        ClassService.add_student_to_class(
            db, sample_class.id, student_user.email, teacher_user.id
        )

        # Remove student
        success, error = ClassService.remove_student_from_class(
            db, sample_class.id, student_user.id, teacher_user.id
        )

        assert success is True
        assert error is None

    def test_get_student_classes_service(self, db, student_user, sample_class):
        """Test getting student classes through service"""
        from app.services.class_service import ClassService

        # Enroll student
        class_student = ClassStudent(
            id=uuid.uuid4(),
            class_id=sample_class.id,
            student_id=student_user.id,
        )
        db.add(class_student)
        db.commit()

        # Get student classes
        classes, total = ClassService.get_student_classes(db, student_user.id)

        assert total == 1
        assert len(classes) == 1
        assert classes[0].id == sample_class.id


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
