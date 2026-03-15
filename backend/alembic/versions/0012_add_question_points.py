"""Add points column to questions table

Revision ID: 0012_add_question_points
Revises: 0011_add_quiz_attempts
Create Date: 2026-03-15 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0012_add_question_points"
down_revision: Union[str, Sequence[str], None] = "0011_add_quiz_attempts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "questions",
        sa.Column(
            "points",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )


def downgrade() -> None:
    op.drop_column("questions", "points")
