"""Add document_concepts table

Revision ID: 0008_add_document_concepts
Revises: 0007_add_quiz_tables
Create Date: 2026-03-14 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0008_add_document_concepts"
down_revision: Union[str, Sequence[str], None] = "0007_add_quiz_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

concept_source_enum = sa.Enum("ner", "textrank", "tfidf", name="conceptsource")


def upgrade() -> None:
    concept_source_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "document_concepts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("term", sa.String(length=255), nullable=False),
        sa.Column("score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column(
            "source",
            sa.Enum("ner", "textrank", "tfidf", name="conceptsource"),
            nullable=False,
        ),
        sa.Column("entity_type", sa.String(length=50), nullable=True),
        sa.Column("theme", sa.String(length=100), nullable=True),
        sa.Column("frequency", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
    )

    op.create_index(
        "ix_document_concepts_document_id",
        "document_concepts",
        ["document_id"],
        unique=False,
    )
    # Index for quiz generation queries (filter by theme + score)
    op.create_index(
        "ix_document_concepts_document_theme",
        "document_concepts",
        ["document_id", "theme"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_document_concepts_document_theme", table_name="document_concepts")
    op.drop_index("ix_document_concepts_document_id", table_name="document_concepts")
    op.drop_table("document_concepts")
    concept_source_enum.drop(op.get_bind(), checkfirst=True)
