"""
services/document_service.py
All business logic, DB queries, error raising.
"""
import logging
import os
import mimetypes
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile, BackgroundTasks
from sqlalchemy.orm import Session

from app.models.document import Document, ScopeEnum, StatusEnum, RoleEnum, FileTypeEnum

# ── Constants

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
# Multipurpose Internet Mail Extensions (MIME) types mapping to our FileTypeEnum
ALLOWED_MIME_TYPES = {
    "application/pdf": FileTypeEnum.pdf,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileTypeEnum.docx,
    "text/plain": FileTypeEnum.txt,
    "text/markdown": FileTypeEnum.md,
}
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}
UPLOAD_DIR = Path("static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ── File Helpers

def _validate_file(file: UploadFile) -> FileTypeEnum:
    """Validate extension, MIME type. Returns detected FileTypeEnum."""
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    # Check content-type header
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        # Fall back to extension-based detection
        guessed, _ = mimetypes.guess_type(file.filename)
        if guessed not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported MIME type '{content_type}'.",
            )
        content_type = guessed
    return ALLOWED_MIME_TYPES[content_type]


def _save_file(file: UploadFile, scope: ScopeEnum, class_id: Optional[int]) -> tuple[str, int]:
    """
    Save upload to disk. Returns (relative_path, size_in_bytes).
    Raises 413 if file exceeds 50 MB.
    """
    if not file.file:
        raise HTTPException(status_code=400, detail="Invalid file object.")

    subfolder = UPLOAD_DIR / (f"class_{class_id}" if scope == ScopeEnum.cls else "personal")
    subfolder.mkdir(parents=True, exist_ok=True)

    # Stream file to a temp location while counting bytes
    safe_name = Path(file.filename).name.replace(" ", "_")
    unique_name = f"{datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S%f')}_{safe_name}"
    dest = subfolder / unique_name

    size = 0
    with open(dest, "wb") as f:
        while chunk := file.file.read(1024 * 256):  # 256 KB chunks
            size += len(chunk)
            if size > MAX_FILE_SIZE_BYTES:
                os.remove(dest)
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds maximum size of 50 MB.",
                )
            f.write(chunk)

    # Return relative path starting from /static/uploads
    relative_path = f"/static/uploads/{dest.relative_to(UPLOAD_DIR).as_posix()}"
    return relative_path, size


def _scan_file_clamav(file_path: str) -> None:
    """
    Run ClamAV scan on the saved file.
    Raises 422 if threat detected.
    Uses pyclamd if available, otherwise subprocess clamscan.
    """
    try:
        import pyclamd  # type: ignore
        cd = pyclamd.ClamdUnixSocket()
        result = cd.scan_file(os.path.abspath(file_path))
        if result:
            os.remove(file_path)
            raise HTTPException(
                status_code=422,
                detail=f"Malware detected in file. Upload rejected.",
            )
    except ImportError:
        # Fallback: subprocess clamscan
        import subprocess
        result = subprocess.run(
            ["clamscan", "--no-summary", file_path],
            capture_output=True,
            text=True,
        )
        if result.returncode == 1:
            os.remove(file_path)
            raise HTTPException(
                status_code=422,
                detail="Malware detected in file. Upload rejected.",
            )
    except Exception:
        logging.warning("ClamAV scan failed or not available. Skipping malware scan for %s", file_path)        
        raise HTTPException(
            status_code=500,
            detail="ClamAV scan failed or is not available.",
        )


def _extract_text_background(document_id: int, file_path: str, file_type: FileTypeEnum, db: Session):
    """Background job: parse text content and update status to 'ready'."""
    try:
        text = ""
        if file_type == FileTypeEnum.pdf:
            import PyPDF2  # type: ignore
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                text = "\n".join(page.extract_text() or "" for page in reader.pages)

        elif file_type == FileTypeEnum.docx:
            import docx as python_docx  # type: ignore
            doc = python_docx.Document(file_path)
            text = "\n".join(p.text for p in doc.paragraphs)

        elif file_type in (FileTypeEnum.txt, FileTypeEnum.md):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()

        # TODO : vector db store
        # store `text` in a document_content table or search index
        # db.query(Document).filter(Document.id == document_id).update(
        #     {"status": StatusEnum.ready, "text_content": text}
        # )
        # db.commit()

    except Exception as e:
        db.query(Document).filter(Document.id == document_id).update(
            {"status": StatusEnum.rejected, "rejection_reason": f"Text extraction failed: {e}"}
        )
        db.commit()


