import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Column, Integer, String, Enum, DateTime, Text, ForeignKey, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class ScopeEnum(str, enum.Enum):
    personal = "personal"
    cls = "class"


class FileTypeEnum(str, enum.Enum):
    pdf = "pdf"
    docx = "docx"
    txt = "txt"
    md = "md"


class StatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    processing = "processing"
    ready = "ready"
    rejected = "rejected"


class RoleEnum(str, enum.Enum):
    student = "student"
    teacher = "teacher"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    scope = Column(Enum(ScopeEnum), nullable=False)
    class_id = Column(Uuid(as_uuid=True), ForeignKey("classes.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    file_url = Column(String(512), nullable=False)
    file_type = Column(Enum(FileTypeEnum), nullable=False)
    status = Column(Enum(StatusEnum), nullable=False, default=StatusEnum.pending)
    uploaded_by_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_by_role = Column(Enum(RoleEnum), nullable=False)
    approved_by_id = Column(Uuid(as_uuid=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    rejection_reason = Column(Text, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")