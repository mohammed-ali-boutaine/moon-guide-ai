from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.class_ import Class
    from app.models.document import Document
    from app.models.question import Question
    from app.models.quiz_assignment import QuizAssignment
    from app.models.quiz_attempt import QuizAttempt


class QuizStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    class_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("classes.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    document_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String(10), nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_attempts: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[QuizStatus] = mapped_column(
        Enum(QuizStatus), nullable=False, default=QuizStatus.draft
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    class_: Mapped["Class | None"] = relationship(back_populates="quizzes")
    document: Mapped["Document | None"] = relationship(foreign_keys=[document_id])
    questions: Mapped[list["Question"]] = relationship(
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="Question.order",
    )
    assignments: Mapped[list["QuizAssignment"]] = relationship(
        back_populates="quiz",
        cascade="all, delete-orphan",
    )
    attempts: Mapped[list["QuizAttempt"]] = relationship(
        back_populates="quiz",
        cascade="all, delete-orphan",
    )
