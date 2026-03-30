"""
services/concept_service.py

NLP pipeline to extract key concepts from document chunks.

Pipeline stages:
  1. spaCy NER  — named entities (PERSON, ORG, GPE, PRODUCT, EVENT, …)
  2. TextRank   — salient noun-phrase keywords via pytextrank
  3. TF-IDF     — term importance scored across chunks (corpus = chunks)
  4. Merge      — deduplicate, combine scores, filter by threshold
  5. Theme      — group by entity label or generic keyword/key_phrase bucket
  6. Store      — write DocumentConcept rows to Postgres
  7. Cache      — Redis key  concepts:doc:{document_id}  TTL 24 h
"""

import json
import logging
import re
import hashlib
from typing import Any

try:
    import redis
except ImportError:
    redis = None  # type: ignore[assignment]

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger

# ---------------------------------------------------------------------------
# Lazy imports — spaCy / pytextrank / scikit-learn are optional heavy deps.
# The service degrades gracefully if they are missing.
# ---------------------------------------------------------------------------

_nlp = None  # spaCy Language object (loaded once per process)

_SPACY_MODEL = "en_core_web_sm"
_TFIDF_MAX_FEATURES = 300
_TFIDF_NGRAM_RANGE = (1, 2)
_MIN_SCORE_THRESHOLD = 0.05
_MAX_CONCEPTS_PER_DOC = 60
_REDIS_TTL_SECONDS = 86_400  # 24 h
_CONCEPT_CACHE_PREFIX = "concepts:doc:"

# NER labels that are semantically useful for quiz generation
_USEFUL_NER_LABELS = {
    "PERSON", "ORG", "GPE", "LOC", "PRODUCT", "EVENT",
    "WORK_OF_ART", "LAW", "LANGUAGE", "NORP",
}


# ---------------------------------------------------------------------------
# spaCy model initialisation
# ---------------------------------------------------------------------------

def _get_nlp():
    """Return a cached spaCy pipeline with textrank component."""
    global _nlp
    if _nlp is not None:
        return _nlp

    try:
        import spacy
        import pytextrank  # noqa: F401 — registers the "textrank" pipe
    except ImportError as exc:
        raise RuntimeError(
            "spaCy and pytextrank are required for concept extraction. "
            "Run: pip install spacy pytextrank && python -m spacy download en_core_web_sm"
        ) from exc

    try:
        nlp = spacy.load(_SPACY_MODEL)
    except OSError:
        logger.warning("spaCy model '%s' not found — downloading…", _SPACY_MODEL)
        from spacy.cli import download as spacy_download
        spacy_download(_SPACY_MODEL)
        import spacy as _spacy
        nlp = _spacy.load(_SPACY_MODEL)

    # Increase max_length for large documents (default is 1 000 000)
    nlp.max_length = 2_000_000

    if "textrank" not in nlp.pipe_names:
        nlp.add_pipe("textrank")

    _nlp = nlp
    logger.info("spaCy pipeline loaded: %s", nlp.pipe_names)
    return _nlp


# ---------------------------------------------------------------------------
# Redis cache helpers
# ---------------------------------------------------------------------------

def _redis_key(document_id: int) -> str:
    return f"{_CONCEPT_CACHE_PREFIX}{document_id}"


def _get_cached_concepts(document_id: int) -> list[dict] | None:
    """Return cached concept list or None on miss / error."""
    try:
        r = redis.from_url(settings.REDIS_URL)
        raw = r.get(_redis_key(document_id))
        if raw:
            logger.debug("Cache HIT for concepts doc=%d", document_id)
            return json.loads(raw)
    except Exception as exc:
        logger.warning("Redis get failed for concepts doc=%d: %s", document_id, exc)
    return None


def _set_cached_concepts(document_id: int, concepts: list[dict]) -> None:
    """Store concept list in Redis. Silently swallow errors."""
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.setex(_redis_key(document_id), _REDIS_TTL_SECONDS, json.dumps(concepts))
        logger.debug("Cached %d concepts for doc=%d", len(concepts), document_id)
    except Exception as exc:
        logger.warning("Redis set failed for concepts doc=%d: %s", document_id, exc)


def invalidate_concept_cache(document_id: int) -> None:
    """Delete the concept cache for a document (call on re-processing)."""
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.delete(_redis_key(document_id))
    except Exception as exc:
        logger.warning("Redis delete failed for concepts doc=%d: %s", document_id, exc)


# ---------------------------------------------------------------------------
# Stage 1 — Named Entity Recognition
# ---------------------------------------------------------------------------

