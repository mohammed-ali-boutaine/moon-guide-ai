"""
services/embedding_service.py

Manages text-to-vector embeddings with two provider options:
  1. Sentence Transformers (local, free, default)
  2. Mistral AI (API-based, higher quality)

Features:
  - Lazy-loaded model / client singletons
  - Batch processing with configurable batch sizes
  - Redis caching of embeddings (content-hash keyed)
  - Rate-limit handling with exponential backoff (Mistral)
  - Token usage tracking
"""
import hashlib
import json
import math
import time
from typing import Optional

from app.core.config import settings
from app.core.logging import logger
from app.redis_client import redis_client


# ── Token usage tracking ─────────────────────────────────────────────────────

_token_usage = {"total_tokens": 0, "total_requests": 0, "provider": ""}


def get_token_usage() -> dict:
    """Return cumulative token / request stats since process start."""
    return dict(_token_usage)


def reset_token_usage() -> None:
    """Reset running counters (useful for tests)."""
    _token_usage.update(total_tokens=0, total_requests=0, provider="")


# ── Redis cache helpers ──────────────────────────────────────────────────────

def _cache_key(text: str) -> str:
    """Deterministic Redis key for a text's embedding."""
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:32]
    provider = settings.EMBEDDING_PROVIDER
    model = (
        settings.MISTRAL_EMBEDDING_MODEL
        if provider == "mistral"
        else settings.EMBEDDING_MODEL
    )
    return f"{settings.EMBEDDING_CACHE_PREFIX}{provider}:{model}:{digest}"


def _get_cached_embeddings(texts: list[str]) -> tuple[list[Optional[list[float]]], list[int]]:
    """
    Look up cached embeddings in Redis.

    Returns:
        (cached_results, miss_indices) — cached_results has None for misses;
        miss_indices lists the positions that need computation.
    """
    if not settings.EMBEDDING_CACHE_ENABLED:
        return [None] * len(texts), list(range(len(texts)))

    try:
        keys = [_cache_key(t) for t in texts]
        cached_values = redis_client.mget(keys)

        results: list[Optional[list[float]]] = []
        misses: list[int] = []
        for idx, val in enumerate(cached_values):
            if val is not None:
                results.append(json.loads(val))
            else:
                results.append(None)
                misses.append(idx)

        logger.debug(
            "Embedding cache: %d hits, %d misses out of %d",
            len(texts) - len(misses), len(misses), len(texts),
        )
        return results, misses
    except Exception as exc:
        logger.warning("Redis cache read failed, computing all: %s", exc)
        return [None] * len(texts), list(range(len(texts)))


def _set_cached_embeddings(texts: list[str], vectors: list[list[float]]) -> None:
    """Store computed embeddings in Redis with TTL."""
    if not settings.EMBEDDING_CACHE_ENABLED:
        return

    try:
        pipe = redis_client.pipeline()
        for text, vec in zip(texts, vectors):
            key = _cache_key(text)
            pipe.setex(key, settings.EMBEDDING_CACHE_TTL, json.dumps(vec))
        pipe.execute()
        logger.debug("Cached %d embeddings (TTL=%ds)", len(texts), settings.EMBEDDING_CACHE_TTL)
    except Exception as exc:
        logger.warning("Redis cache write failed: %s", exc)


# ══════════════════════════════════════════════════════════════════════════════
#  Provider: Sentence Transformers (local)
# ══════════════════════════════════════════════════════════════════════════════

_st_model = None


def _get_st_model():
    """Lazy-load the Sentence Transformer model (cached in module memory)."""
    global _st_model
    if _st_model is None:
        logger.info("Loading Sentence Transformers model: %s", settings.EMBEDDING_MODEL)
        from sentence_transformers import SentenceTransformer

        _st_model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info(
            "Sentence Transformers model loaded (dim=%d)",
            _st_model.get_sentence_embedding_dimension(),
        )
    return _st_model


def _embed_texts_sentence_transformers(
    texts: list[str],
    batch_size: int = 64,
) -> list[list[float]]:
    """Encode texts using a local Sentence Transformers model."""
    model = _get_st_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    _token_usage["provider"] = "sentence-transformers"
    _token_usage["total_requests"] += 1
    # Sentence Transformers doesn't report exact token count; estimate ~1.3 tokens/word
    estimated_tokens = sum(len(t.split()) for t in texts) * 1.3
    _token_usage["total_tokens"] += int(estimated_tokens)

    return [emb.tolist() for emb in embeddings]


# ══════════════════════════════════════════════════════════════════════════════
#  Provider: Mistral AI (API)
# ══════════════════════════════════════════════════════════════════════════════

_mistral_client = None


def _get_mistral_client():
    """Lazy-initialise the Mistral client."""
    global _mistral_client
    if _mistral_client is None:
        if not settings.MISTRAL_API_KEY:
            raise RuntimeError(
                "MISTRAL_API_KEY is required when EMBEDDING_PROVIDER='mistral'. "
                "Set it in your .env file."
            )
        logger.info(
            "Initialising Mistral client (model=%s, dim=%d)",
            settings.MISTRAL_EMBEDDING_MODEL,
            settings.MISTRAL_EMBEDDING_DIMENSION,
        )
        from mistralai import Mistral

        _mistral_client = Mistral(api_key=settings.MISTRAL_API_KEY)
    return _mistral_client


