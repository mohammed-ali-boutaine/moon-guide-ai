from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.question import Question
    from app.models.quiz_attempt import QuizAttempt


class StudentAnswer(Base):
    __tablename__ = "student_answers"
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_student_answer_attempt_question"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
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
    # Free-text for ShortAnswer; answer text or answer ID for MCQ/TrueFalse
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Nullable before correction (e.g. ShortAnswer graded manually)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Relationships
    attempt: Mapped["QuizAttempt"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship(foreign_keys=[question_id])
