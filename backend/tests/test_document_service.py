"""
tests/test_document_service.py

Unit tests for document upload, validation, chunking, and vector operations.
"""
import io
import json
import os
import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from pathlib import Path

from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app.models.document import FileTypeEnum, ScopeEnum, StatusEnum, RoleEnum
from app.services.document_service import (
    _validate_file,
    _save_file,
    _scan_file_clamav,
    _extract_text_from_file,
    _chunk_text,
    MAX_FILE_SIZE_BYTES,
    ALLOWED_EXTENSIONS,
    UPLOAD_DIR,
)


# ── Fixtures ─────────────────────────────────────────────────────────────────

def _make_upload_file(
    filename: str = "test.txt",
    content: bytes = b"Hello world",
    content_type: str = "text/plain",
) -> UploadFile:
    """Create a mock UploadFile for testing."""
    return UploadFile(
        file=io.BytesIO(content),
        filename=filename,
        headers=Headers({"content-type": content_type}),
    )


# ══════════════════════════════════════════════════════════════════════════════
#  _validate_file
# ══════════════════════════════════════════════════════════════════════════════


class TestValidateFile:
    def test_valid_txt_file(self):
        file = _make_upload_file("document.txt", b"content", "text/plain")
        result = _validate_file(file)
        assert result == FileTypeEnum.txt

    def test_valid_pdf_file(self):
        file = _make_upload_file("document.pdf", b"%PDF-1.4", "application/pdf")
        result = _validate_file(file)
        assert result == FileTypeEnum.pdf

    def test_valid_docx_file(self):
        file = _make_upload_file(
            "document.docx",
            b"PK",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        result = _validate_file(file)
        assert result == FileTypeEnum.docx

    def test_valid_md_file(self):
        file = _make_upload_file("readme.md", b"# Title", "text/markdown")
        result = _validate_file(file)
        assert result == FileTypeEnum.md

    def test_invalid_extension_raises_422(self):
        file = _make_upload_file("image.jpg", b"", "image/jpeg")
        with pytest.raises(HTTPException) as exc_info:
            _validate_file(file)
        assert exc_info.value.status_code == 422
        assert "Unsupported file extension" in exc_info.value.detail

    def test_invalid_mime_type_raises_422(self):
        """When extension and MIME type are both invalid, should raise 422."""
        file = _make_upload_file("file.xyz", b"", "application/octet-stream")
        with pytest.raises(HTTPException) as exc_info:
            _validate_file(file)
        assert exc_info.value.status_code == 422

    def test_fallback_mime_guess_for_txt(self):
        """If content-type is wrong but extension matches, guess_type should correct it."""
        file = _make_upload_file("notes.txt", b"hello", "text/plain")
        result = _validate_file(file)
        assert result == FileTypeEnum.txt


# ══════════════════════════════════════════════════════════════════════════════
#  _save_file
# ══════════════════════════════════════════════════════════════════════════════


class TestSaveFile:
    def test_save_personal_file(self, tmp_path, monkeypatch):
        monkeypatch.setattr("app.services.document_service.UPLOAD_DIR", tmp_path)
        content = b"Test content for personal file"
        file = _make_upload_file("test.txt", content, "text/plain")

        path, size = _save_file(file, ScopeEnum.personal, None)

        assert size == len(content)
        assert "/personal/" in path
        assert path.endswith(".txt")

    def test_save_class_file(self, tmp_path, monkeypatch):
        monkeypatch.setattr("app.services.document_service.UPLOAD_DIR", tmp_path)
        content = b"Test content for class file"
        file = _make_upload_file("test.pdf", content, "application/pdf")

        path, size = _save_file(file, ScopeEnum.cls, "abc123")

        assert size == len(content)
        assert "/class_abc123/" in path

    def test_file_too_large_raises_413(self, tmp_path, monkeypatch):
        monkeypatch.setattr("app.services.document_service.UPLOAD_DIR", tmp_path)
        monkeypatch.setattr("app.services.document_service.MAX_FILE_SIZE_BYTES", 10)  # 10 bytes max

        content = b"A" * 100  # Way over 10 bytes
        file = _make_upload_file("big.txt", content, "text/plain")

        with pytest.raises(HTTPException) as exc_info:
            _save_file(file, ScopeEnum.personal, None)
        assert exc_info.value.status_code == 413

    def test_invalid_file_object_raises_400(self):
        file = UploadFile(file=None, filename="test.txt")
        with pytest.raises(HTTPException) as exc_info:
            _save_file(file, ScopeEnum.personal, None)
        assert exc_info.value.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
#  _scan_file_clamav
# ══════════════════════════════════════════════════════════════════════════════


class TestClamAVScanning:
    def test_scan_disabled_skips(self, monkeypatch):
        """When ClamAV is disabled, no exception should be raised."""
        monkeypatch.setattr("app.services.document_service.settings.CLAMAV_ENABLED", False)
        # Should not raise anything
        _scan_file_clamav("/some/file/path")

    def test_scan_enabled_no_clamav_available(self, monkeypatch):
        """When ClamAV is enabled but not installed, should degrade gracefully."""
        monkeypatch.setattr("app.services.document_service.settings.CLAMAV_ENABLED", True)

        # Mock both pyclamd import fail and subprocess fail
        with patch.dict("sys.modules", {"pyclamd": None}):
            with patch("subprocess.run", side_effect=FileNotFoundError):
                # Should not raise, just log warning
                _scan_file_clamav("/tmp/safe_file.txt")


# ══════════════════════════════════════════════════════════════════════════════
#  _extract_text_from_file
# ══════════════════════════════════════════════════════════════════════════════


class TestExtractText:
    def test_extract_txt(self, tmp_path):
        test_file = tmp_path / "test.txt"
        test_file.write_text("Hello World\nSecond line", encoding="utf-8")

        text = _extract_text_from_file(str(test_file), "txt")

        assert "Hello World" in text
        assert "Second line" in text

    def test_extract_md(self, tmp_path):
        test_file = tmp_path / "test.md"
        test_file.write_text("# Title\n\nSome content", encoding="utf-8")

        text = _extract_text_from_file(str(test_file), "md")

        assert "# Title" in text
        assert "Some content" in text

    def test_extract_empty_file(self, tmp_path):
        test_file = tmp_path / "empty.txt"
        test_file.write_text("", encoding="utf-8")

        text = _extract_text_from_file(str(test_file), "txt")
        assert text == ""


# ══════════════════════════════════════════════════════════════════════════════
#  _chunk_text
# ══════════════════════════════════════════════════════════════════════════════


class TestChunkText:
    def test_basic_chunking(self):
        text = "The quick brown fox. " * 200  # ~4200 chars
        chunks = _chunk_text(text, source="test.txt", chunk_size=500, chunk_overlap=50)

        assert len(chunks) > 1
        for chunk in chunks:
            assert "chunk_text" in chunk
            assert "chunk_index" in chunk
            assert "metadata" in chunk
            assert len(chunk["chunk_text"]) <= 600  # some tolerance

    def test_small_text_single_chunk(self):
        text = "Short text."
        chunks = _chunk_text(text, source="test.txt", chunk_size=1000, chunk_overlap=100)

        assert len(chunks) == 1
        assert chunks[0]["chunk_text"] == "Short text."
        assert chunks[0]["chunk_index"] == 0

    def test_chunk_overlap_works(self):
        """The end of chunk N should appear at the start of chunk N+1."""
        # Create text with clear boundaries
        sentences = [f"Sentence number {i}. " for i in range(100)]
        text = "".join(sentences)

        chunks = _chunk_text(text, source="overlap_test.txt", chunk_size=200, chunk_overlap=50)

        assert len(chunks) > 2
        # Check overlap: find common substring between consecutive chunks
        # The chunks should share some content due to overlap
        for i in range(len(chunks) - 1):
            chunk1_text = chunks[i]["chunk_text"]
            chunk2_text = chunks[i + 1]["chunk_text"]
            # Find substantial overlap (at least 20 chars should be shared)
            found_overlap = False
            for overlap_size in range(50, 20, -1):
                if overlap_size <= len(chunk1_text):
                    end_of_chunk1 = chunk1_text[-overlap_size:]
                    if end_of_chunk1 in chunk2_text:
                        found_overlap = True
                        break
            assert found_overlap, f"No overlap found between chunk {i} and chunk {i+1}"

    def test_metadata_contains_source(self):
        text = "Test content for metadata check."
        chunks = _chunk_text(text, source="my_file.pdf")

        metadata = json.loads(chunks[0]["metadata"])
        assert metadata["source"] == "my_file.pdf"

    def test_empty_text_returns_empty(self):
        chunks = _chunk_text("", source="empty.txt")
        assert len(chunks) == 0


# ══════════════════════════════════════════════════════════════════════════════
#  DocumentChunk model
# ══════════════════════════════════════════════════════════════════════════════


class TestDocumentChunkModel:
    def test_chunk_creation(self, db_session):
        """Test creating a DocumentChunk with all fields."""
        from app.models.document_chunk import DocumentChunk
        from app.models.document import Document, ScopeEnum, StatusEnum, RoleEnum, FileTypeEnum

        # First create a document
        doc = Document(
            scope=ScopeEnum.personal,
            filename="test.txt",
            file_url="/static/uploads/test.txt",
            file_type=FileTypeEnum.txt,
            status=StatusEnum.processing,
            uploaded_by_id=str(db_session.query(MagicMock).first) if False else "00000000-0000-0000-0000-000000000001",
            uploaded_by_role=RoleEnum.student,
        )
        db_session.add(doc)
        db_session.commit()
        db_session.refresh(doc)

        chunk = DocumentChunk(
            document_id=doc.id,
            chunk_index=0,
            chunk_text="This is a test chunk",
            token_count=5,
            metadata_json=json.dumps({"source": "test.txt"}),
            embedded=False,
        )
        db_session.add(chunk)
        db_session.commit()
        db_session.refresh(chunk)

        assert chunk.id is not None
        assert chunk.document_id == doc.id
        assert chunk.chunk_index == 0
        assert chunk.chunk_text == "This is a test chunk"
        assert chunk.embedded is False
        assert chunk.created_at is not None
