"""Add quiz_assignments and notifications tables

Revision ID: 0010_quiz_assign_notify
Revises: 0009_add_quiz_generation
Create Date: 2026-03-15 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0010_quiz_assign_notify"
down_revision: Union[str, Sequence[str], None] = "0009_add_quiz_generation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

assignmentstatus_enum = sa.Enum("active", "inactive", name="assignmentstatus")


def upgrade() -> None:
    # ── quiz_assignments ──────────────────────────────────────────────────────
    assignmentstatus_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "quiz_assignments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "quiz_id",
            sa.Integer(),
            sa.ForeignKey("quizzes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "class_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("classes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "assigned_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=False,
        ),
        sa.Column(
            "status",
            postgresql.ENUM("active", "inactive", name="assignmentstatus", create_type=False),
            nullable=False,
            server_default="active",
        ),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("quiz_id", "class_id", name="uq_quiz_assignment_quiz_class"),
    )
    op.create_index("ix_quiz_assignments_quiz_id", "quiz_assignments", ["quiz_id"])
    op.create_index("ix_quiz_assignments_class_id", "quiz_assignments", ["class_id"])
    op.create_index(
        "ix_quiz_assignments_assigned_by_id", "quiz_assignments", ["assigned_by_id"]
    )

    # ── notifications ─────────────────────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=True),
        sa.Column(
            "is_read",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_type", "notifications", ["type"])


def downgrade() -> None:
    op.drop_index("ix_notifications_type", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")

    op.drop_index("ix_quiz_assignments_assigned_by_id", table_name="quiz_assignments")
    op.drop_index("ix_quiz_assignments_class_id", table_name="quiz_assignments")
    op.drop_index("ix_quiz_assignments_quiz_id", table_name="quiz_assignments")
    op.drop_table("quiz_assignments")
    assignmentstatus_enum.drop(op.get_bind(), checkfirst=True)