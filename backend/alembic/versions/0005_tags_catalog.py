"""add tags catalog table

Revision ID: 0005_tags_catalog
Revises: 0004_refresh_tokens
Create Date: 2026-08-05
"""

import sqlalchemy as sa
from alembic import op

revision: str = "0005_tags_catalog"
down_revision: str | None = "0004_refresh_tokens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("name", sa.String(60), nullable=False, unique=True, index=True),
        sa.Column("kind", sa.String(16), nullable=False, server_default="free"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("tags")
