"""
routes/quiz.py

Quiz generation, CRUD, and assignment endpoints:
  POST  /quiz/generate              – start async quiz generation job
  GET   /quiz/jobs/{job_id}         – poll job status
  GET   /quiz/assigned/{class_id}   – quizzes assigned to a class
  POST  /quiz/{quiz_id}/assign      – assign a quiz to a class (teacher)
  DELETE /quiz/{quiz_id}/unassign   – remove assignment (teacher)
  GET   /quiz/{quiz_id}             – retrieve quiz with questions+answers
  POST  /quiz                       – create quiz manually
  PATCH /quiz/{quiz_id}             – update quiz metadata/status
  POST  /quiz/{quiz_id}/start       – start a quiz attempt (student)
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DBSession, selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import CurrentUser, StudentUser, TeacherUser
from app.models.role import RoleName
from app.core.logging import logger
from app.models.answer import Answer
from app.models.class_ import Class
from app.models.class_student import ClassStudent
from app.models.document import Document, StatusEnum
from app.models.question import Question
from app.models.quiz import Quiz, QuizStatus
from app.models.quiz_assignment import AssignmentStatus, QuizAssignment
from app.models.quiz_attempt import AttemptStatus, QuizAttempt
from app.models.quiz_job import JobStatus, QuizJob
from app.models.student_answer import StudentAnswer
from app.schemas.quiz import (
    QuizAttemptItem,
    QuizAttemptStartResponse,
    QuizAttemptSubmitResponse,
    QuizAttemptsListResponse,
    QuizCreateRequest,
    QuizGenerateRequest,
    QuizJobDetailResponse,
    QuizJobResponse,
    QuizResponse,
    QuizSubmitRequest,
    QuizUpdateRequest,
    TeacherQuizListItem,
    TeacherQuizListResponse,
)
from app.schemas.quiz_assignment import (
    AssignedQuizItem,
    AssignQuizRequest,
    QuizAssignmentResponse,
    UnassignQuizRequest,
)
from app.schemas.grading import (
    AttemptResultResponse,
    QuestionFeedbackResponse,
    QuestionResult,
    ShortAnswerGradeResponse,
    TeacherReviewRequest,
)
from app.core.rate_limit import RateLimiter
from app.services.notification_service import notify_quiz_assigned

router = APIRouter(prefix="/quiz", tags=["Quiz Generation"])

_rate_limit_quiz_gen = RateLimiter("quiz_gen", max_requests=5, window_seconds=60)
_rate_limit_quiz_submit = RateLimiter("quiz_submit", max_requests=10, window_seconds=60)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _job_to_response(job: QuizJob) -> QuizJobDetailResponse:
    return QuizJobDetailResponse(
        job_id=job.id,
        status=job.status,
        document_id=job.document_id,
        quiz_id=job.quiz_id,
        num_questions=job.num_questions,
        difficulty=job.difficulty,
        error_message=job.error_message,
        total_tokens=job.total_tokens,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


# ── POST /quiz/generate ───────────────────────────────────────────────────────

@router.post(
    "/generate",
    response_model=QuizJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start async quiz generation from a document",
)
def generate_quiz(
    body: QuizGenerateRequest,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
    _: Annotated[None, Depends(_rate_limit_quiz_gen)],
) -> QuizJobResponse:
    """
    Enqueue a background job to generate MCQ + True/False questions from a document.

    - The document must be in `ready` status (fully processed).
    - Only the document owner or a teacher with access can generate a quiz.
    - Returns a `job_id` to poll with `GET /quiz/jobs/{job_id}`.

    Body:
    - `document_id`: ID of the source document
    - `num_questions`: 5–50
    - `difficulty`: easy | medium | hard
    """
    # ── Verify document exists and is ready ───────────────────────────────────
    doc = db.scalar(
        select(Document).where(
            Document.id == body.document_id,
            Document.deleted_at.is_(None),
        )
    )
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {body.document_id} not found.",
        )

    if doc.status != StatusEnum.ready:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Document is not ready for quiz generation (status: {doc.status.value}). "
                "Wait for processing to complete."
            ),
        )

    # ── Access control: owner or teacher ─────────────────────────────────────
    if str(doc.uploaded_by_id) != str(current_user.id):
        # Teacher can generate quizzes for class documents they have access to
        if not (current_user.role and current_user.role.name == RoleName.TEACHER):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this document.",
            )

    # ── Create QuizJob row ────────────────────────────────────────────────────
    job = QuizJob(
        id=uuid.uuid4(),
        user_id=current_user.id,
        document_id=body.document_id,
        num_questions=body.num_questions,
        difficulty=body.difficulty,
        status=JobStatus.pending,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # ── Dispatch Celery task ──────────────────────────────────────────────────
    from app.services.quiz_service import generate_quiz_task

    generate_quiz_task.delay(
        job_id=str(job.id),
        document_id=body.document_id,
        num_questions=body.num_questions,
        difficulty=body.difficulty,
        db_url=settings.DATABASE_URL,
    )

    logger.info(
        "Quiz generation queued: job=%s doc=%d n=%d diff=%s user=%s",
        job.id, body.document_id, body.num_questions, body.difficulty, current_user.email,
    )

    return QuizJobResponse(
        job_id=job.id,
        status=job.status,
        document_id=job.document_id,
        num_questions=job.num_questions,
        difficulty=job.difficulty,
        created_at=job.created_at,
    )


# ── GET /quiz/jobs/{job_id} ───────────────────────────────────────────────────

@router.get(
    "/jobs/{job_id}",
    response_model=QuizJobDetailResponse,
    summary="Poll quiz generation job status",
)
def get_job_status(
    job_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> QuizJobDetailResponse:
    """
    Poll the status of a quiz generation job.

    - `status` is one of: `pending`, `processing`, `completed`, `failed`
    - When `status == "completed"`, `quiz_id` is set — use `GET /quiz/{quiz_id}` to retrieve the quiz.
    - When `status == "failed"`, `error_message` contains the reason.
    """
    job = db.scalar(
        select(QuizJob).where(
            QuizJob.id == job_id,
            QuizJob.user_id == current_user.id,
        )
    )
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )
    return _job_to_response(job)


# ── GET /quiz/struggling-students ────────────────────────────────────────────
# NOTE: must be registered BEFORE /{quiz_id} so the literal path isn't captured
# by the integer path parameter.

@router.get(
    "/struggling-students",
    summary="List students with a low average score across teacher's classes",
)
def get_struggling_students(
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
    threshold: float = Query(50.0, ge=0, le=100, description="Students whose avg score is below this value"),
    class_id: uuid.UUID | None = None,
):
    """
    Return every student in the teacher's classes whose average submitted-quiz
    score is below `threshold` (default 50 %).  Optionally filter to a single
    class.  Results are ordered by avg score ascending (most-struggling first).
    """
    from app.models.user import User
    from app.models.user_profile import UserProfile

    teacher_class_ids = db.scalars(
        select(Class.id).where(Class.teacher_id == current_user.id)
    ).all()

    if not teacher_class_ids:
        return {"items": [], "total": 0, "threshold": threshold}

    if class_id is not None:
        if class_id not in teacher_class_ids:
            raise HTTPException(status_code=403, detail="Class not owned by teacher")
        filter_ids = [class_id]
    else:
        filter_ids = list(teacher_class_ids)

    rows = db.execute(
        select(
            User.id.label("student_id"),
            UserProfile.first_name,
            UserProfile.last_name,
            User.email,
            Class.id.label("class_id"),
            Class.name.label("class_name"),
            func.avg(QuizAttempt.score).label("avg_score"),
            func.count(QuizAttempt.id).label("attempt_count"),
        )
        .join(QuizAttempt, QuizAttempt.student_id == User.id)
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .join(Class, Class.id == Quiz.class_id)
        .outerjoin(UserProfile, UserProfile.user_id == User.id)
        .where(
            QuizAttempt.status == AttemptStatus.submitted,
            QuizAttempt.score.is_not(None),
            Class.id.in_(filter_ids),
        )
        .group_by(
            User.id,
            UserProfile.first_name,
            UserProfile.last_name,
            User.email,
            Class.id,
            Class.name,
        )
        .having(func.avg(QuizAttempt.score) < threshold)
        .order_by(func.avg(QuizAttempt.score).asc())
    ).all()

    items = [
        {
            "student_id": str(row.student_id),
            "first_name": row.first_name,
            "last_name": row.last_name,
            "email": row.email,
            "class_id": str(row.class_id),
            "class_name": row.class_name,
            "avg_score": round(float(row.avg_score), 1),
            "attempt_count": row.attempt_count,
        }
        for row in rows
    ]

    return {"items": items, "total": len(items), "threshold": threshold}


# ── GET /quiz/assigned/{class_id} ─────────────────────────────────────────────
# NOTE: must be registered BEFORE /{quiz_id} so the literal segment "assigned"
# is not swallowed by the integer path parameter.

@router.get(
    "/assigned/{class_id}",
    response_model=list[AssignedQuizItem],
    summary="List quizzes assigned to a class",
)
def list_assigned_quizzes(
    class_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> list[AssignedQuizItem]:
    """
    Return all active quiz assignments for a class.

    - Teachers see this for classes they own.
    - Students see this for classes they are enrolled in.
    """
    # Verify the class exists
    cls = db.scalar(select(Class).where(Class.id == class_id))
    if cls is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")

    # Access control
    is_teacher = current_user.role and current_user.role.name == RoleName.TEACHER
    is_student = current_user.role and current_user.role.name == RoleName.STUDENT

    if is_teacher and str(cls.teacher_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this class.",
        )
    if is_student:
        from app.models.class_student import ClassStudent
        enrolled = db.scalar(
            select(ClassStudent).where(
                ClassStudent.class_id == class_id,
                ClassStudent.student_id == current_user.id,
            )
        )
        if enrolled is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in this class.",
            )

    assignments = db.scalars(
        select(QuizAssignment)
        .where(
            QuizAssignment.class_id == class_id,
            QuizAssignment.status == AssignmentStatus.active,
        )
        .options(
            selectinload(QuizAssignment.quiz).options(
                selectinload(Quiz.questions).selectinload(Question.answers)
            ),
            selectinload(QuizAssignment.assigned_by),
        )
        .order_by(QuizAssignment.assigned_at.desc())
    ).all()

    return [
        AssignedQuizItem(
            assignment_id=a.id,
            assignment_status=a.status,
            assigned_at=a.assigned_at,
            assigned_by=a.assigned_by,
            due_date=a.due_date,
            quiz=QuizResponse.model_validate(a.quiz),
        )
        for a in assignments
    ]


# ── GET /quiz/{quiz_id} ───────────────────────────────────────────────────────

@router.get(
    "/{quiz_id}",
    response_model=QuizResponse,
    summary="Retrieve a generated quiz with all questions and answers",
)
def get_quiz(
    quiz_id: int,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> QuizResponse:
    """
    Return a quiz with its full list of questions and answers.

    Only the user who requested generation (or a teacher) can view the quiz.
    """
    quiz = db.scalar(
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(
            selectinload(Quiz.questions).selectinload(Question.answers)
        )
    )
    if quiz is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found.",
        )

    # Verify the caller owns a job for this quiz
    job = db.scalar(
        select(QuizJob).where(
            QuizJob.quiz_id == quiz_id,
            QuizJob.user_id == current_user.id,
        )
    )
    if job is None:
        # Teachers can also view quizzes for their class documents
        is_teacher = current_user.role and current_user.role.name == RoleName.TEACHER
        if not is_teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this quiz.",
            )

    return QuizResponse.model_validate(quiz)


# ── GET /quiz ─────────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=TeacherQuizListResponse,
    summary="List all quizzes owned by the authenticated teacher",
)
def list_teacher_quizzes(
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
    class_id: uuid.UUID | None = None,
) -> TeacherQuizListResponse:
    """
    Return all quizzes created by the teacher, enriched with:
    - class name
    - question count
    - attempt count
    - average score across all submitted attempts

    Optionally filter by `class_id`.
    """
    from app.models.class_ import Class
    from app.models.question import Question
    from app.models.user_profile import UserProfile

    # Base query: quizzes owned by teacher (via class ownership)
    stmt = (
        select(Quiz)
        .join(Class, Class.id == Quiz.class_id, isouter=True)
        .where(
            (Class.teacher_id == current_user.id) | (Quiz.class_id.is_(None))
        )
    )
    if class_id is not None:
        stmt = stmt.where(Quiz.class_id == class_id)

    quizzes = db.scalars(stmt.order_by(Quiz.created_at.desc())).all()

    items: list[TeacherQuizListItem] = []
    for quiz in quizzes:
        # Class name
        class_name: str | None = None
        if quiz.class_id:
            cls = db.scalar(select(Class).where(Class.id == quiz.class_id))
            class_name = cls.name if cls else None

        # Question count
        q_count = db.scalar(
            select(func.count()).select_from(Question).where(Question.quiz_id == quiz.id)
        ) or 0

        # Attempt stats (submitted only)
        attempt_count = db.scalar(
            select(func.count()).select_from(QuizAttempt).where(
                QuizAttempt.quiz_id == quiz.id,
                QuizAttempt.status == AttemptStatus.submitted,
            )
        ) or 0

        avg_score: float | None = db.scalar(
            select(func.avg(QuizAttempt.score)).where(
                QuizAttempt.quiz_id == quiz.id,
                QuizAttempt.status == AttemptStatus.submitted,
                QuizAttempt.score.is_not(None),
            )
        )

        items.append(
            TeacherQuizListItem(
                id=quiz.id,
                title=quiz.title,
                description=quiz.description,
                status=quiz.status.value if hasattr(quiz.status, "value") else quiz.status,
                difficulty=quiz.difficulty,
                class_id=quiz.class_id,
                class_name=class_name,
                question_count=q_count,
                attempt_count=attempt_count,
                avg_score=round(avg_score, 1) if avg_score is not None else None,
                created_at=quiz.created_at,
            )
        )

    return TeacherQuizListResponse(items=items, total=len(items))


# ── GET /quiz/{quiz_id}/attempts ──────────────────────────────────────────────

@router.get(
    "/{quiz_id}/attempts",
    response_model=QuizAttemptsListResponse,
    summary="List all student attempts for a quiz (teacher only)",
)
def list_quiz_attempts(
    quiz_id: int,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> QuizAttemptsListResponse:
    """
    Return all attempts for a quiz, with student name, score, and status.
    Only the teacher who owns the quiz's class can call this endpoint.
    """
    from app.models.class_ import Class
    from app.models.user import User
    from app.models.user_profile import UserProfile

    quiz = db.scalar(select(Quiz).where(Quiz.id == quiz_id))
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    # Verify teacher owns the quiz's class
    if quiz.class_id is not None:
        cls = db.scalar(select(Class).where(Class.id == quiz.class_id))
        if cls is None or str(cls.teacher_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not own this quiz's class.",
            )

    attempts = db.scalars(
        select(QuizAttempt)
        .where(QuizAttempt.quiz_id == quiz_id)
        .order_by(QuizAttempt.started_at.desc())
    ).all()

    items: list[QuizAttemptItem] = []
    for attempt in attempts:
        student = db.scalar(select(User).where(User.id == attempt.student_id))
        if student is None:
            continue
        profile = db.scalar(
            select(UserProfile).where(UserProfile.user_id == student.id)
        )
        student_name: str | None = None
        if profile:
            full = f"{profile.first_name or ''} {profile.last_name or ''}".strip()
            student_name = full or None

        items.append(
            QuizAttemptItem(
                attempt_id=attempt.id,
                student_id=attempt.student_id,
                student_email=student.email,
                student_name=student_name,
                status=attempt.status.value if hasattr(attempt.status, "value") else attempt.status,
                score=attempt.score,
                started_at=attempt.started_at,
                submitted_at=attempt.submitted_at,
            )
        )

    return QuizAttemptsListResponse(
        quiz_id=quiz_id,
        quiz_title=quiz.title,
        items=items,
        total=len(items),
    )


# ── POST /quiz ────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a quiz manually with questions",
)
def create_quiz(
    body: QuizCreateRequest,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> QuizResponse:
    """
    Create a quiz manually.  Only teachers can call this endpoint.
    All questions and answers are created in a single transaction.
    """
    is_teacher = current_user.role and current_user.role.name == RoleName.TEACHER
    if not is_teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can create quizzes.",
        )

    quiz = Quiz(
        class_id=body.class_id,
        title=body.title,
        description=body.description,
        difficulty=body.difficulty,
        duration_minutes=body.duration_minutes,
        max_attempts=body.max_attempts,
        status=QuizStatus.draft,
    )
    db.add(quiz)
    db.flush()  # obtain quiz.id before inserting children

    for q_data in body.questions:
        question = Question(
            quiz_id=quiz.id,
            type=q_data.type,
            text=q_data.text,
            order=q_data.order,
        )
        db.add(question)
        db.flush()
        for a_data in q_data.answers:
            db.add(Answer(
                question_id=question.id,
                text=a_data.text,
                is_correct=a_data.is_correct,
                order=a_data.order,
            ))

    db.commit()

    quiz = db.scalar(
        select(Quiz)
        .where(Quiz.id == quiz.id)
        .options(selectinload(Quiz.questions).selectinload(Question.answers))
    )
    logger.info("Quiz created manually: id=%d user=%s", quiz.id, current_user.email)
    return QuizResponse.model_validate(quiz)


# ── PATCH /quiz/{quiz_id} ─────────────────────────────────────────────────────

@router.patch(
    "/{quiz_id}",
    response_model=QuizResponse,
    summary="Update quiz metadata or publish/archive it",
)
def update_quiz(
    quiz_id: int,
    body: QuizUpdateRequest,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> QuizResponse:
    """
    Update quiz metadata (title, description, status, difficulty, duration, max_attempts).
    Only teachers can call this endpoint.
    """
    is_teacher = current_user.role and current_user.role.name == RoleName.TEACHER
    if not is_teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can update quizzes.",
        )

    quiz = db.scalar(
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(selectinload(Quiz.questions).selectinload(Question.answers))
    )
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    if body.title is not None:
        quiz.title = body.title
    if body.description is not None:
        quiz.description = body.description
    if body.status is not None:
        quiz.status = QuizStatus(body.status)
    if body.difficulty is not None:
        quiz.difficulty = body.difficulty
    if body.duration_minutes is not None:
        quiz.duration_minutes = body.duration_minutes
    if body.max_attempts is not None:
        quiz.max_attempts = body.max_attempts

    db.commit()
    db.refresh(quiz)

    logger.info("Quiz updated: id=%d status=%s user=%s", quiz.id, quiz.status, current_user.email)
    return QuizResponse.model_validate(quiz)


# ── POST /quiz/{quiz_id}/assign ───────────────────────────────────────────────

@router.post(
    "/{quiz_id}/assign",
    response_model=QuizAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a quiz to a class",
)
def assign_quiz(
    quiz_id: int,
    body: AssignQuizRequest,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> QuizAssignmentResponse:
    """
    Assign a published quiz to a class.

    - Only the teacher who owns the class can assign.
    - The quiz must exist (any status is accepted — teachers may assign drafts for testing,
      but only published quizzes are visible to students via GET /quiz/assigned/{class_id}).
    - Creates Notification rows for every student enrolled in the class.
    """
    # Fetch quiz
    quiz = db.scalar(select(Quiz).where(Quiz.id == quiz_id))
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    # Fetch class and verify ownership
    cls = db.scalar(select(Class).where(Class.id == body.class_id))
    if cls is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")
    if str(cls.teacher_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this class.",
        )

    # Check for duplicate assignment
    existing = db.scalar(
        select(QuizAssignment).where(
            QuizAssignment.quiz_id == quiz_id,
            QuizAssignment.class_id == body.class_id,
        )
    )
    if existing:
        if existing.status == AssignmentStatus.active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This quiz is already assigned to this class.",
            )
        # Re-activate a previously deactivated assignment
        existing.status = AssignmentStatus.active
        existing.due_date = body.due_date
        existing.assigned_by_id = current_user.id
        db.commit()
        db.refresh(existing)
        logger.info(
            "Quiz assignment re-activated: quiz=%d class=%s by=%s",
            quiz_id, body.class_id, current_user.email,
        )
        return QuizAssignmentResponse.model_validate(existing)

    # Create assignment
    assignment = QuizAssignment(
        quiz_id=quiz_id,
        class_id=body.class_id,
        assigned_by_id=current_user.id,
        status=AssignmentStatus.active,
        due_date=body.due_date,
    )
    db.add(assignment)
    db.flush()  # get assignment.id for the response

    # Notify students
    teacher_name = current_user.email
    if hasattr(current_user, "profile") and current_user.profile:
        p = current_user.profile
        teacher_name = f"{p.first_name} {p.last_name}".strip() or teacher_name

    due_str = body.due_date.isoformat() if body.due_date else None
    notify_quiz_assigned(
        db,
        quiz=quiz,
        class_id=body.class_id,
        teacher_name=teacher_name,
        due_date=due_str,
    )

    db.commit()
    db.refresh(assignment)

    logger.info(
        "Quiz assigned: quiz=%d class=%s by=%s notifications_sent",
        quiz_id, body.class_id, current_user.email,
    )
    return QuizAssignmentResponse.model_validate(assignment)


# ── DELETE /quiz/{quiz_id}/unassign ───────────────────────────────────────────

@router.delete(
    "/{quiz_id}/unassign",
    response_model=None,
    summary="Remove a quiz assignment from a class",
)
def unassign_quiz(
    quiz_id: int,
    body: UnassignQuizRequest,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """
    Deactivate the assignment of a quiz from a class (soft-delete: sets status=inactive).

    Only the teacher who owns the class can unassign.
    """
    cls = db.scalar(select(Class).where(Class.id == body.class_id))
    if cls is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")
    if str(cls.teacher_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this class.",
        )

    assignment = db.scalar(
        select(QuizAssignment).where(
            QuizAssignment.quiz_id == quiz_id,
            QuizAssignment.class_id == body.class_id,
            QuizAssignment.status == AssignmentStatus.active,
        )
    )
    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active assignment not found for this quiz/class pair.",
        )

    assignment.status = AssignmentStatus.inactive
    db.commit()

    logger.info(
        "Quiz unassigned: quiz=%d class=%s by=%s",
        quiz_id, body.class_id, current_user.email,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── POST /quiz/{quiz_id}/start ─────────────────────────────────────────────────

@router.post(
    "/{quiz_id}/start",
    response_model=QuizAttemptStartResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a quiz attempt (student)",
)
def start_quiz_attempt(
    quiz_id: int,
    current_user: StudentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> QuizAttemptStartResponse:
    """
    Create a new `QuizAttempt` for the authenticated student.

    - The quiz must be `published`.
    - The student must be enrolled in a class to which the quiz is actively assigned.
    - If the student already has a `started` or `in_progress` attempt, returns **409**
      with the existing `attempt_id` so the client can resume.
    - If `max_attempts` is set and exhausted, returns **409**.
    - Returns `attempt_id`, `started_at`, and optional `expires_at`
      (= `started_at + duration_minutes` when a time limit is configured).
    """
    # ── 1. Fetch quiz ─────────────────────────────────────────────────────────
    quiz = db.scalar(select(Quiz).where(Quiz.id == quiz_id))
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")
    if quiz.status != QuizStatus.published:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This quiz is not published.",
        )

    # ── 2. Verify student is enrolled in an assigned class ────────────────────
    assignment = db.scalar(
        select(QuizAssignment)
        .join(ClassStudent, ClassStudent.class_id == QuizAssignment.class_id)
        .where(
            QuizAssignment.quiz_id == quiz_id,
            QuizAssignment.status == AssignmentStatus.active,
            ClassStudent.student_id == current_user.id,
        )
    )
    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This quiz is not assigned to any class you are enrolled in.",
        )

    # ── 3. Lock: reject if an active attempt already exists ───────────────────
    active_attempt = db.scalar(
        select(QuizAttempt).where(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.student_id == current_user.id,
            QuizAttempt.status.in_([AttemptStatus.started, AttemptStatus.in_progress]),
        )
    )
    if active_attempt is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "You already have an active attempt for this quiz.",
                "attempt_id": active_attempt.id,
            },
        )

    # ── 4. Check max_attempts ─────────────────────────────────────────────────
    if quiz.max_attempts is not None:
        attempt_count = db.scalar(
            select(func.count()).select_from(QuizAttempt).where(
                QuizAttempt.quiz_id == quiz_id,
                QuizAttempt.student_id == current_user.id,
            )
        )
        if attempt_count >= quiz.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Maximum number of attempts ({quiz.max_attempts}) reached.",
            )

    # ── 5. Create attempt ─────────────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        student_id=current_user.id,
        status=AttemptStatus.started,
        started_at=now,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    expires_at = (
        now + timedelta(minutes=quiz.duration_minutes)
        if quiz.duration_minutes is not None
        else None
    )

    logger.info(
        "Quiz attempt started: quiz=%d attempt=%d student=%s",
        quiz_id, attempt.id, current_user.email,
    )

    return QuizAttemptStartResponse(
        attempt_id=attempt.id,
        quiz_id=quiz_id,
        status=attempt.status,
        started_at=attempt.started_at,
        expires_at=expires_at,
    )


# ── POST /quiz/{attempt_id}/submit ─────────────────────────────────────────────

@router.post(
    "/{attempt_id}/submit",
    response_model=QuizAttemptSubmitResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit a quiz attempt (student)",
)
def submit_quiz_attempt(
    attempt_id: int,
    body: QuizSubmitRequest,
    current_user: StudentUser,
    db: Annotated[DBSession, Depends(get_db)],
    _: Annotated[None, Depends(_rate_limit_quiz_submit)],
) -> QuizAttemptSubmitResponse:
    """
    Submit a quiz attempt with all student answers.

    - The attempt must belong to the authenticated student.
    - Cannot resubmit an already-submitted attempt (returns **409**).
    - If the quiz has a `duration_minutes` limit and the attempt has expired,
      the submission is still accepted but flagged in the log.
    - Each answer is upserted: safe to call after partial saves.
    - Dispatches a background Celery task to auto-correct MCQ/TrueFalse answers
      and send an in-app notification with results.
    """
    # ── 1. Load and validate the attempt ──────────────────────────────────────
    attempt = db.scalar(
        select(QuizAttempt).where(QuizAttempt.id == attempt_id)
    )
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.")

    if str(attempt.student_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This attempt does not belong to you.",
        )

    if attempt.status == AttemptStatus.submitted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "This attempt has already been submitted.",
                "attempt_id": attempt_id,
                "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            },
        )

    # ── 2. Warn if submission is past the time limit ───────────────────────────
    quiz = db.scalar(select(Quiz).where(Quiz.id == attempt.quiz_id))
    if quiz and quiz.duration_minutes is not None:
        deadline = attempt.started_at + timedelta(minutes=quiz.duration_minutes)
        now_utc = datetime.now(timezone.utc)
        if now_utc > deadline:
            logger.warning(
                "Late submission: attempt=%d student=%s exceeded timer by %.0fs",
                attempt_id,
                current_user.email,
                (now_utc - deadline).total_seconds(),
            )

    # ── 3. Upsert student answers ──────────────────────────────────────────────
    total_questions = db.scalar(
        select(func.count()).select_from(Question).where(Question.quiz_id == attempt.quiz_id)
    ) or 0

    for ans_data in body.answers:
        existing = db.scalar(
            select(StudentAnswer).where(
                StudentAnswer.attempt_id == attempt_id,
                StudentAnswer.question_id == ans_data.question_id,
            )
        )
        if existing:
            existing.answer_text = ans_data.answer_text
            existing.is_correct = None  # reset until correction runs
        else:
            db.add(
                StudentAnswer(
                    attempt_id=attempt_id,
                    question_id=ans_data.question_id,
                    answer_text=ans_data.answer_text,
                    is_correct=None,
                )
            )

    # ── 4. Mark as submitted ───────────────────────────────────────────────────
    submitted_at = datetime.now(timezone.utc)
    attempt.status = AttemptStatus.submitted
    attempt.submitted_at = submitted_at
    db.commit()

    answers_recorded = db.scalar(
        select(func.count()).select_from(StudentAnswer).where(
            StudentAnswer.attempt_id == attempt_id
        )
    ) or 0

    # ── 5. Dispatch correction task ────────────────────────────────────────────
    from app.services.quiz_service import correct_quiz_attempt_task

    correct_quiz_attempt_task.delay(
        attempt_id=attempt_id,
        db_url=settings.DATABASE_URL,
    )

    logger.info(
        "Quiz attempt submitted: attempt=%d quiz=%d student=%s answers=%d",
        attempt_id, attempt.quiz_id, current_user.email, answers_recorded,
    )

    return QuizAttemptSubmitResponse(
        attempt_id=attempt_id,
        quiz_id=attempt.quiz_id,
        status=attempt.status,
        submitted_at=submitted_at,
        total_questions=total_questions,
        answers_recorded=answers_recorded,
    )


# ── POST /quiz/{attempt_id}/generate-feedback ──────────────────────────────────

@router.post(
    "/{attempt_id}/generate-feedback",
    response_model=dict,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate LLM feedback for all questions in an attempt",
)
def generate_feedback(
    attempt_id: int,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> dict:
    """
    Enqueue a background task to generate personalized per-question feedback.

    - The attempt must belong to the authenticated student, OR the caller
      must be the teacher of the quiz's class.
    - Feedback is stored in `question_feedbacks` and accessible via the
      results endpoint.
    - Returns immediately with 202; poll `GET /quiz/{attempt_id}/results`
      and check `feedback_generated`.
    """
    attempt = db.scalar(select(QuizAttempt).where(QuizAttempt.id == attempt_id))
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.")

    # Allow: attempt's own student, or teacher of the class
    is_own = str(attempt.student_id) == str(current_user.id)
    is_teacher = current_user.role and current_user.role.name == RoleName.TEACHER
    if not (is_own or is_teacher):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if attempt.status != AttemptStatus.submitted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Feedback can only be generated for submitted attempts.",
        )

    from app.services.grading_service import generate_feedback_task

    generate_feedback_task.delay(
        attempt_id=attempt_id,
        db_url=settings.DATABASE_URL,
    )

    logger.info(
        "generate_feedback dispatched: attempt=%d by=%s",
        attempt_id, current_user.email,
    )
    return {"message": "Feedback generation queued.", "attempt_id": attempt_id}


# ── PATCH /quiz/{attempt_id}/short-answers/{answer_id}/review ─────────────────

@router.patch(
    "/{attempt_id}/short-answers/{answer_id}/review",
    response_model=ShortAnswerGradeResponse,
    status_code=status.HTTP_200_OK,
    summary="Teacher review: override LLM score for a short answer",
)
def review_short_answer(
    attempt_id: int,
    answer_id: int,
    body: TeacherReviewRequest,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> ShortAnswerGradeResponse:
    """
    Teacher override for a short-answer LLM grade.

    - Sets `teacher_score` on the `ShortAnswerGrade` row.
    - Updates `StudentAnswer.llm_score` and clears `needs_review`.
    - Recalculates `QuizAttempt.score` if all short answers are now reviewed.
    """
    from app.models.short_answer_grade import ShortAnswerGrade
    from app.models.question import Question, QuestionType

    grade = db.scalar(
        select(ShortAnswerGrade).where(
            ShortAnswerGrade.student_answer_id == answer_id,
            ShortAnswerGrade.attempt_id == attempt_id,
        )
    )
    if grade is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grade record not found for this answer.",
        )

    # Apply teacher override
    grade.teacher_score = body.teacher_score
    grade.teacher_note = body.teacher_note
    grade.reviewed_at = datetime.now(timezone.utc)
    grade.reviewed_by_id = current_user.id
    grade.needs_review = False

    # Update the StudentAnswer with the teacher's score
    student_answer = db.scalar(
        select(StudentAnswer).where(StudentAnswer.id == answer_id)
    )
    if student_answer:
        student_answer.llm_score = body.teacher_score
        student_answer.needs_review = False
        student_answer.is_correct = body.teacher_score >= 50.0

    db.flush()

    # Recalculate attempt score if no more pending reviews
    attempt = db.scalar(select(QuizAttempt).where(QuizAttempt.id == attempt_id))
    if attempt:
        questions = db.scalars(
            select(Question).where(Question.quiz_id == attempt.quiz_id)
        ).all()
        all_student_answers = db.scalars(
            select(StudentAnswer).where(StudentAnswer.attempt_id == attempt_id)
        ).all()

        q_map = {q.id: q for q in questions}
        total_possible = sum(q.points for q in questions) or len(questions)
        earned = 0.0
        all_reviewed = True

        for sa in all_student_answers:
            q = q_map.get(sa.question_id)
            if q is None:
                continue
            if q.type in (QuestionType.mcq, QuestionType.true_false):
                if sa.is_correct:
                    earned += q.points
            elif q.type == QuestionType.short_answer:
                if sa.needs_review:
                    all_reviewed = False
                elif sa.llm_score is not None:
                    earned += q.points * sa.llm_score / 100.0

        if all_reviewed:
            attempt.score = round(earned / total_possible * 100, 2)
            logger.info(
                "Review updated attempt %d score → %.2f%%", attempt_id, attempt.score
            )

    db.commit()

    return ShortAnswerGradeResponse.model_validate(grade)


# ── GET /quiz/{attempt_id}/results ─────────────────────────────────────────────

@router.get(
    "/{attempt_id}/results",
    response_model=AttemptResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Get detailed results for a quiz attempt",
)
def get_attempt_results(
    attempt_id: int,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> AttemptResultResponse:
    """
    Full results for a submitted quiz attempt.

    Returns:
    - Score, duration, class average
    - Per-question: student answer, correct answer, is_correct, feedback
    - LLM grading details for ShortAnswer questions
    - Cost summary (total tokens used across all LLM calls for this attempt)

    Access: attempt's own student, or the teacher of the class.
    """
    from app.models.answer import Answer
    from app.models.question import Question, QuestionType
    from app.models.question_feedback import QuestionFeedback
    from app.models.short_answer_grade import ShortAnswerGrade

    attempt = db.scalar(select(QuizAttempt).where(QuizAttempt.id == attempt_id))
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.")

    is_own = str(attempt.student_id) == str(current_user.id)
    is_teacher = current_user.role and current_user.role.name == RoleName.TEACHER
    if not (is_own or is_teacher):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    quiz = db.scalar(select(Quiz).where(Quiz.id == attempt.quiz_id))
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    questions = db.scalars(
        select(Question).where(Question.quiz_id == attempt.quiz_id)
    ).all()

    # Build lookup maps
    student_answers: dict[int, StudentAnswer] = {
        sa.question_id: sa
        for sa in db.scalars(
            select(StudentAnswer).where(StudentAnswer.attempt_id == attempt_id)
        ).all()
    }

    feedbacks: dict[int, QuestionFeedback] = {
        fb.question_id: fb
        for fb in db.scalars(
            select(QuestionFeedback).where(QuestionFeedback.attempt_id == attempt_id)
        ).all()
    }

    sa_grades: dict[int, ShortAnswerGrade] = {
        sag.question_id: sag
        for sag in db.scalars(
            select(ShortAnswerGrade).where(ShortAnswerGrade.attempt_id == attempt_id)
        ).all()
    }

    # Correct answer text lookup
    correct_answers: dict[int, str] = {}
    for q in questions:
        ans = db.scalar(
            select(Answer).where(
                Answer.question_id == q.id,
                Answer.is_correct.is_(True),
            )
        )
        if ans:
            correct_answers[q.id] = ans.text.strip()

    # Class average
    class_avg_result = db.execute(
        select(func.avg(QuizAttempt.score)).where(
            QuizAttempt.quiz_id == attempt.quiz_id,
            QuizAttempt.status == AttemptStatus.submitted,
            QuizAttempt.score.isnot(None),
        )
    ).scalar()
    class_average = round(float(class_avg_result), 2) if class_avg_result is not None else None

    # Duration
    duration_seconds: int | None = None
    if attempt.submitted_at and attempt.started_at:
        duration_seconds = int(
            (attempt.submitted_at - attempt.started_at).total_seconds()
        )

    # Build per-question results
    auto_graded = 0
    pending_review = 0
    total_tokens = 0
    question_results: list[QuestionResult] = []

    for q in questions:
        sa = student_answers.get(q.id)
        fb = feedbacks.get(q.id)
        sag = sa_grades.get(q.id)

        # Score for this question (0-100)
        q_score: float | None = None
        if sa:
            if q.type in (QuestionType.mcq, QuestionType.true_false):
                q_score = 100.0 if sa.is_correct else (0.0 if sa.is_correct is False else None)
            elif q.type == QuestionType.short_answer:
                # Use teacher score if available, else LLM score
                effective_score = (sag.teacher_score if sag and sag.teacher_score is not None else None) or sa.llm_score
                q_score = effective_score

        if sa and (sa.is_correct is not None or sa.llm_score is not None):
            auto_graded += 1
        if sa and sa.needs_review:
            pending_review += 1

        if sag:
            total_tokens += sag.total_tokens
        if fb:
            total_tokens += fb.total_tokens

        question_results.append(
            QuestionResult(
                question_id=q.id,
                question_text=q.text,
                question_type=q.type.value,
                points=q.points,
                student_answer=sa.answer_text if sa else None,
                correct_answer=correct_answers.get(q.id),
                is_correct=sa.is_correct if sa else None,
                score=q_score,
                needs_review=sa.needs_review if sa else False,
                feedback_text=fb.feedback_text if fb else None,
                key_points=fb.key_points if fb else [],
                improvement_suggestion=fb.improvement_suggestion if fb else None,
                llm_reasoning=sag.llm_reasoning if sag else None,
                bleu_score=sag.bleu_score if sag else None,
                rouge_l_score=sag.rouge_l_score if sag else None,
                teacher_score=sag.teacher_score if sag else None,
            )
        )

    feedback_generated = len(feedbacks) > 0

    return AttemptResultResponse(
        attempt_id=attempt_id,
        quiz_id=attempt.quiz_id,
        quiz_title=quiz.title,
        quiz_difficulty=quiz.difficulty,
        status=attempt.status.value,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        duration_seconds=duration_seconds,
        score=attempt.score,
        class_average=class_average,
        total_questions=len(questions),
        auto_graded=auto_graded,
        pending_review=pending_review,
        feedback_generated=feedback_generated,
        questions=question_results,
        total_tokens_used=total_tokens,
    )


# ── GET /quiz/{attempt_id}/results/pdf ────────────────────────────────────────

@router.get(
    "/{attempt_id}/results/pdf",
    status_code=status.HTTP_200_OK,
    summary="Export attempt results as PDF",
)
def export_results_pdf(
    attempt_id: int,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> Response:
    """
    Generate a PDF report for a quiz attempt and stream it as a download.

    Uses weasyprint (HTML→PDF). If weasyprint is not installed, returns
    a plain-text fallback with instructions.

    Access: same as GET /quiz/{attempt_id}/results.
    """
    # Re-use the results logic
    results = get_attempt_results(attempt_id, current_user, db)

    # Build HTML
    score_str = f"{results.score:.1f}%" if results.score is not None else "En attente"
    avg_str = f"{results.class_average:.1f}%" if results.class_average is not None else "N/A"
    duration_str = (
        f"{results.duration_seconds // 60}m {results.duration_seconds % 60}s"
        if results.duration_seconds else "N/A"
    )

    q_rows = ""
    for i, q in enumerate(results.questions, start=1):
        status_badge = (
            '<span style="color:green">✓ Correct</span>' if q.is_correct is True
            else '<span style="color:red">✗ Incorrect</span>' if q.is_correct is False
            else '<span style="color:orange">En attente</span>'
        )
        score_cell = f"{q.score:.0f}/100" if q.score is not None else "—"
        feedback_cell = q.feedback_text or "—"
        q_rows += f"""
        <tr>
          <td>{i}. {q.question_text}</td>
          <td>{q.student_answer or '(sans réponse)'}</td>
          <td>{q.correct_answer or '—'}</td>
          <td>{status_badge}</td>
          <td>{score_cell}</td>
          <td>{feedback_cell}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: Arial, sans-serif; font-size: 12px; margin: 30px; }}
    h1 {{ font-size: 20px; }}
    .meta {{ color: #555; margin-bottom: 20px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
    th {{ background: #2563eb; color: white; padding: 8px; text-align: left; }}
    td {{ padding: 6px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }}
    tr:nth-child(even) {{ background: #f9fafb; }}
    .summary {{ display: flex; gap: 40px; margin: 20px 0; }}
    .stat {{ text-align: center; }}
    .stat-value {{ font-size: 24px; font-weight: bold; color: #2563eb; }}
    @media print {{ button {{ display: none; }} }}
  </style>
</head>
<body>
  <h1>Résultats : {results.quiz_title}</h1>
  <div class="meta">
    Difficulté : {results.quiz_difficulty or 'N/A'} &nbsp;|&nbsp;
    Soumis le : {results.submitted_at.strftime('%d/%m/%Y %H:%M') if results.submitted_at else 'N/A'} &nbsp;|&nbsp;
    Durée : {duration_str}
  </div>
  <div class="summary">
    <div class="stat"><div class="stat-value">{score_str}</div><div>Votre score</div></div>
    <div class="stat"><div class="stat-value">{avg_str}</div><div>Moyenne classe</div></div>
    <div class="stat"><div class="stat-value">{results.auto_graded}/{results.total_questions}</div><div>Questions corrigées</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Question</th><th>Votre réponse</th><th>Réponse attendue</th>
        <th>Résultat</th><th>Score</th><th>Feedback</th>
      </tr>
    </thead>
    <tbody>{q_rows}</tbody>
  </table>
</body>
</html>"""

    try:
        import weasyprint
        pdf_bytes = weasyprint.HTML(string=html).write_pdf()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="results_attempt_{attempt_id}.pdf"'
            },
        )
    except ImportError:
        logger.warning("weasyprint not installed — returning HTML fallback for PDF export")
        return Response(
            content=html,
            media_type="text/html",
            headers={
                "Content-Disposition": f'inline; filename="results_attempt_{attempt_id}.html"'
            },
        )


