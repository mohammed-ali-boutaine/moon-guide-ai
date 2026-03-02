# """
# tests/test_qdrant_service.py

# Unit tests for Qdrant vector database operations and semantic search.
# Uses mocking to avoid requiring a running Qdrant instance.
# """
# import json
# import pytest
# from unittest.mock import patch, MagicMock

# from app.services.qdrant_service import (
#     _collection_name,
#     ensure_collection,
#     upsert_vectors,
#     search_vectors,
#     delete_collection,
#     get_collection_info,
#     list_collections,
# )


# # ══════════════════════════════════════════════════════════════════════════════
# #  Collection naming strategy
# # ══════════════════════════════════════════════════════════════════════════════


# class TestCollectionNaming:
#     def test_class_collection_name(self):
#         name = _collection_name(class_id="abc-123")
#         assert name == "moonguide_class_abc-123"

#     def test_document_collection_name(self):
#         name = _collection_name(document_id=42)
#         assert name == "moonguide_doc_42"

#     def test_global_collection_name(self):
#         name = _collection_name()
#         assert name == "moonguide_global"

#     def test_class_takes_priority_over_document(self):
#         name = _collection_name(class_id="cls-1", document_id=99)
#         assert name == "moonguide_class_cls-1"


# # ══════════════════════════════════════════════════════════════════════════════
# #  Qdrant operations (mocked)
# # ══════════════════════════════════════════════════════════════════════════════


# class TestEnsureCollection:
#     @patch("app.services.qdrant_service.get_qdrant_client")
#     def test_creates_collection_if_not_exists(self, mock_get_client):
#         mock_client = MagicMock()
#         mock_get_client.return_value = mock_client
#         # Simulate collection not existing
#         mock_client.get_collection.side_effect = Exception("Not found")

#         ensure_collection("test_collection", vector_size=384)

#         mock_client.create_collection.assert_called_once()
#         call_kwargs = mock_client.create_collection.call_args
#         assert call_kwargs.kwargs["collection_name"] == "test_collection"

#     @patch("app.services.qdrant_service.get_qdrant_client")
#     def test_skips_if_collection_exists(self, mock_get_client):
#         mock_client = MagicMock()
#         mock_get_client.return_value = mock_client
#         # Simulate collection exists
#         mock_client.get_collection.return_value = MagicMock()

#         ensure_collection("existing_collection")

#         mock_client.create_collection.assert_not_called()


# class TestUpsertVectors:
#     @patch("app.services.qdrant_service.ensure_collection")
#     @patch("app.services.qdrant_service.get_qdrant_client")
#     def test_upsert_batch(self, mock_get_client, mock_ensure):
#         mock_client = MagicMock()
#         mock_get_client.return_value = mock_client

#         ids = ["id-1", "id-2"]
#         vectors = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
#         payloads = [{"text": "chunk 1"}, {"text": "chunk 2"}]

#         upsert_vectors("test_col", ids, vectors, payloads)

#         mock_client.upsert.assert_called_once()
#         call_kwargs = mock_client.upsert.call_args
#         assert call_kwargs.kwargs["collection_name"] == "test_col"
#         assert len(call_kwargs.kwargs["points"]) == 2

#     @patch("app.services.qdrant_service.ensure_collection")
#     @patch("app.services.qdrant_service.get_qdrant_client")
#     def test_upsert_empty_list_does_nothing(self, mock_get_client, mock_ensure):
#         mock_client = MagicMock()
#         mock_get_client.return_value = mock_client

#         upsert_vectors("test_col", [], [], [])

#         mock_client.upsert.assert_not_called()


# class TestSearchVectors:
#     @patch("app.services.qdrant_service.get_qdrant_client")
#     def test_search_returns_results(self, mock_get_client):
#         mock_client = MagicMock()
#         mock_get_client.return_value = mock_client

#         mock_result = MagicMock()
#         mock_result.id = "point-1"
#         mock_result.score = 0.95
#         mock_result.payload = {"chunk_text": "relevant text"}
#         mock_client.search.return_value = [mock_result]

#         results = search_vectors("test_col", [0.1, 0.2], limit=5)

#         assert len(results) == 1
#         assert results[0].score == 0.95

#     @patch("app.services.qdrant_service.get_qdrant_client")
#     def test_search_empty_collection(self, mock_get_client):
#         mock_client = MagicMock()
#         mock_get_client.return_value = mock_client
#         mock_client.search.return_value = []

#         results = search_vectors("test_col", [0.1, 0.2], limit=5)
#         assert results == []


# class TestCollectionInfo:
#     @patch("app.services.qdrant_service.get_qdrant_client")
#     def test_get_existing_collection_info(self, mock_get_client):
#         mock_client = MagicMock()
#         mock_get_client.return_value = mock_client

#         mock_info = MagicMock()
#         mock_info.vectors_count = 100
#         mock_info.points_count = 100
#         mock_info.status.value = "green"
#         mock_client.get_collection.return_value = mock_info

#         info = get_collection_info("test_col")

#         assert info is not None
#         assert info["vectors_count"] == 100
#         assert info["status"] == "green"

