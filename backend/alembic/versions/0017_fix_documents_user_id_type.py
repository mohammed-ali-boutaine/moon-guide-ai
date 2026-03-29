"""Fix documents uploaded_by_id and approved_by_id from integer to uuid

Revision ID: 0017_fix_documents_user_id_type
Revises: 0016_add_class_image_urls
Create Date: 2026-03-28
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision: str = "0017_fix_documents_user_id_type"
down_revision: Union[str, Sequence[str], None] = "0016_add_class_image_urls"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Clear all document data — existing rows have integer user IDs that cannot
    # be converted to UUID, and uploads have been failing so the table is empty.
    op.execute("TRUNCATE TABLE documents CASCADE")

    # Fix uploaded_by_id: integer -> UUID NOT NULL
    op.drop_index("ix_documents_uploaded_by_id", table_name="documents")
    op.drop_column("documents", "uploaded_by_id")
    op.add_column(
        "documents",
        sa.Column("uploaded_by_id", UUID(as_uuid=True), nullable=False),
    )
    op.create_foreign_key(
        "documents_uploaded_by_id_fkey",
        "documents",
        "users",
        ["uploaded_by_id"],
        ["id"],
    )
    op.create_index("ix_documents_uploaded_by_id", "documents", ["uploaded_by_id"])

    # Fix approved_by_id: integer -> UUID nullable (no FK in model)
    op.drop_column("documents", "approved_by_id")
    op.add_column(
        "documents",
        sa.Column("approved_by_id", UUID(as_uuid=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("documents", "approved_by_id")
    op.add_column(
        "documents", sa.Column("approved_by_id", sa.Integer(), nullable=True)
    )

    op.drop_constraint("documents_uploaded_by_id_fkey", "documents", type_="foreignkey")
    op.drop_index("ix_documents_uploaded_by_id", table_name="documents")
    op.drop_column("documents", "uploaded_by_id")
    op.add_column(
        "documents",
        sa.Column(
            "uploaded_by_id", sa.Integer(), nullable=False, server_default="0"
        ),
    )
    op.execute("ALTER TABLE documents ALTER COLUMN uploaded_by_id DROP DEFAULT")
    op.create_index("ix_documents_uploaded_by_id", "documents", ["uploaded_by_id"])
