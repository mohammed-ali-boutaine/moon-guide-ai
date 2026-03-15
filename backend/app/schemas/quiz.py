from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.quiz_attempt import AttemptStatus


# ── Request ───────────────────────────────────────────────────────────────────

class QuizGenerateRequest(BaseModel):
    document_id: int
    num_questions: int = Field(ge=5, le=50, description="Number of questions to generate (5–50)")
    difficulty: str = Field(pattern="^(easy|medium|hard)$", description="easy | medium | hard")


class AnswerCreate(BaseModel):
    text: str = Field(min_length=1)
    is_correct: bool
    order: int


class QuestionCreate(BaseModel):
    type: str = Field(pattern="^(MCQ|TrueFalse|ShortAnswer)$")
    text: str = Field(min_length=1)
    order: int
    points: int = Field(default=1, ge=1, description="Point value for this question")
    answers: list[AnswerCreate] = []


class QuizCreateRequest(BaseModel):
    class_id: Optional[uuid.UUID] = None
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    difficulty: Optional[str] = Field(None, pattern="^(easy|medium|hard)$")
    duration_minutes: Optional[int] = Field(None, ge=1)
    max_attempts: Optional[int] = Field(None, ge=1)
    questions: list[QuestionCreate] = []


class QuizUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(draft|published|archived)$")
    difficulty: Optional[str] = Field(None, pattern="^(easy|medium|hard)$")
    duration_minutes: Optional[int] = Field(None, ge=1)
    max_attempts: Optional[int] = Field(None, ge=1)


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
    points: int
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
    duration_minutes: Optional[int]
    max_attempts: Optional[int]
    questions: list[QuestionResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Quiz attempt schemas ───────────────────────────────────────────────────────

class QuizAttemptStartResponse(BaseModel):
    attempt_id: int
    quiz_id: int
    status: AttemptStatus
    started_at: datetime
    # None when the quiz has no time limit
    expires_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class StudentAnswerSubmit(BaseModel):
    question_id: int
    # Free text for ShortAnswer; answer text for MCQ/TrueFalse
    answer_text: Optional[str] = None


class QuizSubmitRequest(BaseModel):
    answers: list[StudentAnswerSubmit] = []


class QuizAttemptSubmitResponse(BaseModel):
    attempt_id: int
    quiz_id: int
    status: AttemptStatus
    submitted_at: datetime
    total_questions: int
    answers_recorded: int

    model_config = ConfigDict(from_attributes=True)
