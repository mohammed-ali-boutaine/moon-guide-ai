import logging
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.class_ import Class
from app.models.class_student import ClassStudent
from app.models.role import RoleName
from app.models.user import User
from app.schemas.class_schema import ClassCreate, ClassUpdate

logger = logging.getLogger(__name__)


class ClassService:
    """Service for managing classes"""

    @staticmethod
    def create_class(db: Session, teacher_id: UUID, class_data: ClassCreate) -> Class:
        """
        Create a new class

        Args:
            db: Database session
            teacher_id: ID of the teacher creating the class
            class_data: Class creation data

        Returns:
            Created class
        """
        try:
            new_class = Class(
                name=class_data.name,
                description=class_data.description,
                teacher_id=teacher_id,
            )
            db.add(new_class)
            db.commit()
            db.refresh(new_class)
            logger.info(
                f"Class created successfully: {new_class.id} by teacher {teacher_id}"
            )
            return new_class
        except Exception as e:
            logger.error(f"Error creating class: {str(e)}", exc_info=True)
            db.rollback()
            raise

    @staticmethod
    def get_teacher_classes(
        db: Session,
        teacher_id: UUID,
        skip: int = 0,
        limit: int = 10,
        search: str | None = None,
    ) -> tuple[list[Class], int]:
        """
        Get all classes for a teacher with pagination

        Args:
            db: Database session
            teacher_id: Teacher ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Optional search term for class name

        Returns:
            Tuple of (list of classes, total count)
        """
        query = select(Class).where(Class.teacher_id == teacher_id)

        # Add search filter if provided
        if search:
            query = query.where(Class.name.ilike(f"%{search}%"))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = db.execute(count_query).scalar_one()

        # Get paginated results with student count
        query = (
            query.options(selectinload(Class.class_students))
            .order_by(Class.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        classes = db.execute(query).scalars().all()
        return list(classes), total

    @staticmethod
    def get_class_by_id(
        db: Session, class_id: UUID, teacher_id: UUID | None = None, search: str | None = None
    ) -> Class | None:
        """
        Get a class by ID, optionally verifying ownership and filtering students by email

        Args:
            db: Database session
            class_id: Class ID
            teacher_id: Optional teacher ID to verify ownership
            search: Optional search term to filter students by email

        Returns:
            Class if found and owned by teacher, None otherwise
        """
        query = select(Class).where(Class.id == class_id)

        if teacher_id:
            query = query.where(Class.teacher_id == teacher_id)

        # Load students with profile, and filter by email if search is provided
        if search:
            query = query.options(
                selectinload(Class.class_students),
                selectinload(Class.students)
                .joinedload(User.profile)
                .load_only()  # We'll filter students separately
            )
        else:
            query = query.options(
                selectinload(Class.class_students).joinedload(ClassStudent.class_),
                selectinload(Class.students).joinedload(User.profile),
            )

        result = db.execute(query).scalar_one_or_none()
        
        # Filter students by email if search is provided
        if result and search:
            filtered_students = [
                student for student in result.students
                if search.lower() in student.email.lower()
            ]
            # Replace the students list with filtered results
            result.students = filtered_students
        
        return result

    @staticmethod
    def get_class_with_students(db: Session, class_id: UUID) -> Class | None:
        """
        Get a class with all student details loaded

        Args:
            db: Database session
            class_id: Class ID

        Returns:
            Class with students loaded
        """
        query = (
            select(Class)
            .where(Class.id == class_id)
            .options(
                selectinload(Class.class_students),
                selectinload(Class.students).joinedload(User.profile),
            )
        )
        return db.execute(query).scalar_one_or_none()

    @staticmethod
    def update_class(
        db: Session, class_id: UUID, teacher_id: UUID, class_data: ClassUpdate
    ) -> Class | None:
        """
        Update a class

        Args:
            db: Database session
            class_id: Class ID
            teacher_id: Teacher ID (for ownership verification)
            class_data: Updated class data

        Returns:
            Updated class if found and owned, None otherwise
        """
        class_obj = ClassService.get_class_by_id(db, class_id, teacher_id)
        if not class_obj:
            return None

        # Update only provided fields
        update_data = class_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(class_obj, field, value)

        db.commit()
        db.refresh(class_obj)
        return class_obj

    @staticmethod
    def delete_class(db: Session, class_id: UUID, teacher_id: UUID) -> bool:
        """
        Delete a class

        Args:
            db: Database session
            class_id: Class ID
            teacher_id: Teacher ID (for ownership verification)

        Returns:
            True if deleted, False if not found or not owned
        """
        class_obj = ClassService.get_class_by_id(db, class_id, teacher_id)
        if not class_obj:
            return False

        db.delete(class_obj)
        db.commit()
        return True

    @staticmethod
    def add_student_to_class(
        db: Session, class_id: UUID, student_email: str, teacher_id: UUID
    ) -> tuple[ClassStudent | None, str | None]:
        """
        Add a student to a class by email

        Args:
            db: Database session
            class_id: Class ID
            student_email: Student's email address
            teacher_id: Teacher ID (for ownership verification)

        Returns:
            Tuple of (ClassStudent object or None, error message or None)
        """
        # Verify class ownership
        class_obj = ClassService.get_class_by_id(db, class_id, teacher_id)
        if not class_obj:
            return None, "Class not found or you don't have permission"

        # Find student by email
        student = db.execute(
            select(User)
            .where(User.email == student_email)
            .options(joinedload(User.role), joinedload(User.profile))
        ).scalar_one_or_none()

        if not student:
            return None, f"No user found with email: {student_email}"

        # Verify student role
        if not student.role or student.role.name != RoleName.STUDENT:
            return None, "User is not a student"

        # Check if student is already in class
        existing = db.execute(
            select(ClassStudent).where(
                ClassStudent.class_id == class_id,
                ClassStudent.student_id == student.id,
            )
        ).scalar_one_or_none()

        if existing:
            return None, "Student is already enrolled in this class"

        # Add student to class
        try:
            class_student = ClassStudent(class_id=class_id, student_id=student.id)
            db.add(class_student)
            db.commit()
            db.refresh(class_student)

            # Load the relationship data
            db.refresh(student)
            logger.info(f"Student {student.email} added to class {class_id}")
            return class_student, None
        except IntegrityError as e:
            db.rollback()
            logger.warning(f"Integrity error adding student to class: {str(e)}")
            return None, "Error adding student to class"
        except Exception as e:
            db.rollback()
            logger.error(f"Error adding student to class: {str(e)}", exc_info=True)
            return None, "Error adding student to class"

    @staticmethod
    def add_students_to_class_batch(
        db: Session, class_id: UUID, emails: list[str], teacher_id: UUID
    ) -> tuple[list[dict], str | None]:
        """
        Add multiple students to a class by email

        Args:
            db: Database session
            class_id: Class ID
            emails: List of student email addresses
            teacher_id: Teacher ID (for ownership verification)

        Returns:
            Tuple of (list of results, error message for ownership issues or None)
            Each result is a dict with: email, success, error, student_data
        """
        # Verify class ownership once
        class_obj = ClassService.get_class_by_id(db, class_id, teacher_id)
        if not class_obj:
            return [], "Class not found or you don't have permission"

        results = []

        for email in emails:
            email = email.strip().lower()
            if not email:
                continue

            result = {
                "email": email,
                "success": False,
                "error": None,
                "student_data": None,
            }

            # Find student by email
            student = db.execute(
                select(User)
                .where(User.email == email)
                .options(joinedload(User.role), joinedload(User.profile))
            ).scalar_one_or_none()

            if not student:
                result["error"] = f"No user found with email: {email}"
                results.append(result)
                continue

            # Verify student role
            if not student.role or student.role.name != RoleName.STUDENT:
                result["error"] = "User is not a student"
                results.append(result)
                continue

            # Check if student is already in class
            existing = db.execute(
                select(ClassStudent).where(
                    ClassStudent.class_id == class_id,
                    ClassStudent.student_id == student.id,
                )
            ).scalar_one_or_none()

            if existing:
                result["error"] = "Student is already enrolled in this class"
                results.append(result)
                continue

            # Add student to class
            try:
                class_student = ClassStudent(
                    class_id=class_id, student_id=student.id
                )
                db.add(class_student)
                db.commit()
                db.refresh(class_student)

                # Load the relationship data
                db.refresh(student)

                # Build student data response
                result["success"] = True
                result["student_data"] = {
                    "id": student.id,
                    "email": student.email,
                    "first_name": (
                        student.profile.first_name if student.profile else ""
                    ),
                    "last_name": student.profile.last_name if student.profile else "",
                    "joined_at": class_student.joined_at,
                }

                logger.info(f"Student {student.email} added to class {class_id}")
            except IntegrityError as e:
                db.rollback()
                logger.warning(
                    f"Integrity error adding student {email} to class: {str(e)}"
                )
                result["error"] = "Error adding student to class"
            except Exception as e:
                db.rollback()
                logger.error(
                    f"Error adding student {email} to class: {str(e)}", exc_info=True
                )
                result["error"] = "Error adding student to class"

            results.append(result)

        return results, None

    @staticmethod
    def remove_student_from_class(
        db: Session, class_id: UUID, student_id: UUID, teacher_id: UUID
    ) -> tuple[bool, str | None]:
        """
        Remove a student from a class

        Args:
            db: Database session
            class_id: Class ID
            student_id: Student ID
            teacher_id: Teacher ID (for ownership verification)

        Returns:
            Tuple of (success boolean, error message or None)
        """
        # Verify class ownership
        class_obj = ClassService.get_class_by_id(db, class_id, teacher_id)
        if not class_obj:
            return False, "Class not found or you don't have permission"

        # Find the class_student relationship
        class_student = db.execute(
            select(ClassStudent).where(
                ClassStudent.class_id == class_id,
                ClassStudent.student_id == student_id,
            )
        ).scalar_one_or_none()

        if not class_student:
            return False, "Student not found in this class"

        db.delete(class_student)
        db.commit()
        return True, None

    @staticmethod
    def get_class_students(
        db: Session, class_id: UUID, teacher_id: UUID | None = None
    ) -> list[User] | None:
        """
        Get all students in a class

        Args:
            db: Database session
            class_id: Class ID
            teacher_id: Optional teacher ID for ownership verification

        Returns:
            List of students or None if class not found/not authorized
        """
        # Verify class exists and ownership if teacher_id provided
        query = select(Class).where(Class.id == class_id)
        if teacher_id:
            query = query.where(Class.teacher_id == teacher_id)

        class_obj = db.execute(query).scalar_one_or_none()
        if not class_obj:
            return None

        # Get students with their profiles and join date
        students_query = (
            select(User)
            .join(ClassStudent, ClassStudent.student_id == User.id)
            .where(ClassStudent.class_id == class_id)
            .options(joinedload(User.profile))
            .order_by(User.email)
        )

        students = db.execute(students_query).scalars().unique().all()
        return list(students)

    @staticmethod
    def get_student_classes(
        db: Session,
        student_id: UUID,
        skip: int = 0,
        limit: int = 10,
        search: str | None = None,
        sort_by: str = "created_at",
    ) -> tuple[list[Class], int]:
        """
        Get all classes a student is enrolled in

        Args:
            db: Database session
            student_id: Student ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Optional search term for class name
            sort_by: Sort field (created_at or name)

        Returns:
            Tuple of (list of classes, total count)
        """
        # Base query - classes where student is enrolled
        query = (
            select(Class)
            .join(ClassStudent, ClassStudent.class_id == Class.id)
            .where(ClassStudent.student_id == student_id)
        )

        # Add search filter if provided
        if search:
            query = query.where(Class.name.ilike(f"%{search}%"))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = db.execute(count_query).scalar_one()

        # Apply sorting
        if sort_by == "name":
            query = query.order_by(Class.name.asc())
        else:
            query = query.order_by(Class.created_at.desc())

        # Get paginated results with related data
        query = query.options(
            joinedload(Class.teacher).joinedload(User.profile),
            selectinload(Class.class_students),
        ).offset(skip).limit(limit)

        classes = db.execute(query).scalars().unique().all()
        return list(classes), total

    @staticmethod
    def get_student_joined_date(db: Session, class_id: UUID, student_id: UUID):
        """
        Get the date when a student joined a class

        Args:
            db: Database session
            class_id: Class ID
            student_id: Student ID

        Returns:
            joined_at datetime or None
        """
        class_student = db.execute(
            select(ClassStudent).where(
                ClassStudent.class_id == class_id,
                ClassStudent.student_id == student_id,
            )
        ).scalar_one_or_none()

        return class_student.joined_at if class_student else None

    @staticmethod
    def get_recent_students_for_teacher(
        db: Session, teacher_id: UUID, limit: int = 10
    ) -> list[dict]:
        """
        Get recent students who joined any class owned by the teacher.

        Args:
            db: Database session
            teacher_id: Teacher ID
            limit: Maximum number of records to return

        Returns:
            List of dicts with student and class join info
        """
        query = (
            select(User, ClassStudent.joined_at, Class.id.label("class_id"), Class.name.label("class_name"))
            .join(ClassStudent, ClassStudent.student_id == User.id)
            .join(Class, Class.id == ClassStudent.class_id)
            .where(Class.teacher_id == teacher_id)
            .order_by(ClassStudent.joined_at.desc())
            .limit(limit)
            .options(joinedload(User.profile))
        )

        rows = db.execute(query).all()

        results: list[dict] = []
        for row in rows:
            # row is a Row mapping: (User, joined_at, class_id, class_name)
            user = row[0]
            joined_at = row[1]
            class_id = row[2]
            class_name = row[3]

            results.append(
                {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.profile.first_name if getattr(user, "profile", None) else "",
                    "last_name": user.profile.last_name if getattr(user, "profile", None) else "",
                    "joined_at": joined_at,
                    "class_id": class_id,
                    "class_name": class_name,
                }
            )

        return results
