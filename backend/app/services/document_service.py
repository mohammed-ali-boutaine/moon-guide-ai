"""
services/document_service.py

All business logic for document upload, extraction, chunking, and vector storage.
Handles: file validation, saving, ClamAV scanning, text extraction (PDF/DOCX/TXT),
         chunking via LangChain, saving chunks to Postgres, and embedding to Qdrant.
"""
import json
import logging
import os
import mimetypes
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from langchain.text_splitter import RecursiveCharacterTextSplitter
from fastapi import HTTPException, UploadFile, BackgroundTasks
from sqlalchemy.orm import Session

from app.celery_app import celery
from app.core.config import settings
from app.core.logging import logger
from app.models.document import Document, ScopeEnum, StatusEnum, RoleEnum, FileTypeEnum
from app.models.document_chunk import DocumentChunk

# -- Constants

MAX_FILE_SIZE_BYTES: int = settings.MAX_FILE_SIZE_MB * 1024 * 1024

ALLOWED_MIME_TYPES: dict[str, FileTypeEnum] = {
    "application/pdf": FileTypeEnum.pdf,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileTypeEnum.docx,
    "text/plain": FileTypeEnum.txt,
    "text/markdown": FileTypeEnum.md,
}
ALLOWED_EXTENSIONS: set[str] = {".pdf", ".docx", ".txt", ".md"}

