from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Short-answer grading ──────────────────────────────────────────────────────

class ShortAnswerGradeResponse(BaseModel):
    """LLM grading details for a single short-answer student answer."""

    id: uuid.UUID
    student_answer_id: int
    attempt_id: int
    question_id: int
    expected_answer: str
    llm_score: float
    llm_reasoning: str
    bleu_score: Optional[float]
    rouge_l_score: Optional[float]
    needs_review: bool
    teacher_score: Optional[float]
    teacher_note: Optional[str]
    reviewed_at: Optional[datetime]
    model_used: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeacherReviewRequest(BaseModel):
    """Teacher override for a short-answer grade."""

    teacher_score: float = Field(ge=0, le=100)
    teacher_note: Optional[str] = None


# ── Feedback ──────────────────────────────────────────────────────────────────

class QuestionFeedbackResponse(BaseModel):
    """LLM-generated feedback for a single question within an attempt."""

    id: uuid.UUID
    attempt_id: int
    question_id: int
    feedback_text: str
    key_points: list[str]
    improvement_suggestion: Optional[str]
    is_correct: Optional[bool]
    score: Optional[float]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Detailed results ──────────────────────────────────────────────────────────

class QuestionResult(BaseModel):
    """Full result for one question within an attempt."""

    question_id: int
    question_text: str
    question_type: str
    points: int
    student_answer: Optional[str]
    correct_answer: Optional[str]
    is_correct: Optional[bool]
    # 0-100 score for this question (100 or 0 for MCQ/TF; 0-100 for ShortAnswer)
    score: Optional[float]
    needs_review: bool
    # Feedback (populated after generate-feedback is called)
    feedback_text: Optional[str] = None
    key_points: list[str] = []
    improvement_suggestion: Optional[str] = None
    # Short-answer grading details
    llm_reasoning: Optional[str] = None
    bleu_score: Optional[float] = None
    rouge_l_score: Optional[float] = None
    teacher_score: Optional[float] = None


class AttemptResultResponse(BaseModel):
    """Full results for a quiz attempt, returned by GET /quiz/{attempt_id}/results."""

    attempt_id: int
    quiz_id: int
    quiz_title: str
    quiz_difficulty: Optional[str]
    status: str
    started_at: datetime
    submitted_at: Optional[datetime]
    duration_seconds: Optional[int]
    # Weighted score across all auto-graded questions (0-100, None if all ShortAnswer pending)
    score: Optional[float]
    class_average: Optional[float]
    total_questions: int
    auto_graded: int
    pending_review: int
    feedback_generated: bool
    questions: list[QuestionResult]
    # Aggregate token cost across all LLM calls for this attempt
    total_tokens_used: int
