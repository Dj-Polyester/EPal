"""Add user_settings table

Revision ID: 002
Revises: 001
Create Date: 2025-05-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove columns added directly to users (if they exist from earlier attempt)
    try:
        op.drop_column('users', 'thinking_mode')
    except Exception:
        pass
    try:
        op.drop_column('users', 'theme')
    except Exception:
        pass

    # Create dedicated user_settings table
    op.create_table(
        'user_settings',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('thinking_mode', sa.Boolean, default=True, nullable=False),
        sa.Column('theme', sa.String(20), default='light', nullable=False),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Seed default settings for existing users
    op.execute("""
        INSERT INTO user_settings (user_id, thinking_mode, theme)
        SELECT id, true, 'light' FROM users
    """)


def downgrade() -> None:
    op.drop_table('user_settings')