UPLOAD_DIR: Path = Path("static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ===========================================================================
#  FILE HELPERS
# ===========================================================================


def _validate_file(file: UploadFile) -> FileTypeEnum:
    """
    Validate file extension and MIME type.

    Args:
        file: The uploaded file.

    Returns:
        Detected FileTypeEnum.

    Raises:
        HTTPException 422: If extension or MIME type is unsupported.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        logger.warning("Rejected file with unsupported extension: %s", ext)
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    content_type: str = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        guessed, _ = mimetypes.guess_type(file.filename or "")
        if guessed not in ALLOWED_MIME_TYPES:
            logger.warning("Rejected file with unsupported MIME type: %s (guessed: %s)", content_type, guessed)
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported MIME type '{content_type}'.",
            )
        content_type = guessed

    logger.info("File validated: %s (type=%s)", file.filename, content_type)
    return ALLOWED_MIME_TYPES[content_type]


def _save_file(
    file: UploadFile,
    scope: ScopeEnum,
    class_id: Optional[str],
) -> tuple[str, int]:
    """
    Stream the upload to disk. Returns (relative_path, size_in_bytes).

    Raises:
        HTTPException 400: Invalid file object.
        HTTPException 413: File exceeds MAX_FILE_SIZE_MB.
    """
    if not file.file:
        raise HTTPException(status_code=400, detail="Invalid file object.")

    subfolder = UPLOAD_DIR / (f"class_{class_id}" if scope == ScopeEnum.cls else "personal")
    subfolder.mkdir(parents=True, exist_ok=True)

    safe_name = Path(file.filename or "upload").name.replace(" ", "_")
    unique_name = f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}_{safe_name}"
    dest = subfolder / unique_name

    size = 0
    try:
        with open(dest, "wb") as f:
            while chunk := file.file.read(1024 * 256):  # 256 KB blocks
                size += len(chunk)
                if size > MAX_FILE_SIZE_BYTES:
                    os.remove(dest)
                    logger.warning("File too large (%d bytes), rejected: %s", size, file.filename)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB} MB.",
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error saving file %s: %s", file.filename, exc, exc_info=True)
        if dest.exists():
            os.remove(dest)
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.") from exc

    relative_path = f"/static/uploads/{dest.relative_to(UPLOAD_DIR).as_posix()}"
    logger.info("File saved: %s (%d bytes)", relative_path, size)
    return relative_path, size


# ===========================================================================
#  CLAMAV SCANNING
# ===========================================================================


def _scan_file_clamav(file_path: str) -> None:
    """
    Run ClamAV scan if enabled. Gracefully degrades when ClamAV is unavailable.

    Behaviour:
        - If CLAMAV_ENABLED is False -> skip silently.
        - Try pyclamd (Unix socket / network) first.
        - Fall back to clamscan CLI subprocess.
        - If ClamAV is simply not installed -> log warning, continue.

    Raises:
        HTTPException 422: If malware is detected.
    """
    if not settings.CLAMAV_ENABLED:
        logger.debug("ClamAV scanning disabled, skipping for %s", file_path)
        return

    abs_path = os.path.abspath(file_path.lstrip("/"))
    logger.info("Running ClamAV scan on %s", abs_path)

    # Attempt 1: pyclamd library
    try:
        import pyclamd  # type: ignore

        try:
            cd = pyclamd.ClamdNetworkSocket(
                host=settings.CLAMAV_HOST,
                port=settings.CLAMAV_PORT,
            )
            cd.ping()
        except Exception:
            cd = pyclamd.ClamdUnixSocket()

        result = cd.scan_file(abs_path)
        if result:
            logger.error("ClamAV detected malware in %s: %s", abs_path, result)
            try:
                os.remove(abs_path)
            except OSError:
                pass
            raise HTTPException(
                status_code=422,
                detail="Malware detected in file. Upload rejected.",
            )
        logger.info("ClamAV scan clean: %s", abs_path)
        return
    except ImportError:
        logger.debug("pyclamd not installed, trying subprocess fallback")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("pyclamd scan error: %s. Trying subprocess fallback.", exc)

    # Attempt 2: subprocess clamscan
    try:
        import subprocess

        result = subprocess.run(
            ["clamscan", "--no-summary", abs_path],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 1:
            logger.error("clamscan detected malware in %s", abs_path)
            try:
                os.remove(abs_path)
            except OSError:
                pass
            raise HTTPException(
                status_code=422,
                detail="Malware detected in file. Upload rejected.",
            )
        if result.returncode == 0:
            logger.info("clamscan scan clean: %s", abs_path)
            return
        logger.warning("clamscan returned code %d: %s", result.returncode, result.stderr)
    except FileNotFoundError:
        logger.warning("clamscan binary not found. ClamAV not installed.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("clamscan subprocess error: %s", exc)

    # If we reach here, ClamAV is not available
    logger.warning("ClamAV is not available. Skipping malware scan for %s", abs_path)


# ===========================================================================
#  TEXT EXTRACTION + CHUNKING (Background task via Celery)
# ===========================================================================


def _extract_text_from_file(file_path: str, file_type: str) -> str:
    """
    Extract raw text content from a file.

    Args:
        file_path: Absolute or relative path to the file.
        file_type: One of 'pdf', 'docx', 'txt', 'md'.

    Returns:
        Extracted text string.
    """
    # Handle both absolute and relative paths correctly
    if os.path.isabs(file_path):
        abs_path = file_path
    else:
        # For relative paths, ensure we don't accidentally strip needed prefixes
        abs_path = os.path.abspath(file_path)
    
    logger.info("Extracting text from %s (type=%s)", abs_path, file_type)

    text = ""
    if file_type == "pdf":
        import PyPDF2  # type: ignore

        with open(abs_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            pages: list[str] = []
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                pages.append(page_text)
                logger.debug("Extracted page %d (%d chars)", i + 1, len(page_text))
            text = "\n".join(pages)

    elif file_type == "docx":
        import docx as python_docx  # type: ignore

        doc = python_docx.Document(abs_path)
        text = "\n".join(p.text for p in doc.paragraphs)

    elif file_type in ("txt", "md"):
        with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

    logger.info("Extracted %d characters from %s", len(text), abs_path)
    return text


def _chunk_text(
    text: str,
    source: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[dict]:
    """
    Split text into overlapping chunks using LangChain RecursiveCharacterTextSplitter.

    The overlap comes from the **end** of the previous chunk -- i.e., the last
    chunk_overlap characters of chunk N are repeated at the start of chunk N+1.
    This ensures continuity of context at chunk boundaries.

    Args:
        text: Full document text.
        source: Source identifier for metadata.
        chunk_size: Max characters per chunk (default from settings).
        chunk_overlap: Overlap characters (default from settings).

    Returns:
        List of dicts with keys: chunk_text, chunk_index, metadata.
    """
    chunk_size = chunk_size or settings.CHUNK_SIZE
    chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP

    logger.info(
        "Chunking text (%d chars) -> size=%d, overlap=%d",
        len(text), chunk_size, chunk_overlap,
    )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    docs = splitter.create_documents(
        [text],
        metadatas=[{"source": source}],
    )

    chunks = []
    for i, doc in enumerate(docs):
        chunks.append({
            "chunk_text": doc.page_content,
            "chunk_index": i,
            "metadata": json.dumps(doc.metadata),
        })

    logger.info("Created %d chunks from text", len(chunks))
    return chunks


@celery.task(
    name="app.services.document_service.extract_and_embed",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def extract_and_embed(self, document_id: int, file_path: str, file_type: str, db_url: str, class_id: str | None = None) -> dict:
    """
    Celery background task: extract text -> chunk -> save to DB -> embed to Qdrant.

    Args:
        document_id: PK of the Document row.
        file_path: Path to the saved file on disk.
        file_type: File type string (pdf, docx, txt, md).
        db_url: SQLAlchemy database URL.
        class_id: Optional class UUID string for per-class Qdrant collections.

    Returns:
        Dict with chunks_count and vectors_count.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(str(db_url))
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    logger.info(
        "[Celery] Starting extract_and_embed for doc=%d file=%s type=%s",
        document_id, file_path, file_type,
    )

    try:
        # 1. Extract text
        text = _extract_text_from_file(file_path, file_type)

        if not text.strip():
            logger.warning("No text extracted from doc %d (%s)", document_id, file_path)
            db.query(Document).filter(Document.id == document_id).update(
                {"status": StatusEnum.rejected, "rejection_reason": "No text could be extracted from the file."}
            )
            db.commit()
            return {"chunks_count": 0, "vectors_count": 0}

        # 2. Chunk text
        chunks = _chunk_text(text, source=file_path)

        # 3. Save chunks to Postgres
        db_chunks: list[DocumentChunk] = []
        for chunk in chunks:
            db_chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=chunk["chunk_index"],
                chunk_text=chunk["chunk_text"],
                token_count=len(chunk["chunk_text"]),
                metadata_json=chunk["metadata"],
                embedded=False,
            )
            db.add(db_chunk)
            db_chunks.append(db_chunk)

        db.commit()
        for c in db_chunks:
            db.refresh(c)

        logger.info("[Celery] Saved %d chunks to DB for doc=%d", len(db_chunks), document_id)

        # 4. Generate embeddings and store in Qdrant
        vectors_count = 0
        try:
            from app.services.vector_service import store_chunk_embeddings

            chunk_dicts = [
                {
                    "chunk_text": c.chunk_text,
                    "chunk_index": c.chunk_index,
                    "metadata": c.metadata_json or "{}",
                }
                for c in db_chunks
            ]

            vectors_count = store_chunk_embeddings(
                chunks=chunk_dicts,
                document_id=document_id,
                class_id=class_id,
            )

            # Mark chunks as embedded
            for c in db_chunks:
                c.embedded = True
            db.commit()

            logger.info("[Celery] Stored %d vectors in Qdrant for doc=%d", vectors_count, document_id)

        except Exception as vec_exc:
            logger.error(
                "[Celery] Vector embedding failed for doc=%d: %s (chunks saved in DB)",
                document_id, vec_exc, exc_info=True,
            )

        # 5. Update document status to ready
        db.query(Document).filter(Document.id == document_id).update(
            {"status": StatusEnum.ready}
        )
        db.commit()

        logger.info("[Celery] Document %d is now READY (chunks=%d, vectors=%d)", document_id, len(db_chunks), vectors_count)
        return {"chunks_count": len(db_chunks), "vectors_count": vectors_count}

    except Exception as exc:
        logger.error(
            "[Celery] extract_and_embed FAILED for doc=%d: %s",
            document_id, exc, exc_info=True,
        )
        try:
            db.query(Document).filter(Document.id == document_id).update(
                {"status": StatusEnum.rejected, "rejection_reason": f"Processing failed: {exc}"}
            )
            db.commit()
        except Exception as db_exc:
            logger.error("[Celery] Failed to update doc status: %s", db_exc)
        raise self.retry(exc=exc)
    finally:
        db.close()
        engine.dispose()