# ── Core Service Functions 

def upload_personal_document(
    file: UploadFile,
    uploaded_by_id: int,
    uploaded_by_role: RoleEnum,
    background_tasks: BackgroundTasks,
    db: Session,
) -> Document:
    file_type = _validate_file(file)
    file_path, _ = _save_file(file, ScopeEnum.personal, None)
    _scan_file_clamav(file_path)

    doc = Document(
        scope=ScopeEnum.personal,
        class_id=None,
        filename=file.filename,
        file_url=file_path,
        file_type=file_type,
        status=StatusEnum.processing,
        uploaded_by_id=uploaded_by_id,
        uploaded_by_role=uploaded_by_role,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(_extract_text_background, doc.id, file_path, file_type, db)
    return doc


def list_personal_documents(uploaded_by_id: int, db: Session) -> list[Document]:
    return (
        db.query(Document)
        .filter(
            Document.scope == ScopeEnum.personal,
            Document.uploaded_by_id == uploaded_by_id,
            Document.deleted_at.is_(None),
        )
        .order_by(Document.created_at.desc())
        .all()
    )


def upload_class_document(
    file: UploadFile,
    class_id: int,
    uploaded_by_id: int,
    uploaded_by_role: RoleEnum,
    background_tasks: BackgroundTasks,
    db: Session,
) -> Document:
    file_type = _validate_file(file)
    file_path, _ = _save_file(file, ScopeEnum.cls, class_id)
    _scan_file_clamav(file_path)

    # Teachers: auto-approve. Students: pending moderation.
    initial_status = StatusEnum.processing if uploaded_by_role == RoleEnum.teacher else StatusEnum.pending

    doc = Document(
        scope=ScopeEnum.cls,
        class_id=class_id,
        filename=file.filename,
        file_url=file_path,
        file_type=file_type,
        status=initial_status,
        uploaded_by_id=uploaded_by_id,
        uploaded_by_role=uploaded_by_role,
        approved_by_id=uploaded_by_id if uploaded_by_role == RoleEnum.teacher else None,
        approved_at=datetime.now(datetime.timezone.utc) if uploaded_by_role == RoleEnum.teacher else None,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    if uploaded_by_role == RoleEnum.teacher:
        background_tasks.add_task(_extract_text_background, doc.id, file_path, file_type, db)

    return doc


def list_class_documents(class_id: int, db: Session) -> list[Document]:
    """Return approved/ready documents for a class (visible to all roles)."""
    return (
        db.query(Document)
        .filter(
            Document.scope == ScopeEnum.cls,
            Document.class_id == class_id,
            Document.deleted_at.is_(None),
            Document.status.in_([StatusEnum.approved, StatusEnum.ready, StatusEnum.processing]),
        )
        .order_by(Document.created_at.desc())
        .all()
    )


def soft_delete_document(document_id: int, requesting_user_id: int, db: Session) -> None:
    doc = _get_document_or_404(document_id, db)
    if doc.uploaded_by_id != requesting_user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own documents.")
    doc.deleted_at = datetime.utcnow()
    db.commit()


def approve_document(
    document_id: int,
    teacher_id: int,
    background_tasks: BackgroundTasks,
    db: Session,
) -> Document:
    doc = _get_document_or_404(document_id, db)
    if doc.status not in (StatusEnum.pending,):
        raise HTTPException(
            status_code=409,
            detail=f"Document is in '{doc.status}' state and cannot be approved.",
        )
    doc.status = StatusEnum.processing
    doc.approved_by_id = teacher_id
    doc.approved_at = datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(_extract_text_background, doc.id, doc.file_url, doc.file_type, db)
    return doc


def reject_document(
    document_id: int,
    teacher_id: int,
    reason: Optional[str],
    db: Session,
) -> Document:
    doc = _get_document_or_404(document_id, db)
    if doc.status not in (StatusEnum.pending,):
        raise HTTPException(
            status_code=409,
            detail=f"Document is in '{doc.status}' state and cannot be rejected.",
        )
    doc.status = StatusEnum.rejected
    doc.approved_by_id = teacher_id
    doc.approved_at = datetime.now(datetime.timezone.utc)
    doc.rejection_reason = reason
    db.commit()
    db.refresh(doc)
    return doc


# ── Private Helpers 

def _get_document_or_404(document_id: int, db: Session) -> Document:
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.deleted_at.is_(None))
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found.")
    return doc