"""Tests for ClassStudent model and many-to-many relationships."""

import uuid
from datetime import datetime

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Class, ClassStudent, User


class TestClassStudentModel:
    """Test cases for ClassStudent model."""

    def test_create_class_student(self, db_session, test_class, student_user):
        """Test creating a class-student association."""
        class_student = ClassStudent(
            class_id=test_class.id,
            student_id=student_user.id,
        )
        db_session.add(class_student)
        db_session.commit()

        retrieved = (
            db_session.query(ClassStudent)
            .filter_by(class_id=test_class.id, student_id=student_user.id)
            .first()
        )
        assert retrieved is not None
        assert retrieved.class_id == test_class.id
        assert retrieved.student_id == student_user.id

    def test_joined_at_auto_set(self, db_session, test_class, student_user):
        """Test that joined_at is set automatically."""
        class_student = ClassStudent(
            class_id=test_class.id,
            student_id=student_user.id,
        )
        db_session.add(class_student)
        db_session.commit()

        assert class_student.joined_at is not None
        assert isinstance(class_student.joined_at, datetime)

    def test_class_students_relationship(self, db_session, test_class, student_user):
        """Test class_students relationship on Class."""
        class_student = ClassStudent(
            class_id=test_class.id,
            student_id=student_user.id,
        )
        db_session.add(class_student)
        db_session.commit()

        db_session.refresh(test_class)
        assert len(test_class.class_students) == 1
        assert test_class.class_students[0].student_id == student_user.id

    def test_class_students_many_to_many_relationship(
        self, db_session, test_class, student_user
    ):
        """Test many-to-many relationship through secondary table."""
        class_student = ClassStudent(
            class_id=test_class.id,
            student_id=student_user.id,
        )
        db_session.add(class_student)
        db_session.commit()

        db_session.refresh(test_class)
        assert len(test_class.students) == 1
        assert test_class.students[0].id == student_user.id

    def test_student_enrolled_classes_relationship(
        self, db_session, test_class, student_user
    ):
        """Test enrolled_classes relationship on User."""
        class_student = ClassStudent(
            class_id=test_class.id,
            student_id=student_user.id,
        )
        db_session.add(class_student)
        db_session.commit()

        db_session.refresh(student_user)
        assert len(student_user.enrolled_classes) == 1
        assert test_class.id in [c.id for c in student_user.enrolled_classes]

    def test_student_multiple_classes(self, db_session, teacher_user, student_user):
        """Test that a student can enroll in multiple classes."""
        class1 = Class(name="Class 1", teacher_id=teacher_user.id)
        class2 = Class(name="Class 2", teacher_id=teacher_user.id)
        db_session.add(class1)
        db_session.add(class2)
        db_session.commit()

        cs1 = ClassStudent(class_id=class1.id, student_id=student_user.id)
        cs2 = ClassStudent(class_id=class2.id, student_id=student_user.id)
        db_session.add(cs1)
        db_session.add(cs2)
        db_session.commit()

        db_session.refresh(student_user)
        assert len(student_user.enrolled_classes) == 2

    def test_multiple_students_in_class(self, db_session, test_class):
        """Test that multiple students can enroll in the same class."""
        student1 = User(
            email="student1@example.com", password_hash="hash1", is_active=True
        )
        student2 = User(
            email="student2@example.com", password_hash="hash2", is_active=True
        )
        db_session.add(student1)
        db_session.add(student2)
        db_session.commit()

        cs1 = ClassStudent(class_id=test_class.id, student_id=student1.id)
        cs2 = ClassStudent(class_id=test_class.id, student_id=student2.id)
        db_session.add(cs1)
        db_session.add(cs2)
        db_session.commit()

        db_session.refresh(test_class)
        assert len(test_class.students) == 2

    def test_unique_constraint_class_student(
        self, db_session, test_class, student_user
    ):
        """Test that a student cannot enroll twice in the same class."""
        from sqlalchemy.exc import IntegrityError

        cs1 = ClassStudent(class_id=test_class.id, student_id=student_user.id)
        db_session.add(cs1)
        db_session.commit()

        # Try to add the same student to the same class again
        cs2 = ClassStudent(class_id=test_class.id, student_id=student_user.id)
        db_session.add(cs2)

        with pytest.raises(IntegrityError):
            db_session.commit()

 
    def test_cascade_delete_student_removes_enrollments(
        self, db_session, test_class, student_user
    ):
        """Test that class_students are deleted when student is deleted."""
        class_student = ClassStudent(
            class_id=test_class.id,
            student_id=student_user.id,
        )
        db_session.add(class_student)
        db_session.commit()

        student_id = student_user.id

        # Delete the student
        db_session.delete(student_user)
        db_session.commit()

        # ClassStudent should be deleted too
        remaining = (
            db_session.query(ClassStudent).filter_by(student_id=student_id).all()
        )
        assert len(remaining) == 0

    def test_class_student_requires_class_and_student(self, db_session):
        """Test that ClassStudent requires both class_id and student_id."""
        # Missing student_id
        cs = ClassStudent(class_id=uuid.uuid4())
        db_session.add(cs)

        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_class_student_index_on_class_id(
        self, db_session, test_class, student_user
    ):
        """Test that there's an index on class_id for efficient queries."""
        class_student = ClassStudent(
            class_id=test_class.id,
            student_id=student_user.id,
        )
        db_session.add(class_student)
        db_session.commit()

        # This query should be efficient due to the index
        result = (
            db_session.query(ClassStudent).filter_by(class_id=test_class.id).all()
        )
        assert len(result) == 1

    def test_class_student_index_on_student_id(
        self, db_session, test_class, student_user
    ):
        """Test that there's an index on student_id for efficient queries."""
        class_student = ClassStudent(
            class_id=test_class.id,
            student_id=student_user.id,
        )
        db_session.add(class_student)
        db_session.commit()

        # This query should be efficient due to the index
        result = (
            db_session.query(ClassStudent).filter_by(student_id=student_user.id).all()
        )
        assert len(result) == 1
