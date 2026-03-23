"""Add quizzes, questions, and answers tables

Revision ID: 0007_add_quiz_tables
Revises: 0006_add_chat_tables
Create Date: 2026-03-14 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007_add_quiz_tables"
down_revision: Union[str, Sequence[str], None] = "0006_add_chat_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

quizstatus_enum = sa.Enum("draft", "published", "archived", name="quizstatus")
questiontype_enum = sa.Enum("MCQ", "TrueFalse", "ShortAnswer", name="questiontype")


def upgrade() -> None:
    quizstatus_enum.create(op.get_bind(), checkfirst=True)
    questiontype_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "quizzes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("class_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("max_attempts", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("draft", "published", "archived", name="quizstatus"),
            nullable=False,
            server_default="draft",
        ),
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
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_quizzes_class_id", "quizzes", ["class_id"], unique=False)

    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.Column(
            "type",
            sa.Enum("MCQ", "TrueFalse", "ShortAnswer", name="questiontype"),
            nullable=False,
        ),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["quiz_id"], ["quizzes.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_questions_quiz_id", "questions", ["quiz_id"], unique=False)

    op.create_table(
        "answers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_answers_question_id", "answers", ["question_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_answers_question_id", table_name="answers")
    op.drop_table("answers")

    op.drop_index("ix_questions_quiz_id", table_name="questions")
    op.drop_table("questions")

    op.drop_index("ix_quizzes_class_id", table_name="quizzes")
    op.drop_table("quizzes")

    questiontype_enum.drop(op.get_bind(), checkfirst=True)
    quizstatus_enum.drop(op.get_bind(), checkfirst=True)
