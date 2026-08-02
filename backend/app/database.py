from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import DATABASE_URL

# PostgreSQL only (config guarantees a postgresql:// URL).
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_startup_migrations() -> None:
    """Idempotent schema migrations for already-existing databases.

    ``Base.metadata.create_all`` only adds columns to tables it creates fresh; it never
    ALTERs a table that already exists. Columns introduced after the ``users`` table was
    first created must be added explicitly. ``ADD COLUMN IF NOT EXISTS`` makes this safe
    to run on every startup (PostgreSQL).
    """
    statements = (
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ",
    )
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
