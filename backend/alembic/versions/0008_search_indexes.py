"""index the palette search predicates with pg_trgm

GET /palettes?search=… runs a leading-wildcard ILIKE over name, description, slug and the
tags array rendered as text. No btree index can serve `%foo%`, so every search was a
sequential scan with a per-row JSONB-to-text cast on top.

pg_trgm gin indexes do serve leading-wildcard ILIKE. One per searched expression, matching
exactly what _filtered_palettes_stmt emits — including the `tags::text` cast, so the tag
branch of search is covered rather than dropped.

Also (re)creates ix_palettes_tags. 0003 returns early when the columns are already JSONB, and
its create_index sits after that return, so a database that reached JSONB through the old
pre-Alembic startup ALTERs never got the GIN index that powers ?tag= filtering.

CREATE EXTENSION needs superuser; the compose/VM POSTGRES_USER is the database owner
superuser, so this is fine here. Every statement is IF NOT EXISTS.

Revision ID: 0008_search_indexes
Revises: 0007_user_token_version
Create Date: 2026-08-13
"""

from alembic import op

revision: str = "0008_search_indexes"
down_revision: str | None = "0007_user_token_version"
branch_labels = None
depends_on = None

_TRGM_INDEXES = {
    "ix_palettes_name_trgm": "palettes USING gin (name gin_trgm_ops)",
    "ix_palettes_description_trgm": "palettes USING gin (description gin_trgm_ops)",
    "ix_palettes_slug_trgm": "palettes USING gin (slug gin_trgm_ops)",
    "ix_palettes_tags_text_trgm": "palettes USING gin ((tags::text) gin_trgm_ops)",
}


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    # Repairs the index 0003 could skip; harmless when it is already there.
    op.execute("CREATE INDEX IF NOT EXISTS ix_palettes_tags ON palettes USING gin (tags)")
    for name, definition in _TRGM_INDEXES.items():
        op.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {definition}")


def downgrade() -> None:
    for name in _TRGM_INDEXES:
        op.execute(f"DROP INDEX IF EXISTS {name}")
    # pg_trgm and ix_palettes_tags are left in place: other things may rely on them, and
    # dropping an extension that a surviving index depends on would fail.
