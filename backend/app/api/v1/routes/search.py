"""
routes/search.py

Semantic search endpoints powered by Qdrant vector database.
"""
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.core.logging import logger
from app.schemas.document import (
    CollectionInfoResponse,
    SemanticSearchRequest,
    SemanticSearchResponse,
    SemanticSearchResult,
)
from app.services.qdrant_service import (
    _collection_name,
    get_collection_info,
    list_collections,
)
from app.services.vector_service import semantic_search

router = APIRouter(prefix="/search", tags=["Semantic Search"])


@router.post(
    "/class/{class_id}",
    response_model=SemanticSearchResponse,
    summary="Semantic search within a class",
)
async def search_class_documents(
    class_id: UUID,
    body: SemanticSearchRequest,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> SemanticSearchResponse:
    """
    Search for relevant document chunks within a class using semantic similarity.
    Requires the user to be authenticated.
    """
    logger.info(
        "Semantic search: user=%s class=%s query='%s'",
        current_user.email, class_id, body.query[:50],
    )

    try:
        results = semantic_search(
            query=body.query,
            class_id=str(class_id),
            document_id=body.document_id,
            limit=body.limit,
            score_threshold=body.score_threshold,
        )
    except Exception as exc:
        logger.error("Semantic search failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Semantic search failed. Please try again later.",
        ) from exc

    collection = _collection_name(class_id=str(class_id))

    return SemanticSearchResponse(
        query=body.query,
        results=[SemanticSearchResult(**r) for r in results],
        total=len(results),
        collection=collection,
    )


@router.post(
    "/document/{document_id}",
    response_model=SemanticSearchResponse,
    summary="Semantic search within a single document",
)
async def search_single_document(
    document_id: int,
    body: SemanticSearchRequest,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
) -> SemanticSearchResponse:
    """
    Search for relevant chunks within a single document.
    """
    logger.info(
        "Document search: user=%s doc=%d query='%s'",
        current_user.email, document_id, body.query[:50],
    )

    try:
        results = semantic_search(
            query=body.query,
            document_id=document_id,
            limit=body.limit,
            score_threshold=body.score_threshold,
        )
    except Exception as exc:
        logger.error("Document search failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed. Please try again later.",
        ) from exc

    collection = _collection_name(document_id=document_id)

    return SemanticSearchResponse(
        query=body.query,
        results=[SemanticSearchResult(**r) for r in results],
        total=len(results),
        collection=collection,
    )


@router.get(
    "/collections",
    response_model=list[str],
    summary="List all Qdrant collections",
)
async def get_collections(
    current_user: CurrentUser,
) -> list[str]:
    """List all vector collections. Useful for debugging."""
    try:
        return list_collections()
    except Exception as exc:
        logger.error("Failed to list collections: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list collections.",
        ) from exc


@router.get(
    "/collections/{collection_name}/info",
    response_model=CollectionInfoResponse,
    summary="Get collection info",
)
async def get_collection_details(
    collection_name: str,
    current_user: CurrentUser,
) -> CollectionInfoResponse:
    """Get info about a specific Qdrant collection."""
    info = get_collection_info(collection_name)
    if info is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Collection '{collection_name}' not found.",
        )
    return CollectionInfoResponse(**info)
