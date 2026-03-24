"""
routes/flashcards.py

Flashcard CRUD + LLM generation + spaced-repetition review:
  POST  /flashcards/generate         – generate from document (student/teacher)
  GET   /flashcards                  – list flashcards for a document
  POST  /flashcards                  – create a single flashcard
  PATCH /flashcards/{id}             – update front/back
  DELETE /flashcards/{id}            – delete
  GET   /flashcards/study            – next due cards for study session
  POST  /flashcards/{id}/review      – record review result (SM-2)
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.models.document import Document, StatusEnum
from app.models.flashcard import Flashcard, FlashcardProgress
from app.schemas.flashcard import (
    FlashcardCreate,
    FlashcardGenerateRequest,
    FlashcardGenerateResponse,
    FlashcardListResponse,
    FlashcardResponse,
    FlashcardReviewRequest,
    FlashcardReviewResponse,
    FlashcardUpdate,
    FlashcardWithProgress,
)
from app.services import flashcard_service

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])


# ── POST /flashcards/generate ─────────────────────────────────────────────────

@router.post(
    "/generate",
    response_model=FlashcardGenerateResponse,
    status_code=status.HTTP_201_CREATED,
)
def generate_flashcards(
    body: FlashcardGenerateRequest,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> FlashcardGenerateResponse:
    doc = db.scalar(
        select(Document).where(
            Document.id == body.document_id,
            Document.deleted_at.is_(None),
        )
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if doc.status != StatusEnum.ready:
        raise HTTPException(
            status_code=422,
            detail="Document is not ready (still processing).",
        )

    try:
        cards = flashcard_service.generate_flashcards(
            document_id=body.document_id,
            count=body.count,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return FlashcardGenerateResponse(
        created=len(cards),
        flashcards=[FlashcardResponse.model_validate(c) for c in cards],
    )


# ── GET /flashcards ───────────────────────────────────────────────────────────

@router.get("/", response_model=FlashcardListResponse)
def list_flashcards(
    document_id: Annotated[int, Query()],
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> FlashcardListResponse:
    cards = db.scalars(
        select(Flashcard)
        .where(Flashcard.document_id == document_id)
        .order_by(Flashcard.id)
    ).all()
    return FlashcardListResponse(
        total=len(cards),
        items=[FlashcardResponse.model_validate(c) for c in cards],
    )


# ── POST /flashcards ──────────────────────────────────────────────────────────

@router.post("/", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
def create_flashcard(
    body: FlashcardCreate,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> FlashcardResponse:
    doc = db.scalar(select(Document).where(Document.id == body.document_id))
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    card = Flashcard(document_id=body.document_id, front=body.front, back=body.back)
    db.add(card)
    db.commit()
    db.refresh(card)
    return FlashcardResponse.model_validate(card)


# ── PATCH /flashcards/{id} ────────────────────────────────────────────────────

@router.patch("/{flashcard_id}", response_model=FlashcardResponse)
def update_flashcard(
    flashcard_id: int,
    body: FlashcardUpdate,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> FlashcardResponse:
    card = db.get(Flashcard, flashcard_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Flashcard not found.")
    if body.front is not None:
        card.front = body.front
    if body.back is not None:
        card.back = body.back
    db.commit()
    db.refresh(card)
    return FlashcardResponse.model_validate(card)


# ── DELETE /flashcards/{id} ───────────────────────────────────────────────────

@router.delete("/{flashcard_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flashcard(
    flashcard_id: int,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> None:
    card = db.get(Flashcard, flashcard_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Flashcard not found.")
    db.delete(card)
    db.commit()


# ── GET /flashcards/study ─────────────────────────────────────────────────────

@router.get("/study", response_model=list[FlashcardWithProgress])
def study_flashcards(
    document_id: Annotated[int, Query()],
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    current_user: CurrentUser = ...,
    db: Annotated[DBSession, Depends(get_db)] = ...,
) -> list[FlashcardWithProgress]:
    """Return up to `limit` due flashcards for the current user, for a given document."""
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    # Cards with existing progress that are due
    due_with_progress = db.execute(
        select(Flashcard, FlashcardProgress)
        .join(
            FlashcardProgress,
            (FlashcardProgress.flashcard_id == Flashcard.id)
            & (FlashcardProgress.user_id == current_user.id),
        )
        .where(
            Flashcard.document_id == document_id,
            FlashcardProgress.next_review_at <= now,
        )
        .order_by(FlashcardProgress.next_review_at)
        .limit(limit)
    ).all()

    results: list[FlashcardWithProgress] = []
    seen_ids: set[int] = set()

    for card, prog in due_with_progress:
        seen_ids.add(card.id)
        results.append(
            FlashcardWithProgress(
                id=card.id,
                document_id=card.document_id,
                front=card.front,
                back=card.back,
                created_at=card.created_at,
                ease_factor=prog.ease_factor,
                interval_days=prog.interval_days,
                repetitions=prog.repetitions,
                next_review_at=prog.next_review_at,
            )
        )

    # Fill remaining slots with new (never-seen) cards
    if len(results) < limit:
        new_cards = db.scalars(
            select(Flashcard)
            .where(
                Flashcard.document_id == document_id,
                ~Flashcard.id.in_(
                    select(FlashcardProgress.flashcard_id).where(
                        FlashcardProgress.user_id == current_user.id
                    )
                ),
            )
            .limit(limit - len(results))
        ).all()
        for card in new_cards:
            results.append(
                FlashcardWithProgress(
                    id=card.id,
                    document_id=card.document_id,
                    front=card.front,
                    back=card.back,
                    created_at=card.created_at,
                )
            )

    return results


# ── POST /flashcards/{id}/review ──────────────────────────────────────────────

@router.post("/{flashcard_id}/review", response_model=FlashcardReviewResponse)
def review_flashcard(
    flashcard_id: int,
    body: FlashcardReviewRequest,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> FlashcardReviewResponse:
    card = db.get(Flashcard, flashcard_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Flashcard not found.")

    prog = flashcard_service.record_review(
        user_id=current_user.id,
        flashcard_id=flashcard_id,
        rating=body.rating,
        db=db,
    )
    return FlashcardReviewResponse(
        flashcard_id=flashcard_id,
        next_review_at=prog.next_review_at,
        interval_days=prog.interval_days,
        ease_factor=prog.ease_factor,
    )
