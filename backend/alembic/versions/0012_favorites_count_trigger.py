"""favorites_count kept current by a trigger

`palettes.favorites_count` powers the "Most popular" sort, but nothing maintained it after the
one-time backfill — adding, removing and clearing favorites all left it unchanged. Rather than
duplicate counter maintenance across every code path that can touch a favorite (the API writes,
account deletion, and the ON DELETE CASCADE from deleting a user or a palette, which application
code never sees), a single database trigger keeps the counter in step atomically, in the same
transaction as the favorite change. A one-time recount corrects values that already drifted.

The trigger SQL lives in app.db_triggers so this migration and the test schema builder install the
exact same object.

Revision ID: 0012_favorites_count_trigger
Revises: 0011_user_avatar
Create Date: 2026-09-08
"""

from alembic import op

from app import db_triggers

revision: str = "0012_favorites_count_trigger"
down_revision: str | None = "0011_user_avatar"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for statement in db_triggers.INSTALL_STATEMENTS:
        op.execute(statement)
    # Recount from the source of truth so any drift accumulated before the trigger existed is fixed.
    op.execute(
        """
        UPDATE palettes p SET favorites_count = COALESCE(c.n, 0)
        FROM (SELECT palette_id, COUNT(*) AS n FROM favorites GROUP BY palette_id) c
        WHERE c.palette_id = p.id;
        """
    )
    op.execute(
        """
        UPDATE palettes SET favorites_count = 0
        WHERE id NOT IN (SELECT DISTINCT palette_id FROM favorites);
        """
    )


def downgrade() -> None:
    for statement in db_triggers.UNINSTALL_STATEMENTS:
        op.execute(statement)
