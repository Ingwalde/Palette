"""Shared async test fixtures.

The suite runs against PostgreSQL via the async engine (asyncpg), driven by an in-process
httpx AsyncClient. The `tests` service in docker-compose.yml provides DATABASE_URL:

    docker compose --profile test run --rm tests

SECRET_KEY must be set before importing the app, otherwise config.py hard-fails. The
login/register rate limiter is disabled so repeated calls do not trip 429 responses.
"""

import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-not-a-placeholder-0123456789")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5500")
os.environ.setdefault("DEFAULT_ADMIN_PASSWORD", "test-admin-strong-password")
# Cookies are set over the test client's http:// base URL, so they must not be Secure-only.
os.environ.setdefault("COOKIE_SECURE", "false")

# Prefer an explicit test DB; fall back to DATABASE_URL. Must be PostgreSQL.
_test_db_url = os.environ.get("TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")
if not _test_db_url or not _test_db_url.startswith("postgresql"):
    raise RuntimeError(
        "Tests require a PostgreSQL DATABASE_URL (or TEST_DATABASE_URL). "
        "Run them via: docker compose --profile test run --rm tests"
    )
os.environ["DATABASE_URL"] = _test_db_url

import pytest_asyncio
from app import crud, schemas
from app.database import Base, get_db
from app.main import app
from app.rate_limit import limiter
from app.security import hash_password
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text as sa_text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# NullPool: no connection is reused across the per-test event loops pytest-asyncio creates.
engine = create_async_engine(_test_db_url, poolclass=NullPool)
TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

limiter.enabled = False


async def _override_get_db():
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture(autouse=True)
async def _reset_database():
    async with engine.begin() as conn:
        # The suite builds its schema from the models rather than by running migrations, so the
        # extension migration 0008 installs has to be created here too — the palette search
        # indexes are declared with gin_trgm_ops and create_all fails without it. Tests now
        # exercise the same index set production has, instead of a schema missing four of them.
        await conn.execute(sa_text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as async_client:
        yield async_client


async def _make_user(db, username, email, password, is_admin=False):
    return await crud.create_user(
        db=db,
        user_data=schemas.UserCreate(username=username, email=email, password=password),
        password_hash=hash_password(password),
        is_admin=is_admin,
    )


def csrf_headers(client):
    """X-CSRF-Token header echoing the csrf cookie — required on mutating requests."""
    return {"X-CSRF-Token": client.cookies.get("csrf_token", "")}


async def login(client, username, password):
    """Log a client in (populates its cookie jar) and return the csrf header dict."""
    resp = await client.post(
        "/api/v1/auth/login", json={"username": username, "password": password}
    )
    assert resp.status_code == 200
    return csrf_headers(client)


@pytest_asyncio.fixture
async def admin_client(client, db_session):
    """The shared client, logged in as an admin (auth + csrf cookies in its jar)."""
    await _make_user(db_session, "adminuser", "admin@test.com", "strong-password", is_admin=True)
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "adminuser", "password": "strong-password"},
    )
    assert resp.status_code == 200
    return client


@pytest_asyncio.fixture
async def admin_csrf(admin_client):
    return csrf_headers(admin_client)


@pytest_asyncio.fixture
async def user_csrf(user_client):
    return csrf_headers(user_client)


@pytest_asyncio.fixture
async def user_client(client, db_session):
    """The shared client, logged in as a normal (non-admin) user."""
    await _make_user(db_session, "normaluser", "user@test.com", "strong-password")
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "normaluser", "password": "strong-password"},
    )
    assert resp.status_code == 200
    return client
