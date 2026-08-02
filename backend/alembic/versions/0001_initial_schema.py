"""initial schema (palettes, users, favorites)

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-02

Baseline schema, matching what ``Base.metadata.create_all`` produced before email
verification existed. The ``email_verified`` columns are added by revision 0002.
"""

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "palettes",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("slug", sa.String(120), nullable=False, unique=True, index=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("colors_json", sa.Text, nullable=False, server_default="[]"),
        sa.Column("tags_json", sa.Text, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("username", sa.String(40), nullable=False, unique=True, index=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_admin", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "favorites",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "palette_id",
            sa.Integer,
            sa.ForeignKey("palettes.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "palette_id", name="uq_user_palette_favorite"),
    )


def downgrade() -> None:
    op.drop_table("favorites")
    op.drop_table("users")
    op.drop_table("palettes")
