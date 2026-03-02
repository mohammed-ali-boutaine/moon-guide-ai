"""
tests/test_embedding_service.py

Unit tests for the dual-provider embedding service.
Covers Sentence Transformers, Mistral, caching, batch processing,
rate-limit retries, token tracking, and error handling.
"""
import json
import time
import pytest
from unittest.mock import patch, MagicMock, PropertyMock

from app.services.embedding_service import (
    embed_texts,
    embed_query,
    get_embedding_dimension,
    get_active_provider_info,
    get_token_usage,
    reset_token_usage,
    _cache_key,
    _get_cached_embeddings,
    _set_cached_embeddings,
    _embed_texts_sentence_transformers,
    _embed_texts_mistral,
    _embed_batch_mistral,
)


# ── Fixtures ─────────────────────────────────────────────────────────────────

FAKE_DIM = 4
FAKE_VECTOR = [0.1, 0.2, 0.3, 0.4]


@pytest.fixture(autouse=True)
def _reset_tracking():
    """Reset token usage counters before each test."""
    reset_token_usage()
    yield
    reset_token_usage()


@pytest.fixture
def disable_cache(monkeypatch):
    """Disable embedding cache for isolated tests."""
    monkeypatch.setattr("app.services.embedding_service.settings.EMBEDDING_CACHE_ENABLED", False)


@pytest.fixture
def enable_cache(monkeypatch):
    """Enable embedding cache."""
    monkeypatch.setattr("app.services.embedding_service.settings.EMBEDDING_CACHE_ENABLED", True)


# ══════════════════════════════════════════════════════════════════════════════
#  Provider info & configuration
# ══════════════════════════════════════════════════════════════════════════════


class TestProviderInfo:
    def test_sentence_transformers_info(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "sentence-transformers",
        )
        info = get_active_provider_info()
        assert info["provider"] == "sentence-transformers"
        assert info["model"] == "all-MiniLM-L6-v2"
        assert "dimension" in info

    def test_mistral_info(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "mistral",
        )
        info = get_active_provider_info()
        assert info["provider"] == "mistral"
        assert info["model"] == "mistral-embed"
        assert info["dimension"] == 1024
        assert "batch_size" in info
        assert "rate_limit_rpm" in info


# ══════════════════════════════════════════════════════════════════════════════
#  Token usage tracking
# ══════════════════════════════════════════════════════════════════════════════


class TestTokenUsage:
    def test_initial_state(self):
        usage = get_token_usage()
        assert usage["total_tokens"] == 0
        assert usage["total_requests"] == 0

    def test_reset(self):
        from app.services.embedding_service import _token_usage

        _token_usage["total_tokens"] = 999
        reset_token_usage()
        assert get_token_usage()["total_tokens"] == 0


# ══════════════════════════════════════════════════════════════════════════════
#  Cache helpers
# ══════════════════════════════════════════════════════════════════════════════


class TestCacheKey:
    def test_deterministic(self):
        k1 = _cache_key("hello world")
        k2 = _cache_key("hello world")
        assert k1 == k2

    def test_different_texts(self):
        k1 = _cache_key("hello")
        k2 = _cache_key("world")
        assert k1 != k2

    def test_includes_provider(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "sentence-transformers",
        )
        k_st = _cache_key("test")

        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "mistral",
        )
        k_mi = _cache_key("test")

        assert k_st != k_mi


class TestCacheLookup:
    def test_cache_disabled_returns_all_misses(self, disable_cache):
        cached, misses = _get_cached_embeddings(["a", "b", "c"])
        assert cached == [None, None, None]
        assert misses == [0, 1, 2]

    @patch("app.services.embedding_service.redis_client")
    def test_cache_hit(self, mock_redis, enable_cache):
        vec_json = json.dumps(FAKE_VECTOR)
        mock_redis.mget.return_value = [vec_json, None]

        cached, misses = _get_cached_embeddings(["hit text", "miss text"])
        assert cached[0] == FAKE_VECTOR
        assert cached[1] is None
        assert misses == [1]

    @patch("app.services.embedding_service.redis_client")
    def test_cache_all_hits(self, mock_redis, enable_cache):
        vec_json = json.dumps(FAKE_VECTOR)
        mock_redis.mget.return_value = [vec_json, vec_json]

        cached, misses = _get_cached_embeddings(["a", "b"])
        assert len(misses) == 0
        assert all(v == FAKE_VECTOR for v in cached)

    @patch("app.services.embedding_service.redis_client")
    def test_cache_redis_error_fallback(self, mock_redis, enable_cache):
        mock_redis.mget.side_effect = ConnectionError("Redis down")

        cached, misses = _get_cached_embeddings(["a", "b"])
        assert misses == [0, 1]


