"""
routes/quiz.py

Quiz generation endpoints:
  POST  /quiz/generate            – start async quiz generation job
  GET   /quiz/jobs/{job_id}       – poll job status
  GET   /quiz/{quiz_id}           – retrieve generated quiz with questions+answers
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession, selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.core.logging import logger
from app.models.document import Document, StatusEnum
from app.models.question import Question
from app.models.quiz import Quiz
from app.models.quiz_job import JobStatus, QuizJob
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizJobDetailResponse,
    QuizJobResponse,
    QuizResponse,
)

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
