# app/api/v1/routes/students.py
"""
Student-facing class routes — validate input → call ClassService → return response.
"""
import math
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session as DBSession, selectinload

from fastapi import HTTPException, status as http_status
from app.core.database import get_db
from app.core.dependencies import StudentUser, TeacherUser
from app.models.class_ import Class
from app.models.user import User
from app.models.user_profile import UserProfile
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
from app.schemas.quiz_assignment import AssignedByInfo, StudentAssignedQuizItem
from app.schemas.quiz import QuizResponse
from app.models.quiz import Quiz
from app.models.question import Question
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


# ── GET /students/{student_id}/quiz-history (teacher) ─────────────────────────

@router.get(
    "/{student_id}/quiz-history",
    response_model=PaginatedQuizHistory,
    summary="Get a student's quiz history (teacher only)",
)
def get_student_quiz_history(
    student_id: uuid.UUID,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    sort_order: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
) -> PaginatedQuizHistory:
    """Return a paginated list of submitted quiz attempts for a given student."""
    # Verify student exists
    student = db.scalar(select(User).where(User.id == student_id))
    if student is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Student not found.")

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

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(base.offset((page - 1) * page_size).limit(page_size)).all()

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


# ── GET /students/me/assigned-quizzes ─────────────────────────────────────────

@router.get(
    "/me/assigned-quizzes",
    response_model=list[StudentAssignedQuizItem],
    summary="List quizzes assigned to my enrolled classes",
)
def list_my_assigned_quizzes(
    current_user: StudentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> list[StudentAssignedQuizItem]:
    """
    Return all active quiz assignments across every class the student is enrolled in.
    Each item includes class name, assignment metadata, and the student's latest
    attempt status + score (if any).  Only published quizzes are returned.
    """
    # 1. Enrolled class IDs
    enrolled_ids = db.scalars(
        select(ClassStudent.class_id).where(ClassStudent.student_id == current_user.id)
    ).all()
    if not enrolled_ids:
        return []

    # 2. Class name lookup
    class_map: dict[uuid.UUID, str] = {
        c.id: c.name
        for c in db.scalars(select(Class).where(Class.id.in_(enrolled_ids))).all()
    }

    # 3. Active assignments for those classes (published quizzes only)
    assignments = db.scalars(
        select(QuizAssignment)
        .join(Quiz, Quiz.id == QuizAssignment.quiz_id)
        .where(
            QuizAssignment.class_id.in_(enrolled_ids),
            QuizAssignment.status == AssignmentStatus.active,
            Quiz.status == "published",
        )
        .options(
            selectinload(QuizAssignment.quiz).options(
                selectinload(Quiz.questions).selectinload(Question.answers)
            ),
            selectinload(QuizAssignment.assigned_by),
        )
        .order_by(QuizAssignment.assigned_at.desc())
    ).all()

    # 4. Latest attempt per quiz for this student
    quiz_ids = [a.quiz_id for a in assignments]
    attempt_map: dict[int, any] = {}
    if quiz_ids:
        for row in db.execute(
            select(QuizAttempt.quiz_id, QuizAttempt.id, QuizAttempt.status, QuizAttempt.score)
            .where(
                QuizAttempt.student_id == current_user.id,
                QuizAttempt.quiz_id.in_(quiz_ids),
            )
            .order_by(QuizAttempt.started_at.desc())
        ).all():
            if row.quiz_id not in attempt_map:
                attempt_map[row.quiz_id] = row

    # 5. Build response
    result: list[StudentAssignedQuizItem] = []
    for a in assignments:
        attempt = attempt_map.get(a.quiz_id)
        attempt_status = None
        if attempt:
            s = attempt.status
            attempt_status = s.value if hasattr(s, "value") else str(s)
        result.append(
            StudentAssignedQuizItem(
                assignment_id=a.id,
                assignment_status=a.status.value if hasattr(a.status, "value") else str(a.status),
                assigned_at=a.assigned_at,
                assigned_by=AssignedByInfo.model_validate(a.assigned_by),
                due_date=a.due_date,
                class_id=a.class_id,
                class_name=class_map.get(a.class_id, ""),
                quiz=QuizResponse.model_validate(a.quiz),
                attempt_id=attempt.id if attempt else None,
                attempt_status=attempt_status,
                score=attempt.score if attempt else None,
            )
        )
    return result
