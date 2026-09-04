from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

# The reserved account that owns the seed catalogue, so every palette has an owner handle for its
# /u/:handle/:slug URL — the seed palettes predate user ownership and would otherwise have none.
# A palette with no owner at all (a just-created admin one before the startup backfill runs) still
# resolves here, so the URL never breaks.
CURATOR_HANDLE = "palette"
CURATOR_EMAIL = "palette@palettes-app.com"


def _utcnow() -> datetime:
    """Timezone-aware UTC now. Replaces the deprecated naive datetime.utcnow."""
    return datetime.now(UTC)


class Palette(Base):
    __tablename__ = "palettes"
    # GIN index on the JSONB tags array powers fast containment (tag) filtering.
    #
    # The pg_trgm indexes below serve the leading-wildcard ILIKE that search runs; they were
    # created by migration 0008 and, until now, existed only there. A model that does not
    # describe them is a model autogenerate compares against reality and finds four indexes to
    # drop — so the next `alembic revision --autogenerate` would have written a migration
    # deleting the search indexes, and nothing about that diff would have looked wrong.
    # `alembic check` in CI now fails if this list and the migrations disagree again.
    __table_args__ = (
        Index("ix_palettes_tags", "tags", postgresql_using="gin"),
        Index(
            "ix_palettes_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
        Index(
            "ix_palettes_description_trgm",
            "description",
            postgresql_using="gin",
            postgresql_ops={"description": "gin_trgm_ops"},
        ),
        Index(
            "ix_palettes_slug_trgm",
            "slug",
            postgresql_using="gin",
            postgresql_ops={"slug": "gin_trgm_ops"},
        ),
        # An expression index over the JSONB rendered as text, matching the cast in
        # _filtered_palettes_stmt. Declared with text() because the indexed thing is an
        # expression rather than a column.
        # The operator class is written into the expression rather than passed as
        # postgresql_ops. Alembic asks for the latter so it can compare the index, but the ops
        # key has to match how the expression renders, and for this one it does not: the class
        # is dropped from the DDL and Postgres refuses `USING gin ((tags::text))` outright,
        # because text has no default gin operator class. A warning that alembic cannot compare
        # one expression index is the cheaper problem — it still knows the index exists, which
        # is what stops autogenerate proposing to drop it.
        Index(
            "ix_palettes_tags_text_trgm",
            text("(tags::text) gin_trgm_ops"),
            postgresql_using="gin",
        ),
        # The community feed reads public + active palettes ordered by recency; a btree over these
        # columns serves the filter and the ordering (scannable either direction).
        Index("ix_palettes_feed", "visibility", "status", "published_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    colors: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    tags: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    # Nullable so the column can be added to an existing table without a default row-rewrite; the
    # startup backfill then assigns every ownerless palette to the curator account. Loaded with
    # selectin so `owner_handle` works under async without a lazy load on the request path.
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    owner: Mapped["User | None"] = relationship("User", lazy="selectin")
    # Community columns. `private` on create, `public` on publish (published_at stamps that
    # moment); `status` is the moderation state; `is_featured` drives the "curated" feed sort and
    # the cold-start (seed palettes are featured). The counters are denormalised so the feed's
    # "popular" sort is an index read, not a COUNT(*) per row — kept in step with favourites/forks
    # in the transaction that changes them.
    visibility: Mapped[str] = mapped_column(
        String(16), default="private", server_default="private", nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(16), default="active", server_default="active", nullable=False
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_featured: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    favorites_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    forks_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    # Lineage for fork/remix and send-a-copy. SET NULL, not CASCADE: deleting the original should
    # not delete the copies someone else now owns; they just lose the link.
    forked_from_id: Mapped[int | None] = mapped_column(
        ForeignKey("palettes.id", ondelete="SET NULL"), index=True, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
        nullable=False,
    )

    @property
    def owner_handle(self) -> str:
        """The handle for this palette's /u/:handle/:slug URL — the owner's username, or the
        curator handle when it has no owner yet."""
        return self.owner.username if self.owner is not None else CURATOR_HANDLE


class Tag(Base):
    """Catalog of tags, managed independently of palettes. Palettes still store their tags
    as a JSONB string array; this table adds a curated vocabulary so tags can exist before
    any palette uses them and can be flagged as reusable "purpose" categories."""

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    # "free" (an ordinary tag) or "purpose" (a standard "what is this palette for" category).
    kind: Mapped[str] = mapped_column(String(16), default="free", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Bumped whenever every session for this user must die at once (password change, password
    # reset, logout-everywhere). Access tokens carry it as a claim, so they stop validating
    # immediately instead of staying good until they expire. Not touched by the transparent
    # password-hash upgrade in authenticate_user, which is not a credential change.
    token_version: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
        nullable=False,
    )


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "palette_id", name="uq_user_palette_favorite"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # ON DELETE CASCADE: there is no relationship() anywhere in the app, so the database is
    # the only thing that can clean up favorites when a user or palette goes away.
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    palette_id: Mapped[int] = mapped_column(
        ForeignKey("palettes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # SHA-256 hex of the opaque token; the plaintext is never stored.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )


class Report(Base):
    """A moderation report against a public palette. One per (palette, reporter) so a single
    user cannot spam-report the same palette; status moves open → actioned | dismissed."""

    __tablename__ = "reports"
    __table_args__ = (
        UniqueConstraint("palette_id", "reporter_id", name="uq_report_palette_reporter"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    palette_id: Mapped[int] = mapped_column(
        ForeignKey("palettes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    reporter_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    reason: Mapped[str] = mapped_column(String(32), nullable=False)
    detail: Mapped[str] = mapped_column(String(500), default="", server_default="", nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), default="open", server_default="open", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )


class Notification(Base):
    """An in-app notification for a recipient — currently a palette sent by another user. `kind`
    keeps it extensible; `payload` carries the sender handle and palette slug."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )


class OAuthToken(Base):
    """A stored OAuth token for an import provider (Figma / Pinterest). One row per
    (user, provider). The tokens are encrypted at rest and never leave the backend."""

    __tablename__ = "oauth_tokens"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_oauth_user_provider"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    provider: Mapped[str] = mapped_column(String(16), nullable=False)
    # Ciphertext, not the raw tokens (see security.py for the encryption helper added with the
    # import steps).
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scope: Mapped[str] = mapped_column(String(255), default="", server_default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