# ===========================================================================
#  CORE SERVICE FUNCTIONS (called from routes)
# ===========================================================================


def upload_personal_document(
    file: UploadFile,
    uploaded_by_id: str,
    uploaded_by_role: RoleEnum,
    background_tasks: BackgroundTasks,
    db: Session,
) -> Document:
    """Upload a personal document. Auto-starts text extraction in background."""
    logger.info("Uploading personal document: %s (user=%s)", file.filename, uploaded_by_id)

    file_type = _validate_file(file)
    file_path, file_size = _save_file(file, ScopeEnum.personal, None)
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
        file_size_bytes=file_size,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    logger.info("Personal document created: id=%d, scheduling background extraction", doc.id)

    extract_and_embed.delay(
        document_id=doc.id,
        file_path=file_path,
        file_type=file_type.value,
        db_url=str(db.bind.url),
        class_id=None,
    )

    return doc


def upload_class_document(
    file: UploadFile,
    class_id: str,
    uploaded_by_id: str,
    uploaded_by_role: RoleEnum,
    background_tasks: BackgroundTasks,
    db: Session,
) -> Document:
    """
    Upload a document to a class.
    Teachers: auto-approved + immediately processed.
    Students: pending moderation.
    """
    logger.info(
        "Uploading class document: %s (class=%s, user=%s, role=%s)",
        file.filename, class_id, uploaded_by_id, uploaded_by_role,
    )

    file_type = _validate_file(file)
    file_path, file_size = _save_file(file, ScopeEnum.cls, class_id)
    _scan_file_clamav(file_path)

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
        approved_at=datetime.now(timezone.utc) if uploaded_by_role == RoleEnum.teacher else None,
        file_size_bytes=file_size,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    if uploaded_by_role == RoleEnum.teacher:
        logger.info("Teacher upload auto-approved, scheduling extraction for doc=%d", doc.id)
        extract_and_embed.delay(
            document_id=doc.id,
            file_path=file_path,
            file_type=file_type.value,
            db_url=str(db.bind.url),
            class_id=str(class_id),
        )
    else:
        logger.info("Student upload pending approval: doc=%d", doc.id)

    return doc


