# """
# tests/test_search_api.py

# Integration tests for the semantic search API endpoints.
# """
# import pytest
# from unittest.mock import patch, MagicMock
# from fastapi.testclient import TestClient


# class TestSearchClassDocuments:
#     """Tests for POST /api/search/class/{class_id}"""

#     @patch("app.api.v1.routes.search.semantic_search")
#     def test_search_class_returns_results(
#         self, mock_search, client: TestClient, teacher_auth_headers, test_class
#     ):
#         mock_search.return_value = [
#             {
#                 "id": "point-1",
#                 "score": 0.92,
#                 "chunk_text": "Python is a programming language",
#                 "document_id": 1,
#                 "class_id": str(test_class.id),
#                 "chunk_index": 0,
#                 "metadata": "{}",
#             }
#         ]

#         response = client.post(
#             f"/api/search/class/{test_class.id}",
#             json={"query": "What is Python?", "limit": 5},
#             headers=teacher_auth_headers,
#         )

#         assert response.status_code == 200
#         data = response.json()
#         assert data["total"] == 1
#         assert data["results"][0]["score"] == 0.92

#     @patch("app.api.v1.routes.search.semantic_search")
#     def test_search_class_empty_results(
#         self, mock_search, client: TestClient, teacher_auth_headers, test_class
#     ):
#         mock_search.return_value = []

#         response = client.post(
#             f"/api/search/class/{test_class.id}",
#             json={"query": "nonexistent topic"},
#             headers=teacher_auth_headers,
#         )

#         assert response.status_code == 200
#         data = response.json()
#         assert data["total"] == 0
#         assert data["results"] == []

#     def test_search_requires_auth(self, client: TestClient, test_class):
#         response = client.post(
#             f"/api/search/class/{test_class.id}",
#             json={"query": "test"},
#         )
#         assert response.status_code == 401

#     def test_search_validates_query(self, client: TestClient, teacher_auth_headers, test_class):
#         response = client.post(
#             f"/api/search/class/{test_class.id}",
#             json={"query": "", "limit": 5},
#             headers=teacher_auth_headers,
#         )
#         assert response.status_code == 422  # Validation error


# class TestSearchDocument:
#     """Tests for POST /api/search/document/{document_id}"""

#     @patch("app.api.v1.routes.search.semantic_search")
#     def test_search_document_returns_results(
#         self, mock_search, client: TestClient, teacher_auth_headers
#     ):
#         mock_search.return_value = [
#             {
#                 "id": "point-2",
#                 "score": 0.88,
#                 "chunk_text": "Machine learning basics",
#                 "document_id": 42,
#                 "class_id": None,
#                 "chunk_index": 3,
#                 "metadata": "{}",
#             }
#         ]

#         response = client.post(
#             "/api/search/document/42",
#             json={"query": "machine learning"},
#             headers=teacher_auth_headers,
#         )

#         assert response.status_code == 200
#         data = response.json()
#         assert data["total"] == 1


# class TestCollections:
#     """Tests for GET /api/search/collections*"""

#     @patch("app.api.v1.routes.search.list_collections")
#     def test_list_collections(self, mock_list, client: TestClient, teacher_auth_headers):
#         mock_list.return_value = ["moonguide_class_1", "moonguide_doc_42"]

#         response = client.get(
#             "/api/search/collections",
#             headers=teacher_auth_headers,
#         )

#         assert response.status_code == 200
#         data = response.json()
#         assert len(data) == 2

#     @patch("app.api.v1.routes.search.get_collection_info")
#     def test_get_collection_info(self, mock_info, client: TestClient, teacher_auth_headers):
#         mock_info.return_value = {
#             "name": "moonguide_class_1",
#             "vectors_count": 100,
#             "points_count": 100,
#             "status": "green",
#         }

#         response = client.get(
#             "/api/search/collections/moonguide_class_1/info",
#             headers=teacher_auth_headers,
#         )

#         assert response.status_code == 200
#         data = response.json()
#         assert data["name"] == "moonguide_class_1"
#         assert data["vectors_count"] == 100

#     @patch("app.api.v1.routes.search.get_collection_info")
#     def test_get_nonexistent_collection_404(self, mock_info, client: TestClient, teacher_auth_headers):
#         mock_info.return_value = None

#         response = client.get(
#             "/api/search/collections/nonexistent/info",
#             headers=teacher_auth_headers,
#         )

#         assert response.status_code == 404
