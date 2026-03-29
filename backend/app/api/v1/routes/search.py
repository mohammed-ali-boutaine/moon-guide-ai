"""
routes/search.py

Semantic search endpoints powered by Qdrant vector database.
"""
import math
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.core.logging import logger
from app.models.document import Document
from app.schemas.document import (
    CollectionInfoResponse,
    SemanticSearchRequest,
    SemanticSearchResponse,
    SemanticSearchResult,
    SearchRequest,
    SearchResponse,
    SearchResult,
    SearchResultDocumentInfo,
)
from app.core.rate_limit import RateLimiter
from app.services.qdrant_service import (
    _collection_name,
    get_collection_info,
    list_collections,
)
from app.services.vector_service import semantic_search

router = APIRouter(prefix="/search", tags=["Semantic Search"])

_rate_limit_search = RateLimiter("search", max_requests=20, window_seconds=60)


def _expand_query(query: str) -> str:
    """
    Simple query expansion to improve search results.
    Adds synonyms and related terms for common educational concepts.
    """
    # Basic expansion: add common variations
    expanded = query
    
    # Common educational term expansions
    expansions = {
        "exam": "examination test assessment quiz",
        "quiz": "test assessment examination",
        "homework": "assignment task exercise",
        "class": "course lecture session",
        "student": "learner pupil",
        "teacher": "instructor professor educator",
        "grade": "score mark evaluation",
        "lesson": "lecture module unit",
        "study": "learn review prepare",
        "notes": "summary transcript record",
    }
    
    query_lower = query.lower()
    for term, synonyms in expansions.items():
        if term in query_lower:
            expanded = f"{expanded} {synonyms}"
    
    return expanded


@router.post(
    "",
    response_model=SearchResponse,
    summary="Semantic search across documents",
)
async def search_documents(
    body: SearchRequest,
    current_user: CurrentUser,
    db: Annotated[DBSession, Depends(get_db)],
    _: Annotated[None, Depends(_rate_limit_search)],
) -> SearchResponse:
    """
    Perform semantic search across documents with query expansion, pagination, and logging.
    
    Returns top-5 relevant chunks with scores and original document info.
    """
    # Log the search query for analytics
    logger.info(
        "Search request: user=%s query='%s' class_id=%s document_id=%s page=%d",
        current_user.email, body.query[:100], body.class_id, body.document_id, body.page
    )
    
    # Apply query expansion if enabled
    search_query = body.query
    expanded_query = None
    if body.expand_query:
        expanded_query = _expand_query(body.query)
        search_query = expanded_query
        logger.debug("Query expanded: '%s' -> '%s'", body.query[:50], expanded_query[:100])
    
    try:
        # Perform semantic search
        results = semantic_search(
            query=search_query,
            class_id=body.class_id,
            document_id=body.document_id,
            limit=body.limit * body.page,  # Get enough results for pagination
            score_threshold=body.score_threshold,
        )
    except Exception as exc:
        logger.error("Search failed: user=%s error=%s", current_user.email, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed. Please try again later.",
        ) from exc
    
    # Get original document info for each result
    document_ids = list(set([r.get("document_id") for r in results if r.get("document_id")]))
    documents_map = {}
    
    if document_ids:
        docs = db.query(Document).filter(Document.id.in_(document_ids)).all()
        documents_map = {d.id: d for d in docs}
    
    # Format results with document info
    formatted_results = []
    for r in results:
        doc_id = r.get("document_id")
        doc = documents_map.get(doc_id) if doc_id else None
        
        if doc:
            doc_info = SearchResultDocumentInfo(
                id=doc.id,
                filename=doc.filename,
                file_type=doc.file_type,
                status=doc.status,
                class_id=str(doc.class_id) if doc.class_id else None,
            )
        else:
            # Fallback if document not found
            doc_info = SearchResultDocumentInfo(
                id=doc_id or 0,
                filename="Unknown",
                file_type="pdf",
                status="ready",
                class_id=body.class_id,
            )
        
        formatted_results.append(SearchResult(
            id=str(r.get("id", "")),
            score=r.get("score", 0.0),
            chunk_text=r.get("chunk_text", ""),
            chunk_index=r.get("chunk_index"),
            metadata=r.get("metadata"),
            document=doc_info,
        ))
    
    # Apply pagination
    total = len(formatted_results)
    start_idx = (body.page - 1) * body.page_size
    end_idx = start_idx + body.page_size
    paginated_results = formatted_results[start_idx:end_idx]
    
    total_pages = math.ceil(total / body.page_size) if total > 0 else 0
    
    # Determine collection name
    collection = _collection_name(class_id=body.class_id, document_id=body.document_id)
    
    # Log search results for analytics
    logger.info(
        "Search completed: user=%s total_results=%d page=%d/%d",
        current_user.email, total, body.page, total_pages
    )
    
    return SearchResponse(
        query=body.query,
        expanded_query=expanded_query if body.expand_query else None,
        results=paginated_results,
        total=total,
        page=body.page,
        page_size=body.page_size,
        total_pages=total_pages,
        collection=collection,
    )


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
    _: Annotated[None, Depends(_rate_limit_search)],
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
    _: Annotated[None, Depends(_rate_limit_search)],
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
