"""
routes/documents.py

Document management endpoints for approve/reject operations.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.dependencies import TeacherUser
from app.schemas.document import (
    DocumentRejectRequest,
    DocumentResponse,
)
from app.services.document_service import (
    approve_document,
    reject_document,
)
from app.services.class_service import ClassService

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/{document_id}/approve", response_model=DocumentResponse)
def approve_doc(
    document_id: int,
    background_tasks: BackgroundTasks,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """Approve a pending class document. Teacher only."""

    # check if teacher is owner of class related to document
    if not ClassService.is_teacher_of_document(db, document_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to approve this document",
        )

    teacher_id = current_user.id
    doc = approve_document(
        document_id=document_id,
        teacher_id=teacher_id,
        background_tasks=background_tasks,
        db=db,
    )
    return doc


@router.post("/{document_id}/reject", response_model=DocumentResponse)
def reject_doc(
    document_id: int,
    body: DocumentRejectRequest,
    current_user: TeacherUser,
    db: Annotated[DBSession, Depends(get_db)],
):
    """Reject a pending class document. Teacher only."""

    # check if teacher is owner of class related to document
    if not ClassService.is_teacher_of_document(db, document_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to reject this document",
        )

    teacher_id = current_user.id
    doc = reject_document(
        document_id=document_id,
        teacher_id=teacher_id,
        reason=body.reason,
        db=db,
    )
    return doc
