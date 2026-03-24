from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class FlashcardBase(BaseModel):
    front: str
    back: str


class FlashcardCreate(FlashcardBase):
    document_id: int


class FlashcardUpdate(BaseModel):
    front: str | None = None
    back: str | None = None


class FlashcardResponse(FlashcardBase):
    id: int
    document_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class FlashcardWithProgress(FlashcardResponse):
    ease_factor: float = 2.5
    interval_days: int = 1
    repetitions: int = 0
    next_review_at: datetime | None = None


class FlashcardGenerateRequest(BaseModel):
    document_id: int
    count: int = Field(default=10, ge=3, le=40)


class FlashcardGenerateResponse(BaseModel):
    created: int
    flashcards: list[FlashcardResponse]


class FlashcardListResponse(BaseModel):
    total: int
    items: list[FlashcardResponse]


# Rating values: 0=Again 1=Hard 2=Good 3=Easy  (SM-2 quality 0-5 mapped to 4 levels)
class FlashcardReviewRequest(BaseModel):
    rating: int = Field(..., ge=0, le=3)


class FlashcardReviewResponse(BaseModel):
    flashcard_id: int
    next_review_at: datetime
    interval_days: int
    ease_factor: float
