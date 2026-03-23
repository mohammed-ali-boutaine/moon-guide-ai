from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.question import Question
    from app.models.quiz_attempt import QuizAttempt
    from app.models.student_answer import StudentAnswer
    from app.models.user import User


class ShortAnswerGrade(Base):
    """
    Stores the full LLM grading audit trail for a single ShortAnswer student answer.

    One row per StudentAnswer (unique constraint on student_answer_id).
    Teacher override fields (teacher_score, teacher_note, reviewed_*) are
    populated when a teacher manually reviews and corrects the LLM score.
    """

    __tablename__ = "short_answer_grades"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_answer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("student_answers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    attempt_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("quiz_attempts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Cached model answer at grading time (for audit)
    expected_answer: Mapped[str] = mapped_column(Text, nullable=False)

    # LLM-assigned score and explanation
    llm_score: Mapped[float] = mapped_column(Float, nullable=False)
    llm_reasoning: Mapped[str] = mapped_column(Text, nullable=False)

    # Similarity metrics (optional — None if computation failed)
    bleu_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    rouge_l_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Human review
    needs_review: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    teacher_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    teacher_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Cost monitoring
    model_used: Mapped[str] = mapped_column(String(64), nullable=False)
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    student_answer: Mapped["StudentAnswer"] = relationship(
        foreign_keys=[student_answer_id]
    )
    attempt: Mapped["QuizAttempt"] = relationship(foreign_keys=[attempt_id])
    question: Mapped["Question"] = relationship(foreign_keys=[question_id])
    reviewed_by: Mapped["User | None"] = relationship(foreign_keys=[reviewed_by_id])
