"""add email verification columns to users

Revision ID: 0002_email_verified
Revises: 0001_initial
Create Date: 2026-08-02
"""

import sqlalchemy as sa
from alembic import op

revision: str = "0002_email_verified"
down_revision: str | None = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent so a pre-Alembic database that already added these columns (via the old
    # startup ALTER) can be stamped at the baseline and upgraded without error.
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE"
    )
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ")


def downgrade() -> None:
    op.drop_column("users", "email_verified_at")
    op.drop_column("users", "email_verified")
