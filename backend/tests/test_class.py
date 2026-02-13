"""Tests for Class model."""

from datetime import datetime

import pytest

from app.models import Class


class TestClassModel:
    """Test cases for Class model."""

    def test_create_class(self, test_session, teacher_user):
        """Test creating a class."""
        test_class = Class(
            name="Advanced Python",
            description="Advanced Python Programming",
            teacher_id=teacher_user.id,
        )
        test_session.add(test_class)
        test_session.commit()

        retrieved_class = test_session.query(Class).filter_by(id=test_class.id).first()
        assert retrieved_class is not None
        assert retrieved_class.name == "Advanced Python"
        assert retrieved_class.description == "Advanced Python Programming"
        assert retrieved_class.teacher_id == teacher_user.id

    def test_class_created_at_auto_set(self, test_session, teacher_user):
        """Test that created_at is set automatically."""
        test_class = Class(
            name="Test Class",
            description="Test Description",
            teacher_id=teacher_user.id,
        )
        test_session.add(test_class)
        test_session.commit()

        assert test_class.created_at is not None
        assert isinstance(test_class.created_at, datetime)

    def test_class_description_optional(self, test_session, teacher_user):
        """Test that description is optional."""
        test_class = Class(
            name="Test Class",
            teacher_id=teacher_user.id,
        )
        test_session.add(test_class)
        test_session.commit()

        retrieved_class = test_session.query(Class).filter_by(id=test_class.id).first()
        assert retrieved_class is not None
        assert retrieved_class.description is None

    def test_class_teacher_relationship(self, test_session, teacher_user, test_class):
        """Test Many-to-One relationship with User (teacher)."""
        # Verify the teacher relationship
        assert test_class.teacher.id == teacher_user.id
        assert test_class.teacher.email == teacher_user.email

    def test_teacher_taught_classes_relationship(self, test_session, teacher_user):
        """Test One-to-Many relationship with User (taught_classes)."""
        # Create multiple classes for the teacher
        class1 = Class(name="Class 1", teacher_id=teacher_user.id)
        class2 = Class(name="Class 2", teacher_id=teacher_user.id)
        test_session.add(class1)
        test_session.add(class2)
        test_session.commit()

        # Refresh the teacher to get the relationship
        test_session.refresh(teacher_user)

        assert len(teacher_user.taught_classes) == 2
        assert class1 in teacher_user.taught_classes
        assert class2 in teacher_user.taught_classes

    def test_class_requires_teacher_id(self, test_session):
        """Test that class requires a teacher_id."""
        test_class = Class(
            name="Test Class",
            description="Test Description",
        )
        test_session.add(test_class)

        # Should raise an integrity error
        with pytest.raises(ValueError):
            test_session.commit()

    def test_class_name_required(self, test_session, teacher_user):
        """Test that class name is required."""
        test_class = Class(
            teacher_id=teacher_user.id,
        )
        test_session.add(test_class)

        with pytest.raises(ValueError):
            test_session.commit()

    def test_cascade_delete_classes(self, test_session, teacher_user):
        """Test that classes are deleted when teacher is deleted."""
        class1 = Class(name="Class 1", teacher_id=teacher_user.id)
        class2 = Class(name="Class 2", teacher_id=teacher_user.id)
        test_session.add(class1)
        test_session.add(class2)
        test_session.commit()

        teacher_id = teacher_user.id

        # Delete the teacher
        test_session.delete(teacher_user)
        test_session.commit()

        # Classes should be deleted too
        remaining_classes = (
            test_session.query(Class).filter_by(teacher_id=teacher_id).all()
        )
        assert len(remaining_classes) == 0

    def test_class_query_by_teacher(self, test_session, teacher_user):
        """Test querying classes by teacher."""
        class1 = Class(name="Class 1", teacher_id=teacher_user.id)
        test_session.add(class1)
        test_session.commit()

        # Query classes by teacher
        classes = test_session.query(Class).filter_by(teacher_id=teacher_user.id).all()
        assert len(classes) == 1
        assert classes[0].name == "Class 1"
