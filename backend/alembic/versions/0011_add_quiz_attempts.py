"""Add quiz_attempts and student_answers tables

Revision ID: 0011_add_quiz_attempts
Revises: 0010_quiz_assign_notify
Create Date: 2026-03-15 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0011_add_quiz_attempts"
down_revision: Union[str, Sequence[str], None] = "0010_quiz_assign_notify"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

attemptstatus_enum = sa.Enum("started", "in_progress", "submitted", name="attemptstatus")


def upgrade() -> None:
    # ── quiz_attempts ──────────────────────────────────────────────────────────
    attemptstatus_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "quiz_attempts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "quiz_id",
            sa.Integer(),
            sa.ForeignKey("quizzes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            postgresql.ENUM("started", "in_progress", "submitted", name="attemptstatus", create_type=False),
            nullable=False,
            server_default="started",
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.UniqueConstraint(
            "quiz_id", "student_id", "started_at", name="uq_quiz_attempt_student"
        ),
    )
    op.create_index("ix_quiz_attempts_quiz_id", "quiz_attempts", ["quiz_id"])
    op.create_index("ix_quiz_attempts_student_id", "quiz_attempts", ["student_id"])
    op.create_index(
        "ix_quiz_attempts_quiz_student", "quiz_attempts", ["quiz_id", "student_id"]
    )

    # ── student_answers ────────────────────────────────────────────────────────
    op.create_table(
        "student_answers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "attempt_id",
            sa.Integer(),
            sa.ForeignKey("quiz_attempts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "question_id",
            sa.Integer(),
            sa.ForeignKey("questions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("answer_text", sa.Text(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.UniqueConstraint(
            "attempt_id", "question_id", name="uq_student_answer_attempt_question"
        ),
    )
    op.create_index("ix_student_answers_attempt_id", "student_answers", ["attempt_id"])
    op.create_index("ix_student_answers_question_id", "student_answers", ["question_id"])


def downgrade() -> None:
    op.drop_index("ix_student_answers_question_id", table_name="student_answers")
    op.drop_index("ix_student_answers_attempt_id", table_name="student_answers")
    op.drop_table("student_answers")

    op.drop_index("ix_quiz_attempts_quiz_student", table_name="quiz_attempts")
    op.drop_index("ix_quiz_attempts_student_id", table_name="quiz_attempts")
    op.drop_index("ix_quiz_attempts_quiz_id", table_name="quiz_attempts")
    op.drop_table("quiz_attempts")
    attemptstatus_enum.drop(op.get_bind(), checkfirst=True)