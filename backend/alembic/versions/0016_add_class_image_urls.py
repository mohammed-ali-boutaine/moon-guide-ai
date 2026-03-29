"""add image_url and thumbnail_url to classes

Revision ID: 0016_add_class_image_urls
Revises: 0015_add_flashcards
Create Date: 2026-03-28 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0016_add_class_image_urls"
down_revision: Union[str, Sequence[str], None] = "0015_add_flashcards"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("classes", sa.Column("image_url", sa.String(2048), nullable=True))
    op.add_column("classes", sa.Column("thumbnail_url", sa.String(2048), nullable=True))


def downgrade() -> None:
    op.drop_column("classes", "thumbnail_url")
    op.drop_column("classes", "image_url")
