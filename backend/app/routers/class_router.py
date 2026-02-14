import math
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import TeacherUser
from app.schemas.class_schema import (
    AddStudentRequest,
    AddStudentResponse,
    ClassCreate,
    ClassDetailResponse,
    ClassListResponse,
    ClassResponse,
    ClassUpdate,
    PaginatedClassResponse,
    RemoveStudentResponse,
    StudentInClass,
)
from app.services.class_service import ClassService

router = APIRouter(prefix="/api/classes", tags=["Classes"])


@router.post(
    "",
    response_model=ClassResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new class",
    description="Create a new class. Only teachers can create classes.",
)
async def create_class(
    class_data: ClassCreate,
    current_user: TeacherUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Create a new class with the following information:
    - **name**: Class name (required)
    - **description**: Class description (optional)

    The authenticated teacher will be set as the class owner.
    """
    new_class = ClassService.create_class(db, current_user.id, class_data)
    return new_class


@router.get(
    "",
    response_model=PaginatedClassResponse,
    summary="List my classes",
    description="Get a paginated list of classes owned by the authenticated teacher.",
)
async def list_my_classes(
    current_user: TeacherUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 10,
    search: Annotated[str | None, Query(description="Search by class name")] = None,
):
    """
    Get all classes owned by the authenticated teacher with pagination.

    - **page**: Page number (starts at 1)
    - **page_size**: Number of items per page (max 100)
    - **search**: Optional search term to filter by class name
    """
    skip = (page - 1) * page_size
    classes, total = ClassService.get_teacher_classes(
        db, current_user.id, skip=skip, limit=page_size, search=search
    )

    # Calculate student count for each class
    class_list = []
    for class_obj in classes:
        class_dict = ClassListResponse.model_validate(class_obj)
        class_dict.student_count = len(class_obj.class_students)
        class_list.append(class_dict)

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return PaginatedClassResponse(
        items=class_list,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{class_id}",
    response_model=ClassDetailResponse,
    summary="Get class details",
    description="Get detailed information about a specific class including student list.",
)
async def get_class_detail(
    class_id: UUID,
    current_user: TeacherUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Get detailed information about a specific class.

    Returns:
    - Class information
    - List of enrolled students with their profiles
    - Total student count

    Only the class owner can access this endpoint.
    """
    class_obj = ClassService.get_class_by_id(db, class_id, current_user.id)

    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or you don't have permission to access it",
        )

    # Build response with student details
    students_with_join_date = []

    # Create a mapping of student_id to joined_at
    join_dates = {cs.student_id: cs.joined_at for cs in class_obj.class_students}

    for student in class_obj.students:
        student_data = StudentInClass(
            id=student.id,
            email=student.email,
            first_name=student.profile.first_name if student.profile else "",
            last_name=student.profile.last_name if student.profile else "",
            joined_at=join_dates.get(student.id),
        )
        students_with_join_date.append(student_data)

    response = ClassDetailResponse(
        id=class_obj.id,
        name=class_obj.name,
        description=class_obj.description,
        teacher_id=class_obj.teacher_id,
        created_at=class_obj.created_at,
        students=students_with_join_date,
        student_count=len(students_with_join_date),
    )

    return response


@router.put(
    "/{class_id}",
    response_model=ClassResponse,
    summary="Update a class",
    description="Update class information. Only the class owner can update.",
)
async def update_class(
    class_id: UUID,
    class_data: ClassUpdate,
    current_user: TeacherUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Update class information.

    - **name**: New class name (optional)
    - **description**: New class description (optional)

    Only fields provided in the request will be updated.
    Only the class owner can update the class.
    """
    updated_class = ClassService.update_class(db, class_id, current_user.id, class_data)

    if not updated_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or you don't have permission to update it",
        )

    return updated_class


@router.delete(
    "/{class_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a class",
    description="Delete a class. Only the class owner can delete.",
)
async def delete_class(
    class_id: UUID,
    current_user: TeacherUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Delete a class.

    This will also remove all student enrollments.
    Only the class owner can delete the class.
    """
    success = ClassService.delete_class(db, class_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or you don't have permission to delete it",
        )

    return None


@router.post(
    "/{class_id}/students",
    response_model=AddStudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a student to class",
    description="Add a student to the class by email. Only the class owner can add students.",
)
async def add_student_to_class(
    class_id: UUID,
    student_data: AddStudentRequest,
    current_user: TeacherUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Add a student to the class by their email address.

    - **email**: Student's email address

    Validations:
    - User must exist and have STUDENT role
    - Student must not already be enrolled in the class
    - Only the class owner can add students
    """
    class_student, error = ClassService.add_student_to_class(
        db, class_id, student_data.email, current_user.id
    )

    if error:
        status_code = status.HTTP_404_NOT_FOUND
        if "already enrolled" in error:
            status_code = status.HTTP_409_CONFLICT
        elif "not a student" in error:
            status_code = status.HTTP_400_BAD_REQUEST

        raise HTTPException(status_code=status_code, detail=error)

    # Get the full student data
    class_obj = ClassService.get_class_with_students(db, class_id)
    student = next(
        (s for s in class_obj.students if s.id == class_student.student_id), None
    )

    if not student:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving student information",
        )

    student_info = StudentInClass(
        id=student.id,
        email=student.email,
        first_name=student.profile.first_name if student.profile else "",
        last_name=student.profile.last_name if student.profile else "",
        joined_at=class_student.joined_at,
    )

    return AddStudentResponse(
        message="Student added successfully",
        student=student_info,
    )


@router.delete(
    "/{class_id}/students/{student_id}",
    response_model=RemoveStudentResponse,
    summary="Remove a student from class",
    description="Remove a student from the class. Only the class owner can remove students.",
)
async def remove_student_from_class(
    class_id: UUID,
    student_id: UUID,
    current_user: TeacherUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Remove a student from the class.

    Only the class owner can remove students.
    """
    success, error = ClassService.remove_student_from_class(
        db, class_id, student_id, current_user.id
    )

    if error:
        status_code = status.HTTP_404_NOT_FOUND
        raise HTTPException(status_code=status_code, detail=error)

    return RemoveStudentResponse(message="Student removed successfully")


@router.get(
    "/{class_id}/students",
    response_model=list[StudentInClass],
    summary="List students in class",
    description="Get list of all students enrolled in the class.",
)
async def list_class_students(
    class_id: UUID,
    current_user: TeacherUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Get a list of all students enrolled in the class.

    Returns student information including:
    - ID, email, name
    - Date when they joined the class

    Only the class owner can access this endpoint.
    """
    students = ClassService.get_class_students(db, class_id, current_user.id)

    if students is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or you don't have permission to access it",
        )

    # Get join dates for all students
    student_list = []
    for student in students:
        joined_at = ClassService.get_student_joined_date(db, class_id, student.id)
        student_data = StudentInClass(
            id=student.id,
            email=student.email,
            first_name=student.profile.first_name if student.profile else "",
            last_name=student.profile.last_name if student.profile else "",
            joined_at=joined_at,
        )
        student_list.append(student_data)

    return student_list
