"""Add quiz generation: quiz_jobs table, alter quizzes (nullable class_id, add document_id, difficulty)

Revision ID: 0009_add_quiz_generation
Revises: 0008_add_document_concepts
Create Date: 2026-03-14 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0009_add_quiz_generation"
down_revision: Union[str, Sequence[str], None] = "0008_add_document_concepts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

jobstatus_enum = sa.Enum("pending", "processing", "completed", "failed", name="jobstatus")


def upgrade() -> None:
    # ── Alter quizzes table ───────────────────────────────────────────────────

    # Make class_id nullable (was NOT NULL)
    op.alter_column("quizzes", "class_id", nullable=True)

    # Add document_id FK (nullable)
    op.add_column(
        "quizzes",
        sa.Column(
            "document_id",
            sa.Integer(),
            sa.ForeignKey("documents.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_quizzes_document_id", "quizzes", ["document_id"], unique=False)

    # Add difficulty column (nullable string)
    op.add_column(
        "quizzes",
        sa.Column("difficulty", sa.String(length=10), nullable=True),
    )

    # ── Create quiz_jobs table ────────────────────────────────────────────────

    jobstatus_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "quiz_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "document_id",
            sa.Integer(),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "quiz_id",
            sa.Integer(),
            sa.ForeignKey("quizzes.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "processing", "completed", "failed", name="jobstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("num_questions", sa.Integer(), nullable=False),
        sa.Column("difficulty", sa.String(length=10), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("total_tokens", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_quiz_jobs_user_id", "quiz_jobs", ["user_id"], unique=False)
    op.create_index("ix_quiz_jobs_document_id", "quiz_jobs", ["document_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_quiz_jobs_document_id", table_name="quiz_jobs")
    op.drop_index("ix_quiz_jobs_user_id", table_name="quiz_jobs")
    op.drop_table("quiz_jobs")
    jobstatus_enum.drop(op.get_bind(), checkfirst=True)

    op.drop_index("ix_quizzes_document_id", table_name="quizzes")
    op.drop_column("quizzes", "document_id")
    op.drop_column("quizzes", "difficulty")
    op.alter_column("quizzes", "class_id", nullable=False)
