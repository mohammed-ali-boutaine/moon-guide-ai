"""add user_activity table

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-26 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '0003'
down_revision = '0002_add_classes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_activities',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('action', sa.String(64), nullable=False),
        sa.Column('ip_address', sa.String(64), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_user_activities_user_id', 'user_activities', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_user_activities_user_id', table_name='user_activities')
    op.drop_table('user_activities')