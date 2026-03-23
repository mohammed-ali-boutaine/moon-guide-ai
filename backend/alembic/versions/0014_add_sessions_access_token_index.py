"""Add index on sessions.access_token

Fixes full-table scan on every authenticated request.
Every auth dependency does a WHERE access_token = ? lookup;
without an index this is O(n) for every API call.

Revision ID: 0014_sessions_token_idx
Revises: 0013_add_grading_feedback
Create Date: 2026-03-17 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0014_sessions_token_idx"
down_revision: Union[str, Sequence[str], None] = "0013_add_grading_feedback"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_sessions_access_token",
        "sessions",
        ["access_token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_sessions_access_token", table_name="sessions")