#     @patch("app.services.qdrant_service.get_qdrant_client")
#     def test_get_nonexistent_collection_returns_none(self, mock_get_client):
#         mock_client = MagicMock()
#         mock_get_client.return_value = mock_client
#         mock_client.get_collection.side_effect = Exception("Not found")

#         info = get_collection_info("nonexistent")
#         assert info is None


# class TestListCollections:
#     @patch("app.services.qdrant_service.get_qdrant_client")
#     def test_list_collections(self, mock_get_client):
#         mock_client = MagicMock()
#         mock_get_client.return_value = mock_client

#         col1 = MagicMock()
#         col1.name = "moonguide_class_1"
#         col2 = MagicMock()
#         col2.name = "moonguide_doc_42"
#         mock_collections = MagicMock()
#         mock_collections.collections = [col1, col2]
#         mock_client.get_collections.return_value = mock_collections

#         result = list_collections()
#         assert result == ["moonguide_class_1", "moonguide_doc_42"]


# # ══════════════════════════════════════════════════════════════════════════════
# #  Embedding service (mocked)
# # ══════════════════════════════════════════════════════════════════════════════


# class TestEmbeddingService:
#     @patch("app.services.embedding_service._get_st_model")
#     def test_embed_texts(self, mock_get_model):
#         import numpy as np
#         from app.services.embedding_service import embed_texts

#         mock_model = MagicMock()
#         mock_model.encode.return_value = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]])
#         mock_get_model.return_value = mock_model

#         result = embed_texts(["text1", "text2"])

#         assert len(result) == 2
#         assert len(result[0]) == 3
#         assert result[0] == [0.1, 0.2, 0.3]

#     @patch("app.services.embedding_service._get_st_model")
#     def test_embed_empty_list(self, mock_get_model):
#         from app.services.embedding_service import embed_texts

#         result = embed_texts([])
#         assert result == []
#         mock_get_model.assert_not_called()

#     @patch("app.services.embedding_service._get_st_model")
#     def test_embed_query(self, mock_get_model):
#         import numpy as np
#         from app.services.embedding_service import embed_query

#         mock_model = MagicMock()
#         mock_model.encode.return_value = np.array([[0.1, 0.2, 0.3]])
#         mock_get_model.return_value = mock_model

#         result = embed_query("hello world")

#         assert len(result) == 3
#         assert result == [0.1, 0.2, 0.3]


# # ══════════════════════════════════════════════════════════════════════════════
# #  Vector service (higher-level, mocked)
# # ══════════════════════════════════════════════════════════════════════════════


# class TestVectorService:
#     @patch("app.services.vector_service.get_embedding_dimension")
#     @patch("app.services.vector_service.upsert_vectors")
#     @patch("app.services.vector_service.ensure_collection")
#     @patch("app.services.vector_service.embed_texts")
#     def test_store_chunk_embeddings(self, mock_embed, mock_ensure, mock_upsert, mock_dim):
#         from app.services.vector_service import store_chunk_embeddings

#         mock_embed.return_value = [[0.1, 0.2], [0.3, 0.4]]
#         mock_dim.return_value = 384

#         chunks = [
#             {"chunk_text": "chunk 1", "chunk_index": 0, "metadata": "{}"},
#             {"chunk_text": "chunk 2", "chunk_index": 1, "metadata": "{}"},
#         ]

#         count = store_chunk_embeddings(chunks, document_id=1, class_id="cls-1")

#         assert count == 2
#         mock_embed.assert_called_once_with(["chunk 1", "chunk 2"])
#         mock_upsert.assert_called_once()

#     @patch("app.services.vector_service.upsert_vectors")
#     @patch("app.services.vector_service.ensure_collection")
#     @patch("app.services.vector_service.embed_texts")
#     def test_store_empty_chunks_returns_zero(self, mock_embed, mock_ensure, mock_upsert):
#         from app.services.vector_service import store_chunk_embeddings

#         count = store_chunk_embeddings([], document_id=1)
#         assert count == 0
#         mock_embed.assert_not_called()

#     @patch("app.services.vector_service.search_vectors")
#     @patch("app.services.vector_service.get_collection_info")
#     @patch("app.services.vector_service.embed_query")
#     def test_semantic_search(self, mock_embed_q, mock_info, mock_search):
#         from app.services.vector_service import semantic_search

#         mock_embed_q.return_value = [0.1, 0.2, 0.3]
#         mock_info.return_value = {"name": "test", "vectors_count": 10}

#         mock_result = MagicMock()
#         mock_result.id = "point-1"
#         mock_result.score = 0.85
#         mock_result.payload = {
#             "chunk_text": "relevant content",
#             "document_id": 1,
#             "class_id": "cls-1",
#             "chunk_index": 0,
#             "metadata": "{}",
#         }
#         mock_search.return_value = [mock_result]

#         results = semantic_search("what is python?", class_id="cls-1")

#         assert len(results) == 1
#         assert results[0]["score"] == 0.85
#         assert results[0]["chunk_text"] == "relevant content"

#     @patch("app.services.vector_service.get_collection_info")
#     def test_semantic_search_missing_collection(self, mock_info):
#         from app.services.vector_service import semantic_search

#         mock_info.return_value = None

#         results = semantic_search("query", class_id="nonexistent")
#         assert results == []
