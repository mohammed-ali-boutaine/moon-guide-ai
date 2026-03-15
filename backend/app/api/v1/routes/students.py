# app/api/v1/routes/students.py
"""
Student-facing class routes — validate input → call ClassService → return response.
"""
import math
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.dependencies import StudentUser
from app.models.class_ import Class
from app.models.class_student import ClassStudent
from app.models.quiz import Quiz
from app.models.quiz_assignment import AssignmentStatus, QuizAssignment
from app.models.quiz_attempt import AttemptStatus, QuizAttempt
from app.schemas.class_schema import (
    PaginatedQuizHistory,
    PaginatedStudentClassResponse,
    QuizHistoryItem,
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


# ── GET /students/me/quiz-history ──────────────────────────────────────────────

@router.get(
    "/me/quiz-history",
    response_model=PaginatedQuizHistory,
    summary="Get my completed quiz attempts",
)
def get_quiz_history(
    current_user: StudentUser,
    db: Annotated[DBSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    class_id: Annotated[Optional[uuid.UUID], Query(description="Filter by class")] = None,
    sort_order: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
) -> PaginatedQuizHistory:
    """
    Return a paginated list of the student's submitted quiz attempts.

    Each item includes quiz title, difficulty, class name (if assigned),
    score, and timestamps.  Filter by `class_id`; sort by `submitted_at`.
    """
    student_id = current_user.id

    # Subquery: for each quiz, find the class where this student is enrolled
    class_subq = (
        select(
            QuizAssignment.quiz_id,
            Class.id.label("class_id"),
            Class.name.label("class_name"),
        )
        .join(ClassStudent, ClassStudent.class_id == QuizAssignment.class_id)
        .join(Class, Class.id == QuizAssignment.class_id)
        .where(
            QuizAssignment.status == AssignmentStatus.active,
            ClassStudent.student_id == student_id,
        )
        .subquery()
    )

    # Base query
    order_col = (
        QuizAttempt.submitted_at.asc()
        if sort_order == "asc"
        else QuizAttempt.submitted_at.desc()
    )

    base = (
        select(
            QuizAttempt.id.label("attempt_id"),
            Quiz.id.label("quiz_id"),
            Quiz.title.label("quiz_title"),
            Quiz.difficulty.label("quiz_difficulty"),
            class_subq.c.class_id,
            class_subq.c.class_name,
            QuizAttempt.score,
            QuizAttempt.status,
            QuizAttempt.started_at,
            QuizAttempt.submitted_at,
        )
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .outerjoin(class_subq, class_subq.c.quiz_id == Quiz.id)
        .where(
            QuizAttempt.student_id == student_id,
            QuizAttempt.status == AttemptStatus.submitted,
        )
        .order_by(order_col)
    )

    if class_id is not None:
        base = base.where(class_subq.c.class_id == class_id)

    # Count
    count_stmt = select(func.count()).select_from(base.subquery())
    total = db.scalar(count_stmt) or 0

    # Paginate
    rows = db.execute(
        base.offset((page - 1) * page_size).limit(page_size)
    ).all()

    items = [
        QuizHistoryItem(
            attempt_id=row.attempt_id,
            quiz_id=row.quiz_id,
            quiz_title=row.quiz_title,
            quiz_difficulty=row.quiz_difficulty,
            class_id=row.class_id,
            class_name=row.class_name,
            score=row.score,
            status=row.status,
            started_at=row.started_at,
            submitted_at=row.submitted_at,
        )
        for row in rows
    ]

    return PaginatedQuizHistory(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