class TestCacheWrite:
    def test_cache_disabled_skips(self, disable_cache):
        # Should not raise even without redis
        _set_cached_embeddings(["a"], [FAKE_VECTOR])

    @patch("app.services.embedding_service.redis_client")
    def test_cache_write(self, mock_redis, enable_cache):
        mock_pipe = MagicMock()
        mock_redis.pipeline.return_value = mock_pipe

        _set_cached_embeddings(["hello", "world"], [FAKE_VECTOR, FAKE_VECTOR])

        assert mock_pipe.setex.call_count == 2
        mock_pipe.execute.assert_called_once()


# ══════════════════════════════════════════════════════════════════════════════
#  Sentence Transformers provider
# ══════════════════════════════════════════════════════════════════════════════


class TestSentenceTransformers:
    @patch("app.services.embedding_service._get_st_model")
    def test_embed_texts(self, mock_get_model, disable_cache, monkeypatch):
        import numpy as np

        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "sentence-transformers",
        )
        mock_model = MagicMock()
        mock_model.encode.return_value = np.array([FAKE_VECTOR, FAKE_VECTOR])
        mock_get_model.return_value = mock_model

        result = _embed_texts_sentence_transformers(["hello", "world"])
        assert len(result) == 2
        assert result[0] == FAKE_VECTOR

        mock_model.encode.assert_called_once()
        call_kwargs = mock_model.encode.call_args
        assert call_kwargs.kwargs["normalize_embeddings"] is True

    @patch("app.services.embedding_service._get_st_model")
    def test_tracks_token_usage(self, mock_get_model, disable_cache):
        import numpy as np

        mock_model = MagicMock()
        mock_model.encode.return_value = np.array([FAKE_VECTOR])
        mock_get_model.return_value = mock_model

        _embed_texts_sentence_transformers(["hello world test"])
        usage = get_token_usage()
        assert usage["total_requests"] == 1
        assert usage["total_tokens"] > 0
        assert usage["provider"] == "sentence-transformers"


# ══════════════════════════════════════════════════════════════════════════════
#  Mistral provider
# ══════════════════════════════════════════════════════════════════════════════


class TestMistralEmbedding:
    def _mock_mistral_response(self, vectors):
        """Create a mock Mistral API response."""
        response = MagicMock()
        response.data = [
            MagicMock(index=i, embedding=vec)
            for i, vec in enumerate(vectors)
        ]
        usage = MagicMock()
        usage.total_tokens = len(vectors) * 10  # ~10 tokens per text
        response.usage = usage
        return response

    @patch("app.services.embedding_service._get_mistral_client")
    def test_embed_single_batch(self, mock_get_client, disable_cache, monkeypatch):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "mistral",
        )
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.embeddings.create.return_value = self._mock_mistral_response(
            [FAKE_VECTOR, FAKE_VECTOR]
        )

        result = _embed_batch_mistral(["hello", "world"])
        assert len(result) == 2
        assert result[0] == FAKE_VECTOR

    @patch("app.services.embedding_service._get_mistral_client")
    def test_embed_tracks_tokens(self, mock_get_client, disable_cache, monkeypatch):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "mistral",
        )
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.embeddings.create.return_value = self._mock_mistral_response(
            [FAKE_VECTOR]
        )

        _embed_batch_mistral(["test text"])
        usage = get_token_usage()
        assert usage["total_tokens"] == 10
        assert usage["provider"] == "mistral"

    @patch("app.services.embedding_service.time.sleep")
    @patch("app.services.embedding_service._get_mistral_client")
    def test_rate_limit_retry(self, mock_get_client, mock_sleep, disable_cache):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # First call: rate limit error, second call: success
        mock_client.embeddings.create.side_effect = [
            Exception("429 Too Many Requests"),
            self._mock_mistral_response([FAKE_VECTOR]),
        ]

        result = _embed_batch_mistral(["test"], max_retries=3)
        assert len(result) == 1
        mock_sleep.assert_called_once()  # slept once for backoff

    @patch("app.services.embedding_service._get_mistral_client")
    def test_non_retryable_error_raises(self, mock_get_client, disable_cache):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.embeddings.create.side_effect = Exception("401 Unauthorized")

        with pytest.raises(Exception, match="401"):
            _embed_batch_mistral(["test"], max_retries=2)

    @patch("app.services.embedding_service.time.sleep")
    @patch("app.services.embedding_service._get_mistral_client")
    def test_max_retries_exhausted(self, mock_get_client, mock_sleep, disable_cache):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.embeddings.create.side_effect = Exception("429 Rate Limit")

        with pytest.raises(Exception, match="429"):
            _embed_batch_mistral(["test"], max_retries=2)

    @patch("app.services.embedding_service._embed_batch_mistral")
    def test_multi_batch_processing(self, mock_batch, disable_cache, monkeypatch):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.MISTRAL_EMBEDDING_BATCH_SIZE", 2
        )
        monkeypatch.setattr(
            "app.services.embedding_service.settings.MISTRAL_RATE_LIMIT_RPM", 600
        )

        mock_batch.return_value = [FAKE_VECTOR, FAKE_VECTOR]

        texts = ["a", "b", "c", "d"]
        result = _embed_texts_mistral(texts)

        assert len(result) == 4
        assert mock_batch.call_count == 2  # 4 texts / batch_size 2

    @patch("app.services.embedding_service._embed_batch_mistral")
    def test_batch_respects_ordering(self, mock_batch, disable_cache, monkeypatch):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.MISTRAL_EMBEDDING_BATCH_SIZE", 2
        )
        monkeypatch.setattr(
            "app.services.embedding_service.settings.MISTRAL_RATE_LIMIT_RPM", 600
        )

        vec_a = [1.0, 0.0, 0.0, 0.0]
        vec_b = [0.0, 1.0, 0.0, 0.0]
        vec_c = [0.0, 0.0, 1.0, 0.0]
        mock_batch.side_effect = [[vec_a, vec_b], [vec_c]]

        result = _embed_texts_mistral(["a", "b", "c"])
        assert result == [vec_a, vec_b, vec_c]


