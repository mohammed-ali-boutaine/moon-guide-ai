from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
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


class SearchRequest(BaseModel):
    """Request body for general semantic search with query expansion."""
    query: str = Field(..., min_length=1, max_length=2000, description="Natural language search query")
    class_id: Optional[str] = Field(None, description="Filter by class ID")
    document_id: Optional[int] = Field(None, description="Restrict search to a specific document")
    limit: int = Field(5, ge=1, le=50, description="Maximum number of results (default 5, top-5 chunks)")
    score_threshold: float = Field(0.3, ge=0.0, le=1.0, description="Minimum similarity score (default 0.3)")
    expand_query: bool = Field(True, description="Enable query expansion for better results")
    page: int = Field(1, ge=1, description="Page number for pagination")
    page_size: int = Field(5, ge=1, le=50, description="Items per page")


# ── Response Schemas 

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
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
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    document_id: int
    chunk_index: int
    chunk_text: str
    token_count: Optional[int] = None
    embedded: bool
    created_at: datetime


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


class SearchResultDocumentInfo(BaseModel):
    """Original document info for search results."""
    id: int
    filename: str
    file_type: FileTypeEnum
    status: StatusEnum
    class_id: Optional[str] = None


class SearchResult(BaseModel):
    """Single search result with chunk and original document info."""
    id: str
    score: float
    chunk_text: str
    chunk_index: Optional[int] = None
    metadata: Optional[str] = None
    document: SearchResultDocumentInfo


class SearchResponse(BaseModel):
    """Response for general semantic search with pagination and original document info."""
    query: str
    expanded_query: Optional[str] = None
    results: list[SearchResult]
    total: int
    page: int
    page_size: int
    total_pages: int
    collection: Optional[str] = None


class CollectionInfoResponse(BaseModel):
    """Qdrant collection info."""
    name: str
    vectors_count: Optional[int] = None
    points_count: Optional[int] = None
    status: str