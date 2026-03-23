from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, String, Uuid, func, text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.chat_session import ChatSession


class ChatRole(str, enum.Enum):
    """Role of the chat message sender."""
    user = "user"
    assistant = "assistant"


class ChatMessage(Base):
    """
    Chat message model representing a single message in a conversation.
    
    Stores message content, role (user/assistant), and optional sources
    as JSON for AI-generated responses referencing documents.
    """
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    content: Mapped[str] = mapped_column(
        String(4096), nullable=False
    )
    sources_json: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    session: Mapped["ChatSession"] = relationship(back_populates="messages")
