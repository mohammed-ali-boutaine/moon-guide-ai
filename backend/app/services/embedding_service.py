"""
services/embedding_service.py

Manages text-to-vector embeddings using Sentence Transformers.
Supports batch encoding and caching the model in memory for reuse.
"""
import logging
from typing import Optional

from app.core.config import settings
from app.core.logging import logger

# ── Lazy-loaded model singleton ──────────────────────────────────────────────

_model = None


def _get_model():
    """
    Lazy-load the Sentence Transformer model.
    The model is loaded once and cached in module memory.
    """
    global _model
    if _model is None:
        logger.info("Loading embedding model: %s", settings.EMBEDDING_MODEL)
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info(
            "Embedding model loaded (dim=%d)",
            _model.get_sentence_embedding_dimension(),
        )
    return _model


# ── Public API ───────────────────────────────────────────────────────────────

def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """
    Encode a list of texts into embedding vectors.

    Args:
        texts: List of text strings to embed.
        batch_size: Batch size for the encoder (larger = faster but more RAM).

    Returns:
        List of embedding vectors (each is a list of floats).
    """
    if not texts:
        return []

    model = _get_model()
    logger.info("Encoding %d text(s) with model '%s'", len(texts), settings.EMBEDDING_MODEL)

    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,  # Cosine similarity works best with normalised vectors
    )

    result = [emb.tolist() for emb in embeddings]
    logger.info("Encoded %d text(s) → %d vectors (dim=%d)", len(texts), len(result), len(result[0]) if result else 0)
    return result


def embed_query(text: str) -> list[float]:
    """
    Encode a single query text into an embedding vector.
    Convenience wrapper around ``embed_texts``.
    """
    vecs = embed_texts([text])
    if not vecs:
        raise ValueError("Failed to encode query text")
    return vecs[0]


def get_embedding_dimension() -> int:
    """Return the dimensionality of the loaded model."""
    model = _get_model()
    return model.get_sentence_embedding_dimension()
