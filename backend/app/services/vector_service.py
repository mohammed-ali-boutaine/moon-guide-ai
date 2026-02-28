"""
services/vector_service.py

High-level service that combines embedding + Qdrant for semantic operations:
  - Store document chunk embeddings
  - Semantic search across class or document collections
"""
import json
import uuid
import logging
from typing import Optional

from qdrant_client.http import models as qmodels

from app.core.config import settings
from app.core.logging import logger
from app.services.embedding_service import embed_texts, embed_query
from app.services.qdrant_service import (
    _collection_name,
    ensure_collection,
    upsert_vectors,
    search_vectors,
    delete_vectors_by_filter,
    get_collection_info,
)


# ── Store embeddings ─────────────────────────────────────────────────────────

def store_chunk_embeddings(
    chunks: list[dict],
    document_id: int,
    class_id: Optional[str] = None,
) -> int:
    """
    Generate embeddings for document chunks and store them in Qdrant.

    Args:
        chunks: List of dicts with keys ``chunk_text``, ``chunk_index``, ``metadata``.
        document_id: The DB document ID.
        class_id: If provided, embeddings go into the class collection.

    Returns:
        Number of vectors stored.
    """
    if not chunks:
        logger.warning("store_chunk_embeddings called with empty chunks for doc %d", document_id)
        return 0

    collection = _collection_name(class_id=class_id, document_id=document_id)
    ensure_collection(collection)

    texts = [c["chunk_text"] for c in chunks]
    logger.info(
        "Generating embeddings for %d chunks (doc=%d, collection=%s)",
        len(texts), document_id, collection,
    )
    vectors = embed_texts(texts)

    ids = [str(uuid.uuid4()) for _ in chunks]
    payloads = [
        {
            "document_id": document_id,
            "class_id": str(class_id) if class_id else None,
            "chunk_index": c.get("chunk_index", i),
            "chunk_text": c["chunk_text"],
            "metadata": c.get("metadata", "{}"),
        }
        for i, c in enumerate(chunks)
    ]

    upsert_vectors(collection, ids, vectors, payloads)
    logger.info("Stored %d embeddings for doc %d in '%s'", len(ids), document_id, collection)
    return len(ids)


# ── Semantic search ──────────────────────────────────────────────────────────

def semantic_search(
    query: str,
    class_id: Optional[str] = None,
    document_id: Optional[int] = None,
    limit: int = 5,
    score_threshold: float = 0.3,
) -> list[dict]:
    """
    Perform semantic search against a Qdrant collection.

    Args:
        query: Natural language query.
        class_id: Search within a class collection.
        document_id: Search within a document collection. 
        limit: Max results.
        score_threshold: Minimum cosine similarity.

    Returns:
        List of result dicts with ``chunk_text``, ``score``, ``document_id``, ``metadata``.
    """
    collection = _collection_name(class_id=class_id, document_id=document_id)

    info = get_collection_info(collection)
    if info is None:
        logger.warning("Collection '%s' does not exist for search", collection)
        return []

    logger.info(
        "Semantic search: query='%s…' collection='%s' limit=%d threshold=%.2f",
        query[:50], collection, limit, score_threshold,
    )

    query_vector = embed_query(query)

    # Optional filter: restrict to specific document within a class collection
    filter_conditions = None
    if class_id and document_id:
        filter_conditions = qmodels.Filter(
            must=[
                qmodels.FieldCondition(
                    key="document_id",
                    match=qmodels.MatchValue(value=document_id),
                )
            ]
        )

    results = search_vectors(
        collection_name=collection,
        query_vector=query_vector,
        limit=limit,
        score_threshold=score_threshold,
        filter_conditions=filter_conditions,
    )

    formatted = []
    for r in results:
        formatted.append({
            "id": str(r.id),
            "score": r.score,
            "chunk_text": r.payload.get("chunk_text", ""),
            "document_id": r.payload.get("document_id"),
            "class_id": r.payload.get("class_id"),
            "chunk_index": r.payload.get("chunk_index"),
            "metadata": r.payload.get("metadata", "{}"),
        })

    logger.info("Semantic search returned %d results", len(formatted))
    return formatted


# ── Cleanup ──────────────────────────────────────────────────────────────────

def delete_document_vectors(
    document_id: int,
    class_id: Optional[str] = None,
) -> None:
    """
    Remove all vectors for a given document from the appropriate collection.
    """
    collection = _collection_name(class_id=class_id, document_id=document_id)

    info = get_collection_info(collection)
    if info is None:
        logger.info("No collection '%s' to delete vectors from", collection)
        return

    if class_id:
        # Delete only this document's vectors inside the class collection
        delete_vectors_by_filter(
            collection,
            qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="document_id",
                        match=qmodels.MatchValue(value=document_id),
                    )
                ]
            ),
        )
    else:
        # Per-document collection: delete the whole collection
        from app.services.qdrant_service import delete_collection
        delete_collection(collection)

    logger.info("Deleted vectors for doc %d from '%s'", document_id, collection)
