from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.user import User


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    front: Mapped[str] = mapped_column(Text, nullable=False)
    back: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    document: Mapped["Document"] = relationship(foreign_keys=[document_id])
    progress: Mapped[list["FlashcardProgress"]] = relationship(
        back_populates="flashcard",
        cascade="all, delete-orphan",
    )


class FlashcardProgress(Base):
    """Per-user spaced repetition state for a flashcard (SM-2 algorithm)."""

    __tablename__ = "flashcard_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    flashcard_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("flashcards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ease_factor: Mapped[float] = mapped_column(Float, nullable=False, default=2.5)
    interval_days: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    repetitions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    next_review_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    flashcard: Mapped["Flashcard"] = relationship(back_populates="progress")
    user: Mapped["User"] = relationship(foreign_keys=[user_id])
