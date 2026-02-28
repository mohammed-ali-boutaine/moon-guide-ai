from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.document import FileTypeEnum, StatusEnum, RoleEnum, ScopeEnum


# ── Request Schemas

class DocumentUploadMeta(BaseModel):
    """Extra metadata optionally sent alongside the file (as form fields)."""
    uploaded_by_id: int
    uploaded_by_role: RoleEnum


class DocumentApproveRequest(BaseModel):
    pass  # no body required


class DocumentRejectRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


# ── Response Schemas 

class DocumentResponse(BaseModel):
    id: int
    scope: ScopeEnum
    class_id: Optional[int]
    filename: str
    file_url: str
    file_type: FileTypeEnum
    status: StatusEnum
    uploaded_by_id: int
    uploaded_by_role: RoleEnum
    approved_by_id: Optional[int]
    approved_at: Optional[datetime]
    created_at: datetime
    rejection_reason: Optional[str]

    class Config:
        from_attributes = True


class DocumentUploadResponse(BaseModel):
    document_id: int
    status: StatusEnum
    filename: str
    file_type: FileTypeEnum
    message: str


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int