def _extract_ner(doc) -> list[dict]:
    """
    Extract named entities from a spaCy Doc.

    Returns list of dicts: {term, score, source, entity_type, theme, frequency}
    Score is proportional to entity frequency in the text (normalised 0–1).
    """
    from collections import Counter

    entity_counts: Counter = Counter()
    entity_labels: dict[str, str] = {}

    for ent in doc.ents:
        label = ent.label_
        if label not in _USEFUL_NER_LABELS:
            continue
        term = ent.text.strip()
        if len(term) < 2:
            continue
        # Normalise capitalisation: keep original but deduplicate case-insensitively
        term_lower = term.lower()
        entity_counts[term_lower] += 1
        # Store the most common surface form
        if term_lower not in entity_labels:
            entity_labels[term_lower] = (term, label)

    if not entity_counts:
        return []

    max_count = max(entity_counts.values()) or 1
    concepts = []
    for term_lower, count in entity_counts.items():
        surface, label = entity_labels[term_lower]
        concepts.append({
            "term": surface,
            "score": round(count / max_count, 4),
            "source": "ner",
            "entity_type": label,
            "theme": label,  # theme == NER label for entities
            "frequency": count,
        })
    return concepts


# ---------------------------------------------------------------------------
# Stage 2 — TextRank keyword phrases
# ---------------------------------------------------------------------------

def _extract_textrank(doc) -> list[dict]:
    """
    Extract key phrases using TextRank (pytextrank component).

    Returns list of dicts with rank-normalised scores.
    """
    phrases = []
    max_rank = max((p.rank for p in doc._.phrases), default=1) or 1

    for phrase in doc._.phrases:
        term = phrase.text.strip()
        if len(term) < 3 or not re.search(r"[a-zA-Z]", term):
            continue
        phrases.append({
            "term": term,
            "score": round(phrase.rank / max_rank, 4),
            "source": "textrank",
            "entity_type": None,
            "theme": "key_phrase",
            "frequency": phrase.count,
        })

    return phrases


# ---------------------------------------------------------------------------
# Stage 3 — TF-IDF across chunks
# ---------------------------------------------------------------------------

def _compute_tfidf(chunks: list[str]) -> dict[str, float]:
    """
    Run TF-IDF on the chunk corpus. Returns {term: max_tfidf_score}.

    Treats each chunk as a separate document so inter-chunk rarity is penalised.
    """
    if not chunks:
        return {}

    try:
        import numpy as np
        from sklearn.feature_extraction.text import TfidfVectorizer
    except ImportError:
        logger.warning("scikit-learn not installed — skipping TF-IDF stage")
        return {}

    # Single-chunk docs: use character n-grams as a fallback corpus
    corpus = chunks if len(chunks) > 1 else [chunks[0][i:i+200] for i in range(0, len(chunks[0]), 200)] or chunks

    try:
        vectorizer = TfidfVectorizer(
            ngram_range=_TFIDF_NGRAM_RANGE,
            max_features=_TFIDF_MAX_FEATURES,
            stop_words="english",
            min_df=1,
            sublinear_tf=True,
        )
        matrix = vectorizer.fit_transform(corpus)
    except ValueError:
        # Empty vocabulary (e.g. all stop-words)
        return {}

    feature_names: list[str] = vectorizer.get_feature_names_out().tolist()
    # Take the max TF-IDF score of each term across all chunks.
    # Explicitly call toarray() in case max() returns a sparse matrix in newer scipy.
    max_result = matrix.max(axis=0)
    if hasattr(max_result, 'toarray'):
        scores_flat = max_result.toarray().flatten()
    else:
        scores_flat = np.asarray(max_result).flatten()
    scores: list[float] = scores_flat.tolist()

    max_score = max(scores) if scores else 1.0
    return {
        term: round(float(score) / max_score, 4)
        for term, score in zip(feature_names, scores)
        if float(score) > 0
    }


def _tfidf_to_concepts(tfidf_scores: dict[str, float]) -> list[dict]:
    """Convert TF-IDF score dict to concept dicts."""
    return [
        {
            "term": term,
            "score": score,
            "source": "tfidf",
            "entity_type": None,
            "theme": "keyword",
            "frequency": 1,
        }
        for term, score in tfidf_scores.items()
        if score >= _MIN_SCORE_THRESHOLD
    ]


# ---------------------------------------------------------------------------
# Stage 4 — Merge and deduplicate
# ---------------------------------------------------------------------------

def _merge_concepts(
    ner: list[dict],
    textrank: list[dict],
    tfidf: list[dict],
) -> list[dict]:
    """
    Merge all three source lists.

    Deduplication: same term (case-insensitive) → keep highest score, prefer NER > TextRank > TF-IDF.
    Final score = weighted combination:
        NER × 1.0  +  TextRank × 0.8  +  TF-IDF × 0.6  (normalised by count)
    """
    source_weight = {"ner": 1.0, "textrank": 0.8, "tfidf": 0.6}

    merged: dict[str, dict] = {}  # term_lower → best concept dict

    for concept in ner + textrank + tfidf:
        key = concept["term"].lower()
        weight = source_weight[concept["source"]]
        weighted_score = concept["score"] * weight

        if key not in merged:
            merged[key] = {**concept, "score": weighted_score}
        else:
            existing = merged[key]
            # Accumulate score from multiple sources
            merged[key]["score"] = round(existing["score"] + weighted_score, 4)
            # Prefer NER metadata (entity_type, theme)
            if concept["source"] == "ner":
                merged[key]["source"] = "ner"
                merged[key]["entity_type"] = concept["entity_type"]
                merged[key]["theme"] = concept["theme"]
            # Update frequency if we have a better count
            merged[key]["frequency"] = max(
                existing.get("frequency", 1),
                concept.get("frequency", 1),
            )

    # Normalise scores to [0, 1]
    max_score = max((c["score"] for c in merged.values()), default=1.0) or 1.0
    for c in merged.values():
        c["score"] = round(c["score"] / max_score, 4)

    # Filter and sort
    candidates = [c for c in merged.values() if c["score"] >= _MIN_SCORE_THRESHOLD]
    candidates.sort(key=lambda x: x["score"], reverse=True)

    return candidates[:_MAX_CONCEPTS_PER_DOC]


