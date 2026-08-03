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


@pytest_asyncio.fixture
async def admin_token(client, db_session):
    await _make_user(db_session, "adminuser", "admin@test.com", "strong-password", is_admin=True)
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "adminuser", "password": "strong-password"},
    )
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def user_token(client, db_session):
    await _make_user(db_session, "normaluser", "user@test.com", "strong-password")
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "normaluser", "password": "strong-password"},
    )
    return resp.json()["access_token"]
