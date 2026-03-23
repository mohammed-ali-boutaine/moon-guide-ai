"""
tests/test_chat_api.py

Integration + unit tests for the Chat / RAG endpoints:
  POST   /api/chat/sessions
  GET    /api/chat/sessions
  GET    /api/chat/sessions/{session_id}
  POST   /api/chat/sessions/{session_id}/messages
  DELETE /api/chat/sessions/{session_id}

External dependencies (RAG pipeline, Redis) are mocked.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session as DBSession

from app.models.chat_message import ChatMessage, ChatRole
from app.models.chat_session import ChatSession
from app.services.rag_service import RAGResult


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fake_rag_result(answer: str = "Test answer.", had_context: bool = True) -> RAGResult:
    return RAGResult(
        answer=answer,
        sources=[{"document_id": 1, "document_filename": "notes.pdf", "chunk_index": 0, "score": 0.9}],
        retrieved_chunks=3,
        used_chunks=2,
        had_context=had_context,
        prompt_tokens=50,
        completion_tokens=20,
        total_tokens=70,
    )


def _make_session(db: DBSession, user_id: uuid.UUID, class_id=None) -> ChatSession:
    session = ChatSession(user_id=user_id, class_id=class_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_redis():
    """Patch the Redis client used for rate limiting."""
    with patch("app.api.v1.routes.chat.redis_client") as mock:
        mock.incr.return_value = 1
        mock.expire.return_value = True
        mock.ttl.return_value = 55
        yield mock


@pytest.fixture
def mock_rag():
    """Patch run_rag_pipeline to avoid real Gemini calls."""
    with patch("app.api.v1.routes.chat.run_rag_pipeline") as mock:
        mock.return_value = _fake_rag_result()
        yield mock


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/chat/sessions — Create session
# ══════════════════════════════════════════════════════════════════════════════

class TestCreateSession:
    def test_create_personal_session(self, client: TestClient, auth_headers, db_session: DBSession, test_user):
        response = client.post("/api/chat/sessions", json={}, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["class_id"] is None
        assert data["ended_at"] is None
        assert str(test_user.id) == data["user_id"]

    def test_create_class_session(self, client: TestClient, teacher_auth_headers, db_session: DBSession, test_class):
        response = client.post(
            "/api/chat/sessions",
            json={"class_id": str(test_class.id)},
            headers=teacher_auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["class_id"] == str(test_class.id)

    def test_create_session_unauthenticated(self, client: TestClient):
        response = client.post("/api/chat/sessions", json={})
        assert response.status_code == 401

    def test_create_session_persisted_in_db(self, client: TestClient, auth_headers, db_session: DBSession, test_user):
        before = db_session.query(ChatSession).filter(ChatSession.user_id == test_user.id).count()

        client.post("/api/chat/sessions", json={}, headers=auth_headers)

        after = db_session.query(ChatSession).filter(ChatSession.user_id == test_user.id).count()
        assert after == before + 1


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/chat/sessions — List sessions
# ══════════════════════════════════════════════════════════════════════════════

class TestListSessions:
    def test_list_returns_only_own_sessions(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user, teacher_user
    ):
        _make_session(db_session, test_user.id)
        _make_session(db_session, test_user.id)
        _make_session(db_session, teacher_user.id)  # another user

        response = client.get("/api/chat/sessions", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(s["user_id"] == str(test_user.id) for s in data)

    def test_list_excludes_ended_sessions(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user
    ):
        active = _make_session(db_session, test_user.id)
        ended = _make_session(db_session, test_user.id)
        ended.ended_at = datetime.now(timezone.utc)
        db_session.commit()

        response = client.get("/api/chat/sessions", headers=auth_headers)

        assert response.status_code == 200
        ids = [s["id"] for s in response.json()]
        assert str(active.id) in ids
        assert str(ended.id) not in ids

    def test_list_empty_for_new_user(self, client: TestClient, auth_headers):
        response = client.get("/api/chat/sessions", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == []

    def test_list_unauthenticated(self, client: TestClient):
        response = client.get("/api/chat/sessions")
        assert response.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/chat/sessions/{session_id} — Session detail
# ══════════════════════════════════════════════════════════════════════════════

class TestGetSession:
    def test_get_session_with_messages(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user
    ):
        session = _make_session(db_session, test_user.id)
        msg = ChatMessage(
            session_id=session.id,
            role=ChatRole.user.value,
            content="Hello",
        )
        db_session.add(msg)
        db_session.commit()

        response = client.get(f"/api/chat/sessions/{session.id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(session.id)
        assert len(data["messages"]) == 1
        assert data["messages"][0]["content"] == "Hello"

    def test_get_session_empty_messages(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user
    ):
        session = _make_session(db_session, test_user.id)

        response = client.get(f"/api/chat/sessions/{session.id}", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["messages"] == []

    def test_get_session_not_found(self, client: TestClient, auth_headers):
        response = client.get(f"/api/chat/sessions/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_get_session_other_user_is_404(
        self, client: TestClient, auth_headers, db_session: DBSession, teacher_user
    ):
        session = _make_session(db_session, teacher_user.id)

        response = client.get(f"/api/chat/sessions/{session.id}", headers=auth_headers)
        assert response.status_code == 404

    def test_get_ended_session_is_still_accessible(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user
    ):
        """GET session/{id} does not filter on ended_at — allows history review."""
        session = _make_session(db_session, test_user.id)
        session.ended_at = datetime.now(timezone.utc)
        db_session.commit()

        response = client.get(f"/api/chat/sessions/{session.id}", headers=auth_headers)
        assert response.status_code == 200


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/chat/sessions/{session_id}/messages — Send message
# ══════════════════════════════════════════════════════════════════════════════

class TestSendMessage:
    def test_send_message_returns_chat_response(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user, mock_redis, mock_rag
    ):
        session = _make_session(db_session, test_user.id)

        response = client.post(
            f"/api/chat/sessions/{session.id}/messages",
            json={"content": "What is photosynthesis?"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user_message"]["content"] == "What is photosynthesis?"
        assert data["assistant_message"]["content"] == "Test answer."
        assert data["had_context"] is True
        assert data["total_tokens"] == 70

    def test_send_message_persists_both_messages(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user, mock_redis, mock_rag
    ):
        session = _make_session(db_session, test_user.id)

        client.post(
            f"/api/chat/sessions/{session.id}/messages",
            json={"content": "Explain gravity."},
            headers=auth_headers,
        )

        db_session.expire_all()
        messages = (
            db_session.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at)
            .all()
        )
        assert len(messages) == 2
        assert messages[0].role == ChatRole.user.value
        assert messages[1].role == ChatRole.assistant.value

    def test_send_message_to_ended_session_returns_404(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user, mock_redis
    ):
        session = _make_session(db_session, test_user.id)
        session.ended_at = datetime.now(timezone.utc)
        db_session.commit()

        response = client.post(
            f"/api/chat/sessions/{session.id}/messages",
            json={"content": "hello"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_send_message_to_nonexistent_session(
        self, client: TestClient, auth_headers, mock_redis
    ):
        response = client.post(
            f"/api/chat/sessions/{uuid.uuid4()}/messages",
            json={"content": "hello"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_send_empty_content_rejected(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user, mock_redis
    ):
        session = _make_session(db_session, test_user.id)

        response = client.post(
            f"/api/chat/sessions/{session.id}/messages",
            json={"content": ""},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_rate_limit_exceeded(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user
    ):
        session = _make_session(db_session, test_user.id)

        with patch("app.api.v1.routes.chat.redis_client") as mock_redis:
            mock_redis.incr.return_value = 11  # over the 10-request limit
            mock_redis.expire.return_value = True
            mock_redis.ttl.return_value = 30

            response = client.post(
                f"/api/chat/sessions/{session.id}/messages",
                json={"content": "Am I rate limited?"},
                headers=auth_headers,
            )

        assert response.status_code == 429
        assert "Rate limit" in response.json()["detail"]

    def test_rag_timeout_returns_504(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user, mock_redis
    ):
        import asyncio
        session = _make_session(db_session, test_user.id)

        with patch("app.api.v1.routes.chat.run_rag_pipeline", side_effect=Exception("boom")):
            with patch("asyncio.wait_for", side_effect=asyncio.TimeoutError()):
                response = client.post(
                    f"/api/chat/sessions/{session.id}/messages",
                    json={"content": "slow question"},
                    headers=auth_headers,
                )

        assert response.status_code == 504

    def test_unauthenticated_send_rejected(self, client: TestClient):
        response = client.post(
            f"/api/chat/sessions/{uuid.uuid4()}/messages",
            json={"content": "hello"},
        )
        assert response.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# DELETE /api/chat/sessions/{session_id} — End session
# ══════════════════════════════════════════════════════════════════════════════

class TestEndSession:
    def test_end_session_returns_204(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user
    ):
        session = _make_session(db_session, test_user.id)

        response = client.delete(f"/api/chat/sessions/{session.id}", headers=auth_headers)
        assert response.status_code == 204
        assert response.content == b""

    def test_end_session_sets_ended_at(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user
    ):
        session = _make_session(db_session, test_user.id)
        assert session.ended_at is None

        client.delete(f"/api/chat/sessions/{session.id}", headers=auth_headers)

        db_session.expire(session)
        db_session.refresh(session)
        assert session.ended_at is not None

    def test_end_already_ended_session_returns_404(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user
    ):
        session = _make_session(db_session, test_user.id)
        session.ended_at = datetime.now(timezone.utc)
        db_session.commit()

        response = client.delete(f"/api/chat/sessions/{session.id}", headers=auth_headers)
        assert response.status_code == 404

    def test_end_nonexistent_session_returns_404(self, client: TestClient, auth_headers):
        response = client.delete(f"/api/chat/sessions/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_end_other_users_session_returns_404(
        self, client: TestClient, auth_headers, db_session: DBSession, teacher_user
    ):
        session = _make_session(db_session, teacher_user.id)

        response = client.delete(f"/api/chat/sessions/{session.id}", headers=auth_headers)
        assert response.status_code == 404

    def test_ended_session_no_longer_in_list(
        self, client: TestClient, auth_headers, db_session: DBSession, test_user
    ):
        session = _make_session(db_session, test_user.id)

        client.delete(f"/api/chat/sessions/{session.id}", headers=auth_headers)
        list_resp = client.get("/api/chat/sessions", headers=auth_headers)

        ids = [s["id"] for s in list_resp.json()]
        assert str(session.id) not in ids


# ══════════════════════════════════════════════════════════════════════════════
# Unit tests — helper functions
# ══════════════════════════════════════════════════════════════════════════════

class TestMessageToSchema:
    def test_converts_message_with_sources(self, db_session: DBSession, test_user):
        session = _make_session(db_session, test_user.id)
        msg = ChatMessage(
            session_id=session.id,
            role=ChatRole.assistant.value,
            content="Here is the answer.",
            sources_json=[{"document_id": 1, "document_filename": "file.pdf", "chunk_index": 2, "score": 0.88}],
        )
        db_session.add(msg)
        db_session.commit()
        db_session.refresh(msg)

        from app.api.v1.routes.chat import _message_to_schema
        result = _message_to_schema(msg)

        assert result.content == "Here is the answer."
        assert len(result.sources) == 1
        assert result.sources[0].score == 0.88

    def test_converts_message_without_sources(self, db_session: DBSession, test_user):
        session = _make_session(db_session, test_user.id)
        msg = ChatMessage(
            session_id=session.id,
            role=ChatRole.user.value,
            content="Question?",
            sources_json=None,
        )
        db_session.add(msg)
        db_session.commit()
        db_session.refresh(msg)

        from app.api.v1.routes.chat import _message_to_schema
        result = _message_to_schema(msg)

        assert result.sources == []


class TestGetSessionOr404:
    def test_returns_session_when_found(self, db_session: DBSession, test_user):
        session = _make_session(db_session, test_user.id)

        from app.api.v1.routes.chat import _get_session_or_404
        result = _get_session_or_404(session.id, test_user.id, db_session)

        assert result.id == session.id

    def test_raises_404_for_wrong_user(self, db_session: DBSession, test_user, teacher_user):
        session = _make_session(db_session, teacher_user.id)

        from app.api.v1.routes.chat import _get_session_or_404
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            _get_session_or_404(session.id, test_user.id, db_session)

        assert exc_info.value.status_code == 404

    def test_raises_404_for_ended_session(self, db_session: DBSession, test_user):
        session = _make_session(db_session, test_user.id)
        session.ended_at = datetime.now(timezone.utc)
        db_session.commit()

        from app.api.v1.routes.chat import _get_session_or_404
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            _get_session_or_404(session.id, test_user.id, db_session)

        assert exc_info.value.status_code == 404

    def test_raises_404_for_nonexistent_id(self, db_session: DBSession, test_user):
        from app.api.v1.routes.chat import _get_session_or_404
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            _get_session_or_404(uuid.uuid4(), test_user.id, db_session)

        assert exc_info.value.status_code == 404


class TestRateLimitChat:
    def test_allows_request_under_limit(self):
        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()

        with patch("app.api.v1.routes.chat.redis_client") as mock_redis:
            mock_redis.incr.return_value = 5
            mock_redis.expire.return_value = True

            from app.api.v1.routes.chat import _rate_limit_chat
            _rate_limit_chat(mock_user)  # should not raise

    def test_raises_429_when_limit_exceeded(self):
        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()

        with patch("app.api.v1.routes.chat.redis_client") as mock_redis:
            mock_redis.incr.return_value = 11
            mock_redis.expire.return_value = True
            mock_redis.ttl.return_value = 45

            from app.api.v1.routes.chat import _rate_limit_chat
            from fastapi import HTTPException
            with pytest.raises(HTTPException) as exc_info:
                _rate_limit_chat(mock_user)

            assert exc_info.value.status_code == 429

    def test_sets_expiry_on_first_request(self):
        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()

        with patch("app.api.v1.routes.chat.redis_client") as mock_redis:
            mock_redis.incr.return_value = 1
            mock_redis.expire.return_value = True

            from app.api.v1.routes.chat import _rate_limit_chat
            _rate_limit_chat(mock_user)

            mock_redis.expire.assert_called_once()

    def test_no_expiry_set_on_subsequent_requests(self):
        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()

        with patch("app.api.v1.routes.chat.redis_client") as mock_redis:
            mock_redis.incr.return_value = 3  # not first request
            mock_redis.expire.return_value = True

            from app.api.v1.routes.chat import _rate_limit_chat
            _rate_limit_chat(mock_user)

            mock_redis.expire.assert_not_called()
