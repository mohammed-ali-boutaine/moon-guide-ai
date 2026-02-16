import math
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import StudentUser
from app.schemas.class_schema import (
    PaginatedStudentClassResponse,
    StudentClassResponse,
    TeacherInfo,
)
from app.services.class_service import ClassService

router = APIRouter(prefix="/api/students", tags=["Students"])


@router.get(
    "/me/classes",
    response_model=PaginatedStudentClassResponse,
    summary="List my enrolled classes",
    description="Get a paginated list of classes the authenticated student is enrolled in.",
)
async def list_my_classes(
    current_user: StudentUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 10,
    search: Annotated[str | None, Query(description="Search by class name")] = None,
    sort_by: Annotated[
        str, Query(description="Sort by field (created_at, name)")
    ] = "created_at",
):
    """
    Get all classes the authenticated student is enrolled in.

    Returns for each class:
    - Class name and description
    - Teacher information (name, email)
    - Total number of students
    - Date when the student joined
    - Class creation date

    Query parameters:
    - **page**: Page number (starts at 1)
    - **page_size**: Number of items per page (max 100)
    - **search**: Optional search term to filter by class name
    - **sort_by**: Sort field (created_at or name)
    """
    skip = (page - 1) * page_size
    classes, total = ClassService.get_student_classes(
        db, current_user.id, skip=skip, limit=page_size, search=search
    )

    # Build response with detailed information
    class_list = []
    for class_obj in classes:
        # Get teacher info
        teacher_info = TeacherInfo(
            id=class_obj.teacher.id,
            email=class_obj.teacher.email,
            first_name=(
                class_obj.teacher.profile.first_name
                if class_obj.teacher.profile
                else ""
            ),
            last_name=(
                class_obj.teacher.profile.last_name if class_obj.teacher.profile else ""
            ),
        )

        # Get student's join date
        joined_at = ClassService.get_student_joined_date(
            db, class_obj.id, current_user.id
        )

        class_response = StudentClassResponse(
            id=class_obj.id,
            name=class_obj.name,
            description=class_obj.description,
            teacher=teacher_info,
            student_count=len(class_obj.class_students),
            joined_at=joined_at,
            created_at=class_obj.created_at,
        )
        class_list.append(class_response)

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return PaginatedStudentClassResponse(
        items=class_list,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
