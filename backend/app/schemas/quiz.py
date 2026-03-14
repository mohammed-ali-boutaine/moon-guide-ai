from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Request ───────────────────────────────────────────────────────────────────

class QuizGenerateRequest(BaseModel):
    document_id: int
    num_questions: int = Field(ge=5, le=50, description="Number of questions to generate (5–50)")
    difficulty: str = Field(pattern="^(easy|medium|hard)$", description="easy | medium | hard")


# ── Job responses ─────────────────────────────────────────────────────────────

class QuizJobResponse(BaseModel):
    """Returned immediately after POST /quiz/generate."""
    job_id: uuid.UUID
    status: str
    document_id: int
    num_questions: int
    difficulty: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuizJobDetailResponse(BaseModel):
    """Returned by GET /quiz/jobs/{job_id}."""
    job_id: uuid.UUID
    status: str
    document_id: int
    quiz_id: Optional[int]
    num_questions: int
    difficulty: str
    error_message: Optional[str]
    total_tokens: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Quiz detail responses ─────────────────────────────────────────────────────

class AnswerResponse(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int

    model_config = ConfigDict(from_attributes=True)


class QuestionResponse(BaseModel):
    id: int
    type: str
    text: str
    order: int
    answers: list[AnswerResponse]

    model_config = ConfigDict(from_attributes=True)


class QuizResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    difficulty: Optional[str]
    document_id: Optional[int]
    class_id: Optional[uuid.UUID]
    status: str
    questions: list[QuestionResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
