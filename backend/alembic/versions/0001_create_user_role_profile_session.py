"""create user role profile session

Revision ID: 0001_user_role_profile
Revises:
Create Date: 2026-02-07 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_user_role_profile"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


role_name_enum = sa.Enum("STUDENT", "TEACHER", "ADMIN", name="role_name")


def upgrade() -> None:
    connection = op.get_bind()
    type_exists = connection.execute(
        "SELECT 1 FROM pg_type WHERE typname = 'role_name'"
    ).scalar()

    if not type_exists:
        op.execute("CREATE TYPE role_name AS ENUM ('STUDENT', 'TEACHER', 'ADMIN')")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
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
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_role_id", "users", ["role_id"], unique=False)

    op.create_table(
        "user_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("avatar_url", sa.String(length=2048), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_user_profiles_user_id"),
    )

    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("refresh_token", sa.String(length=2048), nullable=False),
        sa.Column("access_token", sa.String(length=2048), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("refresh_token", name="uq_sessions_refresh_token"),
        sa.UniqueConstraint("access_token", name="uq_sessions_access_token"),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_sessions_user_id", table_name="sessions")
    op.drop_table("sessions")

    op.drop_table("user_profiles")

    op.drop_index("ix_users_role_id", table_name="users")
    op.drop_table("users")

    op.drop_table("roles")

    role_name_enum.drop(op.get_bind(), checkfirst=True)
