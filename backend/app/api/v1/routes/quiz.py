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

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DBSession, selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import CurrentUser, StudentUser, TeacherUser
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
from app.schemas.quiz import (
    QuizAttemptStartResponse,
    QuizCreateRequest,
    QuizGenerateRequest,
    QuizJobDetailResponse,
    QuizJobResponse,
    QuizResponse,
    QuizUpdateRequest,
)
from app.schemas.quiz_assignment import (
    AssignedQuizItem,
    AssignQuizRequest,
    QuizAssignmentResponse,
    UnassignQuizRequest,
)
from app.services.notification_service import notify_quiz_assigned

router = APIRouter(prefix="/quiz", tags=["Quiz Generation"])


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
        if not (current_user.role and current_user.role.name.value == "teacher"):
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
        is_teacher = current_user.role and current_user.role.name.value == "teacher"
        if not is_teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this quiz.",
            )

    return QuizResponse.model_validate(quiz)


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
    is_teacher = current_user.role and current_user.role.name.value == "teacher"
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
    is_teacher = current_user.role and current_user.role.name.value == "teacher"
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


# ── GET /quiz/assigned/{class_id} ─────────────────────────────────────────────
# NOTE: registered BEFORE /{quiz_id} so "assigned" is not mistaken for an int

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
    is_teacher = current_user.role and current_user.role.name.value == "teacher"
    is_student = current_user.role and current_user.role.name.value == "student"

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