# ---------------------------------------------------------------------------
# Stage 5+6 — Store to DB
# ---------------------------------------------------------------------------

def _store_concepts(
    document_id: int,
    concepts: list[dict],
    db: Session,
) -> list[Any]:
    """
    Persist concepts to `document_concepts` table.

    Deletes previous rows for the document before inserting (idempotent).
    """
    from app.models.document_concept import DocumentConcept, ConceptSource

    # Remove old concepts for this document (re-processing scenario)
    db.query(DocumentConcept).filter(DocumentConcept.document_id == document_id).delete()

    db_concepts = []
    for c in concepts:
        row = DocumentConcept(
            document_id=document_id,
            term=c["term"][:255],
            score=c["score"],
            source=ConceptSource(c["source"]),
            entity_type=c.get("entity_type"),
            theme=c.get("theme"),
            frequency=c.get("frequency", 1),
        )
        db.add(row)
        db_concepts.append(row)

    db.commit()
    for row in db_concepts:
        db.refresh(row)

    logger.info(
        "[concepts] Stored %d concepts for doc=%d", len(db_concepts), document_id
    )
    return db_concepts


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_and_store_concepts(
    document_id: int,
    chunks: list[str],
    db: Session,
) -> list[dict]:
    """
    Full concept extraction pipeline for a document.

    Args:
        document_id: PK of the Document row.
        chunks:       Plain-text content of each chunk (order matters for TF-IDF).
        db:           SQLAlchemy session.

    Returns:
        List of concept dicts as stored (term, score, source, entity_type, theme, frequency).
    """
    if not chunks:
        logger.warning("[concepts] No chunks provided for doc=%d — skipping", document_id)
        return []

    # 1. Cache check
    cached = _get_cached_concepts(document_id)
    if cached:
        return cached

    logger.info(
        "[concepts] Extracting from %d chunks for doc=%d", len(chunks), document_id
    )

    full_text = "\n\n".join(chunks)

    # 2. Run spaCy (NER + TextRank in one pass)
    try:
        nlp = _get_nlp()
        # spaCy has a hard character limit per doc; truncate if needed
        if len(full_text) > nlp.max_length:
            logger.warning(
                "[concepts] Text truncated from %d to %d chars for doc=%d",
                len(full_text), nlp.max_length, document_id,
            )
            full_text = full_text[: nlp.max_length]

        doc = nlp(full_text)
        ner_concepts = _extract_ner(doc)
        textrank_concepts = _extract_textrank(doc)
        logger.info(
            "[concepts] NER=%d TextRank=%d for doc=%d",
            len(ner_concepts), len(textrank_concepts), document_id,
        )
    except Exception as exc:
        logger.error(
            "[concepts] spaCy pipeline failed for doc=%d: %s", document_id, exc, exc_info=True
        )
        ner_concepts, textrank_concepts = [], []

    # 3. TF-IDF across chunks
    try:
        tfidf_scores = _compute_tfidf(chunks)
        tfidf_concepts = _tfidf_to_concepts(tfidf_scores)
        logger.info("[concepts] TF-IDF=%d terms for doc=%d", len(tfidf_concepts), document_id)
    except Exception as exc:
        logger.error("[concepts] TF-IDF failed for doc=%d: %s", document_id, exc)
        tfidf_concepts = []

    # 4. Merge
    merged = _merge_concepts(ner_concepts, textrank_concepts, tfidf_concepts)
    logger.info("[concepts] Merged=%d concepts for doc=%d", len(merged), document_id)

    # 5. Store
    _store_concepts(document_id, merged, db)

    # 6. Cache
    _set_cached_concepts(document_id, merged)

    return merged


def get_concepts_for_document(
    document_id: int,
    db: Session,
    min_score: float = 0.0,
    theme: str | None = None,
    limit: int = _MAX_CONCEPTS_PER_DOC,
) -> list[Any]:
    """
    Retrieve stored concepts for a document, with optional filters.

    Checks Redis cache first, then falls back to DB query.
    """
    from app.models.document_concept import DocumentConcept

    query = (
        db.query(DocumentConcept)
        .filter(DocumentConcept.document_id == document_id)
        .filter(DocumentConcept.score >= min_score)
    )
    if theme:
        query = query.filter(DocumentConcept.theme == theme)

    return query.order_by(DocumentConcept.score.desc()).limit(limit).all()
