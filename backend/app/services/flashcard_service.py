"""
services/flashcard_service.py

Flashcard generation and spaced repetition (SM-2):
  1. Load document chunks from Postgres
  2. Call LLM to generate front/back flashcard pairs
  3. Persist Flashcard rows
  4. SM-2 review update: ease_factor, interval, next_review_at
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.core.logging import logger
from app.models.document_chunk import DocumentChunk
from app.models.flashcard import Flashcard, FlashcardProgress
from app.services.llm_service import call_llm

# ── Prompt ────────────────────────────────────────────────────────────────────

_SYSTEM = """\
You are an expert educator creating flashcards from document excerpts.
Each flashcard has a concise front (term, question, or concept) and a clear back
(definition, answer, or explanation). Stay strictly within the document content.
"""

_PROMPT = """\
## Document Excerpts
<context>
{context}
</context>

## Task
Generate exactly {count} high-quality flashcards from the content above.

Rules:
- Front: a short question, term, or concept (max 120 chars).
- Back: a concise but complete answer or definition (max 300 chars).
- Do not repeat the same concept.
- Base all content only on the document excerpts above.

Output ONLY valid JSON, no markdown or extra text:
{{
  "flashcards": [
    {{"front": "...", "back": "..."}},
    ...
  ]
}}
"""


def _extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text.strip())


# ── Generation ────────────────────────────────────────────────────────────────

def generate_flashcards(
    document_id: int,
    count: int,
    db: DBSession,
) -> list[Flashcard]:
    """Generate `count` flashcards from the document's chunks and persist them."""
    chunks = db.scalars(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
        .limit(30)
    ).all()

    if not chunks:
        raise ValueError(f"No chunks found for document {document_id}")

    context = "\n\n".join(c.chunk_text for c in chunks)[:12000]
    prompt = _SYSTEM + "\n\n" + _PROMPT.format(context=context, count=count)

    raw, _, _, _ = call_llm(prompt, temperature=0.4, max_tokens=3000, json_mode=True)

    try:
        data = _extract_json(raw)
        pairs = data.get("flashcards", [])
    except (json.JSONDecodeError, AttributeError) as exc:
        logger.error("flashcard_service: JSON parse error: %s\nRaw: %s", exc, raw[:500])
        raise RuntimeError("LLM returned invalid JSON for flashcard generation") from exc

    created: list[Flashcard] = []
    for pair in pairs:
        front = str(pair.get("front", "")).strip()
        back = str(pair.get("back", "")).strip()
        if not front or not back:
            continue
        card = Flashcard(document_id=document_id, front=front, back=back)
        db.add(card)
        created.append(card)

    db.commit()
    for card in created:
        db.refresh(card)

    logger.info(
        "flashcard_service: generated %d flashcards for document %d", len(created), document_id
    )
    return created


# ── SM-2 review update ────────────────────────────────────────────────────────

# Map 0-3 rating to SM-2 quality (0-5)
_QUALITY_MAP = {0: 1, 1: 3, 2: 4, 3: 5}


def record_review(
    user_id: int,
    flashcard_id: int,
    rating: int,  # 0=Again 1=Hard 2=Good 3=Easy
    db: DBSession,
) -> FlashcardProgress:
    """Apply SM-2 algorithm and update (or create) FlashcardProgress."""
    progress = db.scalar(
        select(FlashcardProgress).where(
            FlashcardProgress.user_id == user_id,
            FlashcardProgress.flashcard_id == flashcard_id,
        )
    )

    if progress is None:
        progress = FlashcardProgress(
            user_id=user_id,
            flashcard_id=flashcard_id,
        )
        db.add(progress)

    q = _QUALITY_MAP.get(rating, 4)
    ef = progress.ease_factor
    reps = progress.repetitions

    if q < 3:
        # Failed recall — reset
        reps = 0
        interval = 1
    else:
        if reps == 0:
            interval = 1
        elif reps == 1:
            interval = 6
        else:
            interval = round(progress.interval_days * ef)
        reps += 1

    # Update ease factor (clamped to [1.3, ∞))
    ef = max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

    now = datetime.now(timezone.utc)
    progress.ease_factor = ef
    progress.interval_days = interval
    progress.repetitions = reps
    progress.next_review_at = now + timedelta(days=interval)
    progress.last_reviewed_at = now

    db.commit()
    db.refresh(progress)
    return progress
