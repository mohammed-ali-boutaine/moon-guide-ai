"""
routes/chat.py

Chat / RAG endpoints:
  POST   /chat/sessions                         – create session
  GET    /chat/sessions                         – list user's active sessions
  GET    /chat/sessions/{session_id}            – session + full message history
  POST   /chat/sessions/{session_id}/messages   – send message (triggers RAG)
  DELETE /chat/sessions/{session_id}            – end / soft-delete session
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession, selectinload

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.core.logging import logger
from app.models.chat_message import ChatMessage, ChatRole
from app.models.chat_session import ChatSession
from app.models.document import Document
from app.core.rate_limit import RateLimiter
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    MessageResponse,
    MessageSource,
    SessionCreate,
    SessionDetailResponse,
    SessionResponse,
)
from app.services.rag_service import run_rag_pipeline

_RAG_TIMEOUT = 30.0     # seconds

router = APIRouter(prefix="/chat", tags=["Chat / RAG"])

_rate_limit_chat = RateLimiter("chat", max_requests=10, window_seconds=60)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_session_or_404(
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    db: DBSession,
) -> ChatSession:
    """Load a non-ended session that belongs to the current user."""
    session = db.scalar(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
            ChatSession.ended_at.is_(None),
        )
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or already ended.",
        )
    return session


def _message_to_schema(msg: ChatMessage) -> MessageResponse:
    sources: list[MessageSource] = []
    if msg.sources_json:
        for s in msg.sources_json:
            sources.append(MessageSource(**s))
    return MessageResponse(
        id=msg.id,
        session_id=msg.session_id,
        role=msg.role,
        content=msg.content,
        sources=sources,
        created_at=msg.created_at,
    )


# ── Create session ────────────────────────────────────────────────────────────

@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat session",
)
def create_session(
    body: SessionCreate,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> SessionResponse:
    """
    Create a new chat session.
    - Personal session: omit `class_id`.
    - Class session: provide a valid `class_id`.
    """
    session = ChatSession(
        user_id=current_user.id,
        class_id=body.class_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    logger.info("Created chat session %s for user %s", session.id, current_user.email)
    return SessionResponse.model_validate(session)


# ── List sessions ─────────────────────────────────────────────────────────────

@router.get(
    "/sessions",
    response_model=list[SessionResponse],
    summary="List active chat sessions",
)
def list_sessions(
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> list[SessionResponse]:
    """Return all non-ended sessions belonging to the current user."""
    sessions = db.scalars(
        select(ChatSession).where(
            ChatSession.user_id == current_user.id,
            ChatSession.ended_at.is_(None),
        ).order_by(ChatSession.created_at.desc())
    ).all()
    return [SessionResponse.model_validate(s) for s in sessions]


# ── Get session detail ────────────────────────────────────────────────────────

@router.get(
    "/sessions/{session_id}",
    response_model=SessionDetailResponse,
    summary="Get session with message history",
)
def get_session(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> SessionDetailResponse:
    """Return a session and all its messages, ordered by creation time."""
    session = db.scalar(
        select(ChatSession)
        .where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
        .options(selectinload(ChatSession.messages))
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    messages = [_message_to_schema(m) for m in session.messages]
    return SessionDetailResponse(
        id=session.id,
        user_id=session.user_id,
        class_id=session.class_id,
        created_at=session.created_at,
        ended_at=session.ended_at,
        messages=messages,
    )


# ── Send message (RAG) ────────────────────────────────────────────────────────

@router.post(
    "/sessions/{session_id}/messages",
    response_model=ChatResponse,
    summary="Send a message and get an AI-powered answer",
)
async def send_message(
    session_id: uuid.UUID,
    body: ChatRequest,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
    _: Annotated[None, Depends(_rate_limit_chat)],
) -> ChatResponse:
    """
    Send a user message, run the RAG pipeline, and return the assistant's answer.

    The pipeline:
    1. Retrieve relevant chunks from Qdrant (class or document collection).
    2. Rank by similarity score.
    3. Build a context block from top-K chunks.
    4. Engineer a prompt with conversation history.
    5. Call the Gemini LLM.
    6. Persist both messages and return the response.
    """
    # Load session and verify ownership
    session = _get_session_or_404(session_id, current_user.id, db)

    # Fetch the last N messages for conversation history
    history_rows = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(6)
    ).all()
    history = [
        {"role": m.role, "content": m.content}
        for m in reversed(history_rows)
    ]

    # ── Build doc context for the session type ───────────────────────────────
    doc_name_map: dict[int, str] = {}
    class_id_str: Optional[str] = None
    personal_document_ids: Optional[list[int]] = None

    try:
        if session.class_id:
            # Class session: single collection, search by class_id
            from app.models.class_ import Class
            from app.models.role import RoleName

            # Verify the current user has access to this class
            cls = db.scalar(select(Class).where(Class.id == session.class_id))
            if cls is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Class not found.",
                )

            is_teacher = current_user.role and current_user.role.name == RoleName.TEACHER
            if is_teacher and str(cls.teacher_id) != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not the teacher of this class.",
                )

            if not is_teacher:
                from app.models.class_student import ClassStudent
                enrolled = db.scalar(
                    select(ClassStudent).where(
                        ClassStudent.class_id == session.class_id,
                        ClassStudent.student_id == current_user.id,
                    )
                )
                if enrolled is None:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You are not enrolled in this class.",
                    )

            class_id_str = str(session.class_id)
            docs = db.scalars(
                select(Document).where(
                    Document.class_id == session.class_id,
                    Document.deleted_at.is_(None),
                    Document.status == "ready",
                )
            ).all()
            doc_name_map = {d.id: d.filename for d in docs}
        else:
            # Personal session: each doc in its own collection — collect all IDs
            docs = db.scalars(
                select(Document).where(
                    Document.uploaded_by_id == current_user.id,
                    Document.scope == "personal",
                    Document.deleted_at.is_(None),
                    Document.status == "ready",
                )
            ).all()
            doc_name_map = {d.id: d.filename for d in docs}
            # If caller narrowed to one doc, use that; otherwise search all personal docs
            if body.document_id:
                personal_document_ids = [body.document_id]
            else:
                personal_document_ids = [d.id for d in docs]
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Could not build doc context: %s", exc)

    logger.info(
        "RAG request: session=%s user=%s query='%.80s' class_id=%s personal_docs=%s",
        session_id, current_user.email, body.content, class_id_str,
        len(personal_document_ids) if personal_document_ids else 0,
    )

    # ── Run the RAG pipeline (30s timeout) ──────────────────────────────────
    try:
        rag_result = await asyncio.wait_for(
            asyncio.to_thread(
                run_rag_pipeline,
                query=body.content,
                history=history,
                class_id=class_id_str,
                document_id=body.document_id if class_id_str else None,
                personal_document_ids=personal_document_ids,
                doc_name_map=doc_name_map,
            ),
            timeout=_RAG_TIMEOUT,
        )
    except asyncio.TimeoutError:
        logger.warning("RAG pipeline timed out for session=%s user=%s", session_id, current_user.email)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request timed out. The AI took too long to respond.",
        )

    # ── Persist user message ─────────────────────────────────────────────────
    try:
        user_msg = ChatMessage(
            session_id=session_id,
            role=ChatRole.user.value,
            content=body.content,
            sources_json=None,
        )
        db.add(user_msg)

        # ── Persist assistant message ────────────────────────────────────────
        sources_payload = [
            {
                "document_id": s["document_id"],
                "document_filename": s["document_filename"],
                "chunk_index": s["chunk_index"],
                "score": s["score"],
            }
            for s in rag_result.sources
        ]
        assistant_msg = ChatMessage(
            session_id=session_id,
            role=ChatRole.assistant.value,
            content=rag_result.answer,
            sources_json=sources_payload if sources_payload else None,
        )
        db.add(assistant_msg)
        db.commit()
        db.refresh(user_msg)
        db.refresh(assistant_msg)
    except Exception as exc:
        logger.error("Failed to persist chat messages for session=%s: %s", session_id, exc, exc_info=True)
        try:
            db.rollback()
        except:
            pass
        raise HTTPException(
            status_code=500,
            detail="Failed to save chat messages. Please try again.",
        ) from exc

    logger.info(
        "RAG done: session=%s had_context=%s tokens=%d",
        session_id, rag_result.had_context, rag_result.total_tokens,
    )

    return ChatResponse(
        user_message=_message_to_schema(user_msg),
        assistant_message=_message_to_schema(assistant_msg),
        had_context=rag_result.had_context,
        retrieved_chunks=rag_result.retrieved_chunks,
        used_chunks=rag_result.used_chunks,
        prompt_tokens=rag_result.prompt_tokens,
        completion_tokens=rag_result.completion_tokens,
        total_tokens=rag_result.total_tokens,
    )


# ── End session ───────────────────────────────────────────────────────────────

@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="End a chat session",
)
def end_session(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> Response:
    """Soft-delete a session by setting `ended_at` to now."""
    session = _get_session_or_404(session_id, current_user.id, db)
    session.ended_at = datetime.now(timezone.utc)
    db.commit()
    logger.info("Ended chat session %s for user %s", session_id, current_user.email)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
