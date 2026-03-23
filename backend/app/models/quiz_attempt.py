from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.quiz import Quiz
    from app.models.student_answer import StudentAnswer
    from app.models.user import User


class AttemptStatus(str, enum.Enum):
    started = "started"
    in_progress = "in_progress"
    submitted = "submitted"


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    __table_args__ = (
        UniqueConstraint("quiz_id", "student_id", "started_at", name="uq_quiz_attempt_student"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quiz_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, name="attemptstatus"),
        nullable=False,
        default=AttemptStatus.started,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    # Nullable until correction is done
    score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationships
    quiz: Mapped["Quiz"] = relationship(back_populates="attempts")
    student: Mapped["User"] = relationship(foreign_keys=[student_id])
    answers: Mapped[list["StudentAnswer"]] = relationship(
        back_populates="attempt",
        cascade="all, delete-orphan",
    )
