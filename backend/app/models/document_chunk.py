"""
models/document_chunk.py

Stores extracted text chunks from documents.
Each chunk's embedding is stored in Qdrant (vector DB), while the raw text
and metadata live here in Postgres for retrieval and reference.
"""
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship

from app.core.database import Base


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False, default=0)
    chunk_text = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=True)
    metadata_json = Column(Text, nullable=True)  # JSON string with source, page, etc.
    qdrant_point_id = Column(String(64), nullable=True)  # UUID of the vector in Qdrant
    embedded = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("Document", back_populates="chunks")