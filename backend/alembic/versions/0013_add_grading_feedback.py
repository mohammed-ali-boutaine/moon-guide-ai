"""Add LLM grading and feedback tables

Adds:
  - llm_score, needs_review columns to student_answers
  - short_answer_grades table (LLM grading audit trail)
  - question_feedbacks table (per-question LLM feedback)

Revision ID: 0013_add_grading_feedback
Revises: 0012_add_question_points
Create Date: 2026-03-15 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0013_add_grading_feedback"
down_revision: Union[str, Sequence[str], None] = "0012_add_question_points"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Extend student_answers ─────────────────────────────────────────────────
    op.add_column(
        "student_answers",
        sa.Column("llm_score", sa.Float(), nullable=True),
    )
    op.add_column(
        "student_answers",
        sa.Column(
            "needs_review",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    # ── short_answer_grades ────────────────────────────────────────────────────
    op.create_table(
        "short_answer_grades",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "student_answer_id",
            sa.Integer(),
            sa.ForeignKey("student_answers.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
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
        sa.Column("expected_answer", sa.Text(), nullable=False),
        sa.Column("llm_score", sa.Float(), nullable=False),
        sa.Column("llm_reasoning", sa.Text(), nullable=False),
        sa.Column("bleu_score", sa.Float(), nullable=True),
        sa.Column("rouge_l_score", sa.Float(), nullable=True),
        sa.Column(
            "needs_review", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("teacher_score", sa.Float(), nullable=True),
        sa.Column("teacher_note", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "reviewed_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("model_used", sa.String(64), nullable=False),
        sa.Column("prompt_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "completion_tokens", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_short_answer_grades_student_answer_id",
        "short_answer_grades",
        ["student_answer_id"],
        unique=True,
    )
    op.create_index(
        "ix_short_answer_grades_attempt_id", "short_answer_grades", ["attempt_id"]
    )
    op.create_index(
        "ix_short_answer_grades_question_id", "short_answer_grades", ["question_id"]
    )

    # ── question_feedbacks ─────────────────────────────────────────────────────
    op.create_table(
        "question_feedbacks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
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
        sa.Column("feedback_text", sa.Text(), nullable=False),
        sa.Column(
            "key_points",
            postgresql.JSON(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("improvement_suggestion", sa.Text(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("prompt_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "completion_tokens", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("total_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "attempt_id", "question_id", name="uq_feedback_attempt_question"
        ),
    )
    op.create_index(
        "ix_question_feedbacks_attempt_id", "question_feedbacks", ["attempt_id"]
    )
    op.create_index(
        "ix_question_feedbacks_question_id", "question_feedbacks", ["question_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_question_feedbacks_question_id", "question_feedbacks")
    op.drop_index("ix_question_feedbacks_attempt_id", "question_feedbacks")
    op.drop_table("question_feedbacks")

    op.drop_index("ix_short_answer_grades_question_id", "short_answer_grades")
    op.drop_index("ix_short_answer_grades_attempt_id", "short_answer_grades")
    op.drop_index("ix_short_answer_grades_student_answer_id", "short_answer_grades")
    op.drop_table("short_answer_grades")

    op.drop_column("student_answers", "needs_review")
    op.drop_column("student_answers", "llm_score")
