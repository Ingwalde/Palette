"""community model: visibility, moderation, counters, lineage, and support tables

Adds the columns the community layer sits on — visibility (private on create, public on publish),
published_at, status (moderation), is_featured (curated feed + cold-start), the denormalised
favorites/forks counters, and forked_from_id (fork / send-a-copy lineage) — plus the reports,
notifications and oauth_tokens tables. The existing catalogue is the seed content, so it is
backfilled public + featured with published_at = created_at and its real favourite counts.

Palette columns use IF NOT EXISTS (the table predates Alembic); the new tables are created
outright. Per-owner slug uniqueness and the counter upkeep on favourite/fork land with the steps
that exercise them.

Revision ID: 0010_community_model
Revises: 0009_palette_owner
Create Date: 2026-09-04
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010_community_model"
down_revision: str | None = "0009_palette_owner"
branch_labels = None
depends_on = None

_FORKED_FK = "palettes_forked_from_id_fkey"


def upgrade() -> None:
    op.execute(
        "ALTER TABLE palettes "
        "ADD COLUMN IF NOT EXISTS visibility VARCHAR(16) NOT NULL DEFAULT 'private'"
    )
    op.execute(
        "ALTER TABLE palettes "
        "ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'active'"
    )
    op.execute("ALTER TABLE palettes ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ")
    op.execute(
        "ALTER TABLE palettes "
        "ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE palettes "
        "ADD COLUMN IF NOT EXISTS favorites_count INTEGER NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE palettes ADD COLUMN IF NOT EXISTS forks_count INTEGER NOT NULL DEFAULT 0"
    )
    op.execute("ALTER TABLE palettes ADD COLUMN IF NOT EXISTS forked_from_id INTEGER")
    op.execute("CREATE INDEX IF NOT EXISTS ix_palettes_forked_from_id ON palettes (forked_from_id)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_palettes_feed "
        "ON palettes (visibility, status, published_at)"
    )
    op.execute(
        f"""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '{_FORKED_FK}') THEN
                ALTER TABLE palettes
                    ADD CONSTRAINT {_FORKED_FK}
                    FOREIGN KEY (forked_from_id) REFERENCES palettes (id) ON DELETE SET NULL;
            END IF;
        END $$;
        """
    )

    # The existing catalogue is the seed content: make it public and featured, dated to creation,
    # and give it its real favourite counts.
    op.execute(
        "UPDATE palettes SET visibility = 'public', is_featured = true, "
        "published_at = created_at WHERE published_at IS NULL"
    )
    op.execute(
        "UPDATE palettes p SET favorites_count = "
        "(SELECT count(*) FROM favorites f WHERE f.palette_id = p.id)"
    )

    op.create_table(
        "reports",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column(
            "palette_id",
            sa.Integer,
            sa.ForeignKey("palettes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "reporter_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("reason", sa.String(32), nullable=False),
        sa.Column("detail", sa.String(500), nullable=False, server_default=""),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("palette_id", "reporter_id", name="uq_report_palette_reporter"),
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "oauth_tokens",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("provider", sa.String(16), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scope", sa.String(255), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "provider", name="uq_oauth_user_provider"),
    )


def downgrade() -> None:
    op.drop_table("oauth_tokens")
    op.drop_table("notifications")
    op.drop_table("reports")
    op.drop_constraint(_FORKED_FK, "palettes", type_="foreignkey")
    op.drop_index("ix_palettes_feed", table_name="palettes")
    op.drop_index("ix_palettes_forked_from_id", table_name="palettes")
    for column in (
        "forked_from_id",
        "forks_count",
        "favorites_count",
        "is_featured",
        "published_at",
        "status",
        "visibility",
    ):
        op.drop_column("palettes", column)
