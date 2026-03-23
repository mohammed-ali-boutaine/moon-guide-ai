"""Add document_chunks table

Revision ID: 0005
Revises: 0004
Create Date: 2026-02-28
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "document_chunks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "document_id",
            sa.Integer(),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chunk_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("qdrant_point_id", sa.String(64), nullable=True),
        sa.Column("embedded", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Indexes for common query patterns
    op.create_index("ix_document_chunks_document_id", "document_chunks", ["document_id"])
    op.create_index("ix_document_chunks_embedded", "document_chunks", ["embedded"])

    # Also add file_size_bytes column to documents table (added in this sprint)
    op.add_column("documents", sa.Column("file_size_bytes", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("documents", "file_size_bytes")
    op.drop_index("ix_document_chunks_embedded", table_name="document_chunks")
    op.drop_index("ix_document_chunks_document_id", table_name="document_chunks")
    op.drop_table("document_chunks")
