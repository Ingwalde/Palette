"""cascade dependent rows when a user or palette is deleted

The foreign keys in 0001/0004 were created without ON DELETE behaviour, so deleting a
palette that someone had favorited raised ForeignKeyViolation and the endpoint 500'd.
crud.delete_user worked around this by clearing dependents by hand; crud.delete_palette
did not. Push the rule into the schema instead so neither path can forget it.

The original constraints were unnamed, so their names are whatever Postgres generated.
Look them up in pg_constraint rather than assuming the default `<table>_<column>_fkey`,
which also makes the migration idempotent for pre-Alembic databases.

Revision ID: 0006_fk_cascades
Revises: 0005_tags_catalog
Create Date: 2026-08-13
"""

import sqlalchemy as sa
from alembic import op

revision: str = "0006_fk_cascades"
down_revision: str | None = "0005_tags_catalog"
branch_labels = None
depends_on = None

# (table, column, referenced table, referenced column)
_FOREIGN_KEYS = [
    ("favorites", "user_id", "users", "id"),
    ("favorites", "palette_id", "palettes", "id"),
    ("refresh_tokens", "user_id", "users", "id"),
]

_FIND_FK = sa.text("""
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    WHERE con.contype = 'f' AND rel.relname = :table AND att.attname = :column
""")


def _recreate(
    table: str, column: str, ref_table: str, ref_column: str, ondelete: str | None
) -> None:
    conn = op.get_bind()
    existing = conn.execute(_FIND_FK, {"table": table, "column": column}).scalars().all()
    for name in existing:
        op.drop_constraint(name, table, type_="foreignkey")
    op.create_foreign_key(
        f"{table}_{column}_fkey", table, ref_table, [column], [ref_column], ondelete=ondelete
    )


def upgrade() -> None:
    for table, column, ref_table, ref_column in _FOREIGN_KEYS:
        _recreate(table, column, ref_table, ref_column, "CASCADE")


def downgrade() -> None:
    for table, column, ref_table, ref_column in _FOREIGN_KEYS:
        _recreate(table, column, ref_table, ref_column, None)
