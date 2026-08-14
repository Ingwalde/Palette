"""add users.token_version so access tokens can be revoked

Access tokens are stateless JWTs valid for ACCESS_TOKEN_EXPIRE_MINUTES (24h by default).
Logout and password reset only revoked refresh tokens, so a stolen access cookie kept working
for up to a day after the user changed their password. Carrying a version claim and comparing
it against the row makes revocation immediate, at no extra cost: get_current_user already
loads the user on every request.

Idempotent (ADD COLUMN IF NOT EXISTS) like 0002, so a database that has been through the
pre-Alembic startup ALTERs can still be upgraded.

Revision ID: 0007_user_token_version
Revises: 0006_fk_cascades
Create Date: 2026-08-13
"""

from alembic import op

revision: str = "0007_user_token_version"
down_revision: str | None = "0006_fk_cascades"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0"
    )


def downgrade() -> None:
    op.drop_column("users", "token_version")
