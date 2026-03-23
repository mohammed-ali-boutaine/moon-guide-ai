from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.question import Question
    from app.models.quiz_attempt import QuizAttempt


class QuestionFeedback(Base):
    """
    LLM-generated per-question feedback for a quiz attempt.

    One row per (attempt_id, question_id) — covers all question types
    (MCQ, TrueFalse, ShortAnswer).

    Populated by generate_feedback_task after grading is complete.
    """

    __tablename__ = "question_feedbacks"
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_feedback_attempt_question"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
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

    # Narrative feedback (1-3 sentences)
    feedback_text: Mapped[str] = mapped_column(Text, nullable=False)
    # List of key points the student should remember
    key_points: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # Actionable improvement suggestion (nullable for perfect answers)
    improvement_suggestion: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Mirrored correctness/score for easy access without joining other tables
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Cost monitoring
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    attempt: Mapped["QuizAttempt"] = relationship(foreign_keys=[attempt_id])
    question: Mapped["Question"] = relationship(foreign_keys=[question_id])
