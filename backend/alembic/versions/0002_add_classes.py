"""create class and class_student models

Revision ID: 0002_add_classes
Revises: 0001_user_role_profile
Create Date: 2026-02-13 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002_add_classes"
down_revision: Union[str, Sequence[str], None] = "0001_user_role_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create classes table
    op.create_table(
        "classes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=2048), nullable=True),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_classes_teacher_id", "classes", ["teacher_id"], unique=False)

    # Create class_students association table
    op.create_table(
        "class_students",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("class_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint(
            "class_id", "student_id", name="uq_class_students_class_student"
        ),
    )
    op.create_index(
        "ix_class_students_class_id", "class_students", ["class_id"], unique=False
    )
    op.create_index(
        "ix_class_students_student_id", "class_students", ["student_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_class_students_student_id", table_name="class_students")
    op.drop_index("ix_class_students_class_id", table_name="class_students")
    op.drop_table("class_students")

    op.drop_index("ix_classes_teacher_id", table_name="classes")
    op.drop_table("classes")
