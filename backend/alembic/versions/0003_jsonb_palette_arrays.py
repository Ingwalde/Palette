"""store palette colors/tags as JSONB with a GIN index on tags

Revision ID: 0003_jsonb_arrays
Revises: 0002_email_verified
Create Date: 2026-08-02

Converts the ``colors_json`` / ``tags_json`` TEXT columns (which held JSON strings) into
native JSONB columns ``colors`` / ``tags``, and adds a GIN index on ``tags`` so tag
filtering can use JSONB containment (@>) instead of scanning every row in Python.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0003_jsonb_arrays"
down_revision: str | None = "0002_email_verified"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent guard: skip if a pre-Alembic database already has the JSONB columns
    # (i.e. the old TEXT columns are gone), so stamp-baseline-then-upgrade is safe.
    still_text = (
        op.get_bind()
        .execute(
            sa.text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = 'palettes' AND column_name = 'colors_json'"
            )
        )
        .scalar()
    )
    if not still_text:
        return

    # Drop the TEXT '[]' server defaults first — Postgres cannot auto-cast them to JSONB,
    # and Alembic's server_default=None does not emit a DROP DEFAULT. New rows get their
    # default from the ORM (default=list), so no server default is needed afterwards.
    op.execute("ALTER TABLE palettes ALTER COLUMN colors_json DROP DEFAULT")
    op.execute("ALTER TABLE palettes ALTER COLUMN tags_json DROP DEFAULT")
    op.alter_column(
        "palettes",
        "colors_json",
        new_column_name="colors",
        type_=JSONB,
        postgresql_using="colors_json::jsonb",
        existing_nullable=False,
    )
    op.alter_column(
        "palettes",
        "tags_json",
        new_column_name="tags",
        type_=JSONB,
        postgresql_using="tags_json::jsonb",
        existing_nullable=False,
    )
    op.create_index("ix_palettes_tags", "palettes", ["tags"], postgresql_using="gin")


def downgrade() -> None:
    op.drop_index("ix_palettes_tags", table_name="palettes")
    op.alter_column(
        "palettes",
        "tags",
        new_column_name="tags_json",
        type_=sa.Text,
        postgresql_using="tags::text",
        existing_nullable=False,
        server_default="[]",
    )
    op.alter_column(
        "palettes",
        "colors",
        new_column_name="colors_json",
        type_=sa.Text,
        postgresql_using="colors::text",
        existing_nullable=False,
        server_default="[]",
    )
