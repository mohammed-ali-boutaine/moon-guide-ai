from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.quiz import QuizResponse


# ── Requests ──────────────────────────────────────────────────────────────────

class AssignQuizRequest(BaseModel):
    class_id: uuid.UUID
    due_date: Optional[datetime] = Field(
        None, description="Optional deadline for students (timezone-aware ISO 8601)"
    )


class UnassignQuizRequest(BaseModel):
    class_id: uuid.UUID


# ── Responses ─────────────────────────────────────────────────────────────────

class AssignedByInfo(BaseModel):
    id: uuid.UUID
    email: str

    model_config = ConfigDict(from_attributes=True)


class QuizAssignmentResponse(BaseModel):
    id: uuid.UUID
    quiz_id: int
    class_id: uuid.UUID
    assigned_by: AssignedByInfo
    status: str
    due_date: Optional[datetime]
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssignedQuizItem(BaseModel):
    """Quiz with its assignment metadata — returned by GET /quiz/assigned/{class_id}."""

    assignment_id: uuid.UUID
    assignment_status: str
    assigned_at: datetime
    assigned_by: AssignedByInfo
    due_date: Optional[datetime]
    quiz: QuizResponse

    model_config = ConfigDict(from_attributes=True)


class NotificationResponse(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    body: str
    data: Optional[dict] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
