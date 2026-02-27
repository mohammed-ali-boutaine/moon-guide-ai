import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Enum, DateTime, Text, ForeignKey
from sqlalchemy.orm import declarative_base

Base = declarative_base()


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

    id = Column(Integer, primary_key=True, index=True)
    scope = Column(Enum(ScopeEnum), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    file_url = Column(String(512), nullable=False)
    file_type = Column(Enum(FileTypeEnum), nullable=False)
    status = Column(Enum(StatusEnum), nullable=False, default=StatusEnum.pending)
    uploaded_by_id = Column(Integer, nullable=False)
    uploaded_by_role = Column(Enum(RoleEnum), nullable=False)
    approved_by_id = Column(Integer, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    rejection_reason = Column(Text, nullable=True)