from collections.abc import AsyncGenerator
from pathlib import Path

import alembic.command as command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, inspect
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    """Declarative base for every model. The 2.0 class form, not the legacy
    declarative_base() factory."""


# Async engine (asyncpg) for the request path.
engine = create_async_engine(settings.database_url, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Alembic migrations run synchronously, so they use a sync engine (psycopg) derived from the
# same URL. The engine itself is created only when migrations run and disposed straight after
# (see run_migrations): it is used once at startup, so keeping a connection pool open for the
# process lifetime was a pool nothing ever drew from.
SYNC_DATABASE_URL = settings.database_url.replace("+asyncpg", "+psycopg")

_ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


def _alembic_config() -> Config:
    cfg = Config(str(_ALEMBIC_INI))
    cfg.set_main_option("script_location", str(_ALEMBIC_INI.parent / "alembic"))
    cfg.set_main_option("sqlalchemy.url", SYNC_DATABASE_URL)
    return cfg


def run_migrations() -> None:
    """Bring the database schema to head, safely adopting a pre-Alembic database.

    Runs synchronously against the sync engine. A database that predates Alembic (its
    tables exist but there is no Alembic version row) is stamped at the baseline and then
    upgraded; the migrations after the baseline are idempotent, so upgrading an existing
    database whose schema is ahead of the baseline is safe. A fresh database is upgraded
    from scratch.
    """
    cfg = _alembic_config()
    sync_engine = create_engine(SYNC_DATABASE_URL, pool_pre_ping=True)
    try:
        with sync_engine.connect() as connection:
            current = MigrationContext.configure(connection).get_current_revision()
            has_users = inspect(connection).has_table("users")

        if has_users and current is None:
            command.stamp(cfg, "0001_initial")
        command.upgrade(cfg, "head")
    finally:
        sync_engine.dispose()
