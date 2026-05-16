"""Initial migration

Revision ID: 001
Revises:
Create Date: 2025-05-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('username', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('bio', sa.Text, nullable=True),
        sa.Column('onboarding_completed', sa.Boolean, default=False),
    )

    op.create_table(
        'characters',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('personality_prompt', sa.Text, nullable=False),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'chats',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('character_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('characters.id'), nullable=False),
        sa.Column('summary', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('chat_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chats.id'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('media_url', sa.String(500), nullable=True),
        sa.Column('media_type', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
    )

    op.create_table(
        'media',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('chat_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chats.id'), nullable=True),
        sa.Column('character_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('characters.id'), nullable=True),
        sa.Column('media_type', sa.String(20), nullable=False),
        sa.Column('prompt', sa.Text, nullable=False),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('status', sa.String(20), default='completed'),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('media')
    op.drop_table('messages')
    op.drop_table('chats')
    op.drop_table('characters')
    op.drop_table('users')