# ══════════════════════════════════════════════════════════════════════════════
#  Public API: embed_texts (provider routing + cache integration)
# ══════════════════════════════════════════════════════════════════════════════


class TestEmbedTextsPublicAPI:
    def test_empty_input(self, disable_cache):
        assert embed_texts([]) == []

    @patch("app.services.embedding_service._embed_texts_sentence_transformers")
    def test_routes_to_sentence_transformers(
        self, mock_st, disable_cache, monkeypatch
    ):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "sentence-transformers",
        )
        mock_st.return_value = [FAKE_VECTOR]

        result = embed_texts(["hello"])
        assert result == [FAKE_VECTOR]
        mock_st.assert_called_once()

    @patch("app.services.embedding_service._embed_texts_mistral")
    def test_routes_to_mistral(self, mock_mistral, disable_cache, monkeypatch):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "mistral",
        )
        mock_mistral.return_value = [FAKE_VECTOR]

        result = embed_texts(["hello"])
        assert result == [FAKE_VECTOR]
        mock_mistral.assert_called_once()

    def test_unknown_provider_raises(self, disable_cache, monkeypatch):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "openai",
        )
        with pytest.raises(ValueError, match="Unknown EMBEDDING_PROVIDER"):
            embed_texts(["hello"])

    @patch("app.services.embedding_service._set_cached_embeddings")
    @patch("app.services.embedding_service._get_cached_embeddings")
    @patch("app.services.embedding_service._embed_texts_sentence_transformers")
    def test_uses_cache_hits(
        self, mock_st, mock_cache_get, mock_cache_set, monkeypatch
    ):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "sentence-transformers",
        )
        # Two texts, one cached, one miss
        mock_cache_get.return_value = ([FAKE_VECTOR, None], [1])
        mock_st.return_value = [FAKE_VECTOR]

        result = embed_texts(["cached", "not cached"])
        assert len(result) == 2
        # Only 1 text should be sent to the model
        mock_st.assert_called_once_with(["not cached"], 64)
        mock_cache_set.assert_called_once()

    @patch("app.services.embedding_service._set_cached_embeddings")
    @patch("app.services.embedding_service._get_cached_embeddings")
    @patch("app.services.embedding_service._embed_texts_sentence_transformers")
    def test_all_cached_skips_computation(
        self, mock_st, mock_cache_get, mock_cache_set, monkeypatch
    ):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "sentence-transformers",
        )
        mock_cache_get.return_value = ([FAKE_VECTOR, FAKE_VECTOR], [])

        result = embed_texts(["a", "b"])
        assert len(result) == 2
        mock_st.assert_not_called()
        mock_cache_set.assert_not_called()


# ══════════════════════════════════════════════════════════════════════════════
#  embed_query
# ══════════════════════════════════════════════════════════════════════════════