def list_personal_documents(uploaded_by_id: str, db: Session) -> list[Document]:
    """List non-deleted personal documents for a user."""
    logger.debug("Listing personal documents for user=%s", uploaded_by_id)
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


def list_class_documents(class_id: str, db: Session) -> list[Document]:
    """Return approved/ready/processing documents for a class."""
    logger.debug("Listing class documents for class=%s", class_id)
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


def soft_delete_document(document_id: int, requesting_user_id: str, db: Session) -> None:
    """Soft-delete a document. Only the uploader can delete their own documents."""
    doc = _get_document_or_404(document_id, db)
    if str(doc.uploaded_by_id) != str(requesting_user_id):
        logger.warning(
            "User %s attempted to delete doc %d owned by %s",
            requesting_user_id, document_id, doc.uploaded_by_id,
        )
        raise HTTPException(status_code=403, detail="You can only delete your own documents.")

    doc.deleted_at = datetime.now(timezone.utc)
    db.commit()
    logger.info("Soft-deleted document %d by user %s", document_id, requesting_user_id)

    # Clean up vectors
    try:
        from app.services.vector_service import delete_document_vectors
        delete_document_vectors(document_id=document_id, class_id=str(doc.class_id) if doc.class_id else None)
    except Exception as exc:
        logger.warning("Failed to delete vectors for doc %d: %s", document_id, exc)


def approve_document(
    document_id: int,
    teacher_id: str,
    background_tasks: BackgroundTasks,
    db: Session,
) -> Document:
    """Approve a pending document and start background extraction."""
    doc = _get_document_or_404(document_id, db)
    if doc.status != StatusEnum.pending:
        logger.warning("Cannot approve doc %d in state '%s'", document_id, doc.status)
        raise HTTPException(
            status_code=409,
            detail=f"Document is in '{doc.status}' state and cannot be approved.",
        )

    doc.status = StatusEnum.processing
    doc.approved_by_id = teacher_id
    doc.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(doc)

    logger.info("Document %d approved by teacher %s, scheduling extraction", document_id, teacher_id)

    extract_and_embed.delay(
        document_id=doc.id,
        file_path=doc.file_url,
        file_type=doc.file_type.value,
        db_url=str(db.bind.url),
        class_id=str(doc.class_id) if doc.class_id else None,
    )

    return doc


def reject_document(
    document_id: int,
    teacher_id: str,
    reason: Optional[str],
    db: Session,
) -> Document:
    """Reject a pending document."""
    doc = _get_document_or_404(document_id, db)
    if doc.status != StatusEnum.pending:
        logger.warning("Cannot reject doc %d in state '%s'", document_id, doc.status)
        raise HTTPException(
            status_code=409,
            detail=f"Document is in '{doc.status}' state and cannot be rejected.",
        )

    doc.status = StatusEnum.rejected
    doc.approved_by_id = teacher_id
    doc.approved_at = datetime.now(timezone.utc)
    doc.rejection_reason = reason
    db.commit()
    db.refresh(doc)

    logger.info("Document %d rejected by teacher %s (reason: %s)", document_id, teacher_id, reason)
    return doc


# -- Private Helpers

def _get_document_or_404(document_id: int, db: Session) -> Document:
    """Fetch a non-deleted document or raise 404."""
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.deleted_at.is_(None))
        .first()
    )
    if not doc:
        logger.warning("Document not found: id=%d", document_id)
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found.")
    return doc