def _embed_batch_mistral(texts: list[str], max_retries: int = 5) -> list[list[float]]:
    """
    Call the Mistral embeddings API for a single batch.
    Handles rate-limit (429) and server errors (5xx) with exponential backoff.
    """
    client = _get_mistral_client()
    model = settings.MISTRAL_EMBEDDING_MODEL

    for attempt in range(1, max_retries + 1):
        try:
            response = client.embeddings.create(
                model=model,
                inputs=texts,
            )

            # Track usage
            _token_usage["provider"] = "mistral"
            _token_usage["total_requests"] += 1
            if hasattr(response, "usage") and response.usage:
                _token_usage["total_tokens"] += getattr(
                    response.usage, "total_tokens", 0
                )

            # Respect ordering from API response
            data_sorted = sorted(response.data, key=lambda d: d.index)
            return [d.embedding for d in data_sorted]

        except Exception as exc:
            exc_str = str(exc)
            is_rate_limit = "429" in exc_str or "rate" in exc_str.lower()
            is_server_error = any(str(code) in exc_str for code in (500, 502, 503))

            if (is_rate_limit or is_server_error) and attempt < max_retries:
                wait = min(2 ** attempt, 60)
                logger.warning(
                    "Mistral API error (attempt %d/%d): %s — retrying in %ds",
                    attempt, max_retries, exc, wait,
                )
                time.sleep(wait)
                continue

            logger.error("Mistral embedding failed after %d attempts: %s", attempt, exc)
            raise


def _embed_texts_mistral(texts: list[str]) -> list[list[float]]:
    """
    Encode texts using Mistral API with automatic batching and rate-limit pacing.

    Splits large input into batches of ``MISTRAL_EMBEDDING_BATCH_SIZE``
    and throttles calls to stay under ``MISTRAL_RATE_LIMIT_RPM``.
    """
    batch_size = settings.MISTRAL_EMBEDDING_BATCH_SIZE
    rpm_limit = settings.MISTRAL_RATE_LIMIT_RPM
    min_interval = 60.0 / rpm_limit if rpm_limit > 0 else 0

    num_batches = math.ceil(len(texts) / batch_size)
    logger.info(
        "Mistral embedding: %d texts → %d batches (batch_size=%d)",
        len(texts), num_batches, batch_size,
    )

    all_vectors: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        start_ts = time.monotonic()

        vectors = _embed_batch_mistral(batch)
        all_vectors.extend(vectors)

        # Rate-limit pacing: ensure minimum interval between requests
        elapsed = time.monotonic() - start_ts
        if elapsed < min_interval and (i + batch_size) < len(texts):
            sleep_time = min_interval - elapsed
            logger.debug("Rate-limit pacing: sleeping %.2fs", sleep_time)
            time.sleep(sleep_time)

    return all_vectors


# ══════════════════════════════════════════════════════════════════════════════
#  Public API (provider-agnostic)
# ══════════════════════════════════════════════════════════════════════════════

def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """
    Encode a list of texts into embedding vectors using the configured provider.

    Flow:
        1. Check Redis cache for already-computed embeddings.
        2. Compute missing embeddings via the selected provider.
        3. Store newly computed embeddings in cache.
        4. Return the full ordered list.

    Args:
        texts: List of text strings to embed.
        batch_size: Batch size for Sentence Transformers (ignored for Mistral).

    Returns:
        List of embedding vectors (each is a list of floats).
    """
    if not texts:
        return []

    provider = settings.EMBEDDING_PROVIDER
    logger.info(
        "embed_texts: %d text(s), provider='%s'",
        len(texts), provider,
    )

    # 1) Cache lookup
    cached_results, miss_indices = _get_cached_embeddings(texts)

    # 2) Compute misses
    if miss_indices:
        miss_texts = [texts[i] for i in miss_indices]

        if provider == "mistral":
            new_vectors = _embed_texts_mistral(miss_texts)
        elif provider == "sentence-transformers":
            new_vectors = _embed_texts_sentence_transformers(miss_texts, batch_size)
        else:
            raise ValueError(
                f"Unknown EMBEDDING_PROVIDER '{provider}'. "
                "Use 'sentence-transformers' or 'mistral'."
            )

        # Merge back into cached_results
        for idx, vec in zip(miss_indices, new_vectors):
            cached_results[idx] = vec

        # 3) Store in cache
        _set_cached_embeddings(miss_texts, new_vectors)

    result = cached_results  # type: ignore[assignment]
    dim = len(result[0]) if result else 0
    logger.info(
        "embed_texts done: %d vectors (dim=%d, provider=%s, cache_hits=%d)",
        len(result), dim, provider, len(texts) - len(miss_indices),
    )
    return result  # type: ignore[return-value]


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
    """
    Return the dimensionality for the active provider.

    - Sentence Transformers: loaded model's actual dimension
    - Mistral: configured dimension (default 1024)
    """
    provider = settings.EMBEDDING_PROVIDER
    if provider == "mistral":
        return settings.MISTRAL_EMBEDDING_DIMENSION
    else:
        model = _get_st_model()
        return model.get_sentence_embedding_dimension()


def get_active_provider_info() -> dict:
    """Return a summary of the active embedding provider configuration."""
    provider = settings.EMBEDDING_PROVIDER
    if provider == "mistral":
        return {
            "provider": "mistral",
            "model": settings.MISTRAL_EMBEDDING_MODEL,
            "dimension": settings.MISTRAL_EMBEDDING_DIMENSION,
            "batch_size": settings.MISTRAL_EMBEDDING_BATCH_SIZE,
            "rate_limit_rpm": settings.MISTRAL_RATE_LIMIT_RPM,
            "cache_enabled": settings.EMBEDDING_CACHE_ENABLED,
        }
    else:
        return {
            "provider": "sentence-transformers",
            "model": settings.EMBEDDING_MODEL,
            "dimension": settings.EMBEDDING_DIMENSION,
            "cache_enabled": settings.EMBEDDING_CACHE_ENABLED,
        }
