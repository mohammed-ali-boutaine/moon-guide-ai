from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.document import FileTypeEnum, StatusEnum, RoleEnum, ScopeEnum


# ── Request Schemas

class DocumentUploadMeta(BaseModel):
    """Extra metadata optionally sent alongside the file (as form fields)."""
    uploaded_by_id: str
    uploaded_by_role: RoleEnum


class DocumentApproveRequest(BaseModel):
    pass  # no body required


class DocumentRejectRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class SemanticSearchRequest(BaseModel):
    """Request body for semantic search."""
    query: str = Field(..., min_length=1, max_length=2000, description="Natural language search query")
    limit: int = Field(5, ge=1, le=50, description="Maximum number of results")
    score_threshold: float = Field(0.3, ge=0.0, le=1.0, description="Minimum similarity score")
    document_id: Optional[int] = Field(None, description="Restrict search to a specific document")


# ── Response Schemas 

class DocumentResponse(BaseModel):
    id: int
    scope: ScopeEnum
    class_id: Optional[str] = None
    filename: str
    file_url: str
    file_type: FileTypeEnum
    status: StatusEnum
    uploaded_by_id: str
    uploaded_by_role: RoleEnum
    approved_by_id: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    rejection_reason: Optional[str] = None
    file_size_bytes: Optional[int] = None

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


class DocumentChunkResponse(BaseModel):
    id: int
    document_id: int
    chunk_index: int
    chunk_text: str
    token_count: Optional[int] = None
    embedded: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SemanticSearchResult(BaseModel):
    """Single search result."""
    id: str
    score: float
    chunk_text: str
    document_id: Optional[int] = None
    class_id: Optional[str] = None
    chunk_index: Optional[int] = None
    metadata: Optional[str] = None


class SemanticSearchResponse(BaseModel):
    """Response for semantic search."""
    query: str
    results: list[SemanticSearchResult]
    total: int
    collection: str


class CollectionInfoResponse(BaseModel):
    """Qdrant collection info."""
    name: str
    vectors_count: Optional[int] = None
    points_count: Optional[int] = None
    status: str