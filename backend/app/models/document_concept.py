from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.document import Document


class ConceptSource(str, enum.Enum):
    ner = "ner"
    textrank = "textrank"
    tfidf = "tfidf"


class DocumentConcept(Base):
    __tablename__ = "document_concepts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    term: Mapped[str] = mapped_column(String(255), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    source: Mapped[ConceptSource] = mapped_column(Enum(ConceptSource), nullable=False)
    # NER entity label (PERSON, ORG, GPE, PRODUCT, …) or None for keyword sources
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Semantic grouping label used by quiz generation
    theme: Mapped[str | None] = mapped_column(String(100), nullable=True)
    frequency: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="concepts")
