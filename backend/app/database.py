from pathlib import Path

import alembic.command as command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

# PostgreSQL only (config guarantees a postgresql:// URL).
engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()

_ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _alembic_config() -> Config:
    cfg = Config(str(_ALEMBIC_INI))
    # Absolute script location so migrations resolve regardless of the working directory.
    cfg.set_main_option("script_location", str(_ALEMBIC_INI.parent / "alembic"))
    cfg.set_main_option("sqlalchemy.url", settings.database_url)
    return cfg


def run_migrations() -> None:
    """Bring the database schema to head, safely adopting a pre-Alembic database.

    A database that predates Alembic (its tables exist but there is no Alembic version row)
    is stamped at the baseline and then upgraded. The migrations after the baseline are
    written idempotently — ``ADD COLUMN IF NOT EXISTS`` and a guard that skips the JSONB
    conversion when the old columns are already gone — so upgrading an existing database
    whose schema is ahead of the baseline is safe. A fresh database has no tables and is
    simply upgraded from scratch.
    """
    cfg = _alembic_config()
    with engine.connect() as connection:
        current = MigrationContext.configure(connection).get_current_revision()
        has_users = inspect(connection).has_table("users")

    if has_users and current is None:
        command.stamp(cfg, "0001_initial")
    command.upgrade(cfg, "head")
