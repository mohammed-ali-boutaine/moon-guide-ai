# app/api/v1/routes/students.py
"""
Student-facing class routes — validate input → call ClassService → return response.
"""
import math
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.dependencies import StudentUser
from app.schemas.class_schema import (
    PaginatedStudentClassResponse,
    StudentClassResponse,
    TeacherInfo,
)
from app.services.class_service import ClassService

router = APIRouter(prefix="/students", tags=["students"])


@router.get(
    "/me/classes",
    response_model=PaginatedStudentClassResponse,
    summary="List my enrolled classes",
)
async def list_my_classes(
    current_user: StudentUser,
    db: Annotated[DBSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 10,
    search: Annotated[str | None, Query(description="Filter by class name")] = None,
    sort_by: Annotated[str, Query(description="Sort field: created_at or name")] = "created_at",
):
    """Return a paginated list of classes the authenticated student is enrolled in."""
    skip = (page - 1) * page_size
    classes, total = ClassService.get_student_classes(
        db, current_user.id, skip=skip, limit=page_size, search=search, sort_by=sort_by
    )

    class_list = [
        StudentClassResponse(
            id=c.id,
            name=c.name,
            description=c.description,
            teacher=TeacherInfo(
                id=c.teacher.id,
                email=c.teacher.email,
                first_name=c.teacher.profile.first_name if c.teacher.profile else "",
                last_name=c.teacher.profile.last_name if c.teacher.profile else "",
            ),
            student_count=len(c.class_students),
            joined_at=ClassService.get_student_joined_date(db, c.id, current_user.id),
            created_at=c.created_at,
        )
        for c in classes
    ]

    return PaginatedStudentClassResponse(
        items=class_list,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
