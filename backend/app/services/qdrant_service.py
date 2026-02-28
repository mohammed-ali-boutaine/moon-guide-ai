"""
services/qdrant_service.py

Qdrant vector database client management.
Handles connection, collection creation, and CRUD operations on vectors.
"""
import logging
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from qdrant_client.http.exceptions import UnexpectedResponse

from app.core.config import settings
from app.core.logging import logger

# ── Module-level client (singleton) ──────────────────────────────────────────

_client: Optional[QdrantClient] = None


def get_qdrant_client() -> QdrantClient:
    """
    Return (and lazily create) a singleton Qdrant client.
    Thread-safe because QdrantClient uses httpx internally.
    """
    global _client
    if _client is None:
        logger.info("Connecting to Qdrant at %s", settings.QDRANT_URL)
        _client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY or None,
            timeout=30,
        )
        logger.info("Qdrant client initialised successfully")
    return _client


# ── Collection helpers ───────────────────────────────────────────────────────

def _collection_name(class_id: Optional[str] = None, document_id: Optional[int] = None) -> str:
    """
    Build a deterministic collection name.

    Strategy:
        * Per-class collection  → ``moonguide_class_{class_id}``
        * Per-document fallback → ``moonguide_doc_{document_id}``
        * Global fallback       → ``moonguide_global``
    """
    prefix = settings.QDRANT_COLLECTION_PREFIX
    if class_id:
        return f"{prefix}_class_{class_id}"
    if document_id:
        return f"{prefix}_doc_{document_id}"
    return f"{prefix}_global"


def ensure_collection(
    collection_name: str,
    vector_size: int | None = None,
) -> None:
    """
    Create the collection if it does not already exist.
    Uses cosine distance which works well for normalised sentence embeddings.
    """
    client = get_qdrant_client()
    vector_size = vector_size or settings.EMBEDDING_DIMENSION

    try:
        client.get_collection(collection_name)
        logger.debug("Collection '%s' already exists", collection_name)
    except (UnexpectedResponse, Exception):
        logger.info("Creating Qdrant collection '%s' (dim=%d)", collection_name, vector_size)
        client.create_collection(
            collection_name=collection_name,
            vectors_config=qmodels.VectorParams(
                size=vector_size,
                distance=qmodels.Distance.COSINE,
            ),
            # Optimised for small-to-medium collections
            optimizers_config=qmodels.OptimizersConfigDiff(
                indexing_threshold=20_000,
            ),
        )
        logger.info("Collection '%s' created", collection_name)


def delete_collection(collection_name: str) -> bool:
    """Delete a collection. Returns True if deleted, False if it didn't exist."""
    client = get_qdrant_client()
    try:
        client.delete_collection(collection_name)
        logger.info("Deleted collection '%s'", collection_name)
        return True
    except (UnexpectedResponse, Exception) as exc:
        logger.warning("Could not delete collection '%s': %s", collection_name, exc)
        return False


# ── Vector CRUD ──────────────────────────────────────────────────────────────

def upsert_vectors(
    collection_name: str,
    ids: list[str],
    vectors: list[list[float]],
    payloads: list[dict],
) -> None:
    """
    Upsert a batch of vectors with metadata payloads.

    Args:
        collection_name: Target collection.
        ids: Unique point IDs (UUIDs recommended).
        vectors: Embedding vectors.
        payloads: Dicts of metadata attached to each point.
    """
    if not ids:
        return

    client = get_qdrant_client()
    ensure_collection(collection_name)

    points = [
        qmodels.PointStruct(id=uid, vector=vec, payload=payload)
        for uid, vec, payload in zip(ids, vectors, payloads)
    ]

    client.upsert(collection_name=collection_name, points=points)
    logger.info("Upserted %d vectors into '%s'", len(points), collection_name)


def search_vectors(
    collection_name: str,
    query_vector: list[float],
    limit: int = 5,
    score_threshold: float = 0.0,
    filter_conditions: Optional[qmodels.Filter] = None,
) -> list[qmodels.ScoredPoint]:
    """
    Search for the nearest neighbours in a collection.

    Returns:
        List of ScoredPoint (id, score, payload).
    """
    client = get_qdrant_client()
    try:
        results = client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=limit,
            score_threshold=score_threshold,
            query_filter=filter_conditions,
        )
        logger.info(
            "Search in '%s' returned %d results (limit=%d, threshold=%.2f)",
            collection_name, len(results), limit, score_threshold,
        )
        return results
    except (UnexpectedResponse, Exception) as exc:
        logger.error("Qdrant search failed in '%s': %s", collection_name, exc)
        raise


def delete_vectors_by_filter(
    collection_name: str,
    filter_conditions: qmodels.Filter,
) -> None:
    """Delete vectors matching a filter (e.g. all chunks of a document)."""
    client = get_qdrant_client()
    try:
        client.delete(
            collection_name=collection_name,
            points_selector=qmodels.FilterSelector(filter=filter_conditions),
        )
        logger.info("Deleted vectors from '%s' matching filter", collection_name)
    except (UnexpectedResponse, Exception) as exc:
        logger.error("Delete failed in '%s': %s", collection_name, exc)
        raise


def get_collection_info(collection_name: str) -> Optional[dict]:
    """Return collection info dict or None if it doesn't exist."""
    client = get_qdrant_client()
    try:
        info = client.get_collection(collection_name)
        return {
            "name": collection_name,
            "vectors_count": info.vectors_count,
            "points_count": info.points_count,
            "status": info.status.value if info.status else "unknown",
        }
    except (UnexpectedResponse, Exception):
        return None


def list_collections() -> list[str]:
    """Return names of all collections."""
    client = get_qdrant_client()
    collections = client.get_collections()
    return [c.name for c in collections.collections]
