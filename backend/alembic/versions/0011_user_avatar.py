"""user avatar

Adds a nullable `avatar` text column to `users`, holding a small downscaled profile image as a
data: URL (the deploy target has no object storage). Null means "use the username initial".

Revision ID: 0011_user_avatar
Revises: 0010_community_model
Create Date: 2026-09-07
"""

import sqlalchemy as sa
from alembic import op

revision: str = "0011_user_avatar"
down_revision: str | None = "0010_community_model"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar")
