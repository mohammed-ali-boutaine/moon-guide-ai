"""
schemas/chat.py

Pydantic models for the Chat / RAG endpoints.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Session ───────────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    """Body for creating a new chat session."""
    class_id: Optional[uuid.UUID] = Field(
        None,
        description="Optional class UUID. Omit for a personal session.",
    )


class SessionResponse(BaseModel):
    """Returned when a session is created or listed."""
    id: uuid.UUID
    user_id: uuid.UUID
    class_id: Optional[uuid.UUID]
    created_at: datetime
    ended_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── Messages ──────────────────────────────────────────────────────────────────

class MessageSource(BaseModel):
    """A document chunk cited in an assistant response."""
    document_id: Optional[int]
    document_filename: Optional[str]
    chunk_index: Optional[int]
    score: float


class MessageResponse(BaseModel):
    """A single chat message (user or assistant)."""
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    sources: list[MessageSource] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Chat request / response ────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    """Body for sending a message within a session."""
    content: str = Field(..., min_length=1, max_length=2000, description="The user's question.")
    document_id: Optional[int] = Field(
        None,
        description="Restrict RAG retrieval to a single document (personal sessions).",
    )


class ChatResponse(BaseModel):
    """Full response returned after processing a chat message."""
    user_message: MessageResponse
    assistant_message: MessageResponse
    # RAG metadata
    had_context: bool = Field(description="Whether relevant document chunks were found.")
    retrieved_chunks: int
    used_chunks: int
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


# ── Session detail (with messages) ───────────────────────────────────────────

class SessionDetailResponse(BaseModel):
    """Session with its full message history."""
    id: uuid.UUID
    user_id: uuid.UUID
    class_id: Optional[uuid.UUID]
    created_at: datetime
    ended_at: Optional[datetime]
    messages: list[MessageResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}