class TestEmbedQuery:
    @patch("app.services.embedding_service.embed_texts")
    def test_returns_single_vector(self, mock_embed):
        mock_embed.return_value = [FAKE_VECTOR]
        result = embed_query("test query")
        assert result == FAKE_VECTOR

    @patch("app.services.embedding_service.embed_texts")
    def test_empty_result_raises(self, mock_embed):
        mock_embed.return_value = []
        with pytest.raises(ValueError, match="Failed to encode"):
            embed_query("test")


# ══════════════════════════════════════════════════════════════════════════════
#  get_embedding_dimension
# ══════════════════════════════════════════════════════════════════════════════


class TestGetEmbeddingDimension:
    def test_mistral_dimension(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "mistral",
        )
        monkeypatch.setattr(
            "app.services.embedding_service.settings.MISTRAL_EMBEDDING_DIMENSION",
            1024,
        )
        assert get_embedding_dimension() == 1024

    @patch("app.services.embedding_service._get_st_model")
    def test_sentence_transformers_dimension(self, mock_get_model, monkeypatch):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "sentence-transformers",
        )
        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        mock_get_model.return_value = mock_model

        assert get_embedding_dimension() == 384


# ══════════════════════════════════════════════════════════════════════════════
#  Performance / batch size tests
# ══════════════════════════════════════════════════════════════════════════════


class TestPerformance:
    @patch("app.services.embedding_service._embed_batch_mistral")
    def test_large_batch_splits_correctly(self, mock_batch, disable_cache, monkeypatch):
        """100 texts with batch_size=25 should produce 4 API calls."""
        monkeypatch.setattr(
            "app.services.embedding_service.settings.MISTRAL_EMBEDDING_BATCH_SIZE", 25
        )
        monkeypatch.setattr(
            "app.services.embedding_service.settings.MISTRAL_RATE_LIMIT_RPM", 600
        )

        mock_batch.return_value = [FAKE_VECTOR] * 25

        texts = [f"text_{i}" for i in range(100)]
        result = _embed_texts_mistral(texts)

        assert len(result) == 100
        assert mock_batch.call_count == 4

    @patch("app.services.embedding_service._embed_batch_mistral")
    def test_uneven_batch_handles_remainder(self, mock_batch, disable_cache, monkeypatch):
        """7 texts with batch_size=3 → 3 calls (3+3+1)."""
        monkeypatch.setattr(
            "app.services.embedding_service.settings.MISTRAL_EMBEDDING_BATCH_SIZE", 3
        )
        monkeypatch.setattr(
            "app.services.embedding_service.settings.MISTRAL_RATE_LIMIT_RPM", 600
        )

        def side_effect(batch, **kwargs):
            return [FAKE_VECTOR] * len(batch)

        mock_batch.side_effect = side_effect

        result = _embed_texts_mistral([f"t{i}" for i in range(7)])
        assert len(result) == 7
        assert mock_batch.call_count == 3

    @patch("app.services.embedding_service._embed_texts_sentence_transformers")
    def test_batch_size_passed_to_st(self, mock_st, disable_cache, monkeypatch):
        monkeypatch.setattr(
            "app.services.embedding_service.settings.EMBEDDING_PROVIDER",
            "sentence-transformers",
        )
        mock_st.return_value = [FAKE_VECTOR]

        embed_texts(["test"], batch_size=128)
        mock_st.assert_called_once_with(["test"], 128)


# ══════════════════════════════════════════════════════════════════════════════
#  Mistral client initialisation
# ══════════════════════════════════════════════════════════════════════════════


class TestMistralClientInit:
    def test_missing_api_key_raises(self, monkeypatch):
        """Initialising Mistral without an API key must raise RuntimeError."""
        import app.services.embedding_service as mod

        monkeypatch.setattr(mod, "_mistral_client", None)
        monkeypatch.setattr(
            "app.services.embedding_service.settings.MISTRAL_API_KEY", ""
        )

        from app.services.embedding_service import _get_mistral_client

        with pytest.raises(RuntimeError, match="MISTRAL_API_KEY is required"):
            _get_mistral_client()

    @patch("app.services.embedding_service.Mistral", create=True)
    def test_client_created_with_key(self, mock_mistral_cls, monkeypatch):
        import app.services.embedding_service as mod

        monkeypatch.setattr(mod, "_mistral_client", None)
        monkeypatch.setattr(
            "app.services.embedding_service.settings.MISTRAL_API_KEY",
            "test-key-123",
        )

        mock_mistral_cls.return_value = MagicMock()

        with patch("app.services.embedding_service.Mistral", mock_mistral_cls):
            from app.services.embedding_service import _get_mistral_client

            client = _get_mistral_client()
            assert client is not None
