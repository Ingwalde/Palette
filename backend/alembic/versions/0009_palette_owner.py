"""add palettes.owner_id so a palette has an owner (and a URL handle)

v5.0 scopes a palette's URL by its owner's handle (/u/:handle/:slug). The seed catalogue
predates user ownership, so this adds a nullable owner_id and the startup backfill (seed.py)
assigns every ownerless palette to the reserved curator account. The column is nullable and
added with IF NOT EXISTS so it can land on an adopted pre-Alembic database without a rewrite;
per-owner slug uniqueness and the rest of the ownership columns come in a later migration.

Revision ID: 0009_palette_owner
Revises: 0008_search_indexes
Create Date: 2026-08-30
"""

from alembic import op

revision: str = "0009_palette_owner"
down_revision: str | None = "0008_search_indexes"
branch_labels = None
depends_on = None

_FK_NAME = "palettes_owner_id_fkey"


def upgrade() -> None:
    op.execute("ALTER TABLE palettes ADD COLUMN IF NOT EXISTS owner_id INTEGER")
    op.execute("CREATE INDEX IF NOT EXISTS ix_palettes_owner_id ON palettes (owner_id)")
    # Guarded so a re-run (or an adopted database) does not fail on an existing constraint.
    op.execute(
        f"""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = '{_FK_NAME}'
            ) THEN
                ALTER TABLE palettes
                    ADD CONSTRAINT {_FK_NAME}
                    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.drop_constraint(_FK_NAME, "palettes", type_="foreignkey")
    op.drop_index("ix_palettes_owner_id", table_name="palettes")
    op.drop_column("palettes", "owner_id")
