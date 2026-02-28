"""
routes/personal.py
Personal document endpoints.
"""
from fastapi import APIRouter, Depends, BackgroundTasks, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from models.document import RoleEnum
from schemas.document import DocumentUploadResponse, DocumentListResponse, DocumentResponse
from services import upload_personal_document, list_personal_documents, soft_delete_document

router = APIRouter(prefix="/documents", tags=["Personal Documents"])

@router.post("/personal", response_model=DocumentUploadResponse, status_code=201)
async def create_personal_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF, DOCX, TXT or MD file (max 50 MB)"),
    uploaded_by_id: int = Form(...),
    uploaded_by_role: RoleEnum = Form(...),
    db: Session = Depends(get_db),
):
    """Upload a personal document. Stored locally and parsed in the background."""
    doc = upload_personal_document(
        file=file,
        uploaded_by_id=uploaded_by_id,
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
    uploaded_by_id: int,
    db: Session = Depends(get_db),
):
    """List the caller's personal documents."""
    docs = list_personal_documents(uploaded_by_id=uploaded_by_id, db=db)
    return DocumentListResponse(documents=docs, total=len(docs))


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    requesting_user_id: int,
    db: Session = Depends(get_db),
):
    """Soft-delete a document. Only the uploader can delete their own document."""
    soft_delete_document(document_id=document_id, requesting_user_id=requesting_user_id, db=db)