"""
routes/personal.py
Personal document endpoints.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.core.logging import logger
from app.core.rate_limit import RateLimiter
from app.models.document import RoleEnum
from app.models.document import Document
from app.schemas.document import DocumentUploadResponse, DocumentListResponse, DocumentResponse
from app.services.document_service import upload_personal_document, list_personal_documents, soft_delete_document

router = APIRouter(prefix="/documents", tags=["Personal Documents"])

_rate_limit_upload = RateLimiter("doc_upload", max_requests=10, window_seconds=300)


@router.post("/personal", response_model=DocumentUploadResponse, status_code=201)
async def create_personal_document(
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
    file: UploadFile = File(..., description="PDF, DOCX, TXT or MD file (max 50 MB)"),
    _: Annotated[None, Depends(_rate_limit_upload)] = None,
):
    """Upload a personal document. Stored locally and parsed in the background."""
    logger.info("Personal document upload by user=%s", current_user.email)

    uploaded_by_role = (
        RoleEnum.teacher if current_user.role and current_user.role.name.value == "TEACHER"
        else RoleEnum.student
    )

    doc = upload_personal_document(
        file=file,
        uploaded_by_id=str(current_user.id),
        uploaded_by_role=uploaded_by_role,
        background_tasks=background_tasks,
        db=db,
    )
    return DocumentUploadResponse(
        document_id=doc.id,
        status=doc.status,
        filename=doc.filename,
        file_type=doc.file_type,
        message="File uploaded. Text extraction running in background.",
    )


@router.get("/personal", response_model=DocumentListResponse)
def get_personal_documents(
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """List the caller's personal documents."""
    docs = list_personal_documents(uploaded_by_id=str(current_user.id), db=db)
    return DocumentListResponse(documents=docs, total=len(docs))


@router.get("/{document_id}/status")
def get_document_status(
    document_id: int,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """Poll processing status for a document. Returns status and chunk count."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if str(doc.uploaded_by_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    chunk_count = len(doc.chunks) if doc.chunks else 0
    return {"document_id": doc.id, "status": doc.status, "chunk_count": chunk_count, "filename": doc.filename}


@router.delete("/{document_id}", status_code=204, response_class=Response)
def delete_document(
    document_id: int,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """Soft-delete a document. Only the uploader can delete their own document."""
    soft_delete_document(document_id=document_id, requesting_user_id=str(current_user.id), db=db)
