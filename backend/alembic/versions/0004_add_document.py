from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid

revision = "0004"
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
 
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "scope",
            sa.Enum("personal", "class", name="scopeenum"),
            nullable=False,
        ),
        sa.Column(
            "class_id",
            UUID(as_uuid=True),
            sa.ForeignKey("classes.id"),
            nullable=True,
        ),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("file_url", sa.String(512), nullable=False),
        sa.Column(
            "file_type",
            sa.Enum("pdf", "docx", "txt", "md", name="filetypeenum"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "processing", "ready", "rejected", name="statusenum"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("uploaded_by_id", sa.Integer(), nullable=False),
        sa.Column(
            "uploaded_by_role",
            sa.Enum("student", "teacher", name="roleenum"),
            nullable=False,
        ),
        sa.Column("approved_by_id", sa.Integer(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
    )

    # Indexes for common query patterns
    op.create_index("ix_documents_uploaded_by_id", "documents", ["uploaded_by_id"])
    op.create_index("ix_documents_class_id", "documents", ["class_id"])
    op.create_index("ix_documents_status", "documents", ["status"])
    op.create_index("ix_documents_scope", "documents", ["scope"])
    op.create_index("ix_documents_deleted_at", "documents", ["deleted_at"])


def downgrade() -> None:
    op.drop_table("documents")
    op.execute("DROP TYPE IF EXISTS scopeenum")
    op.execute("DROP TYPE IF EXISTS filetypeenum")
    op.execute("DROP TYPE IF EXISTS statusenum")
    op.execute("DROP TYPE IF EXISTS roleenum")