"""Shared test fixtures.

The suite runs against PostgreSQL (there is no SQLite fallback). Provide a database via
`DATABASE_URL` (or `TEST_DATABASE_URL`) pointing at a disposable PostgreSQL — the
`tests` service in docker-compose.yml wires this up automatically:

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

import pytest
from app import crud, schemas
from app.database import Base, get_db
from app.main import app
from app.rate_limit import limiter
from app.security import hash_password
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(_test_db_url, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

limiter.enabled = False


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    return TestClient(app)


def _make_user(db, username, email, password, is_admin=False):
    return crud.create_user(
        db=db,
        user_data=schemas.UserCreate(username=username, email=email, password=password),
        password_hash=hash_password(password),
        is_admin=is_admin,
    )


@pytest.fixture
def admin_token(client, db_session):
    _make_user(db_session, "adminuser", "admin@test.com", "strong-password", is_admin=True)
    resp = client.post(
        "/api/auth/login",
        json={"username": "adminuser", "password": "strong-password"},
    )
    return resp.json()["access_token"]


@pytest.fixture
def user_token(client, db_session):
    _make_user(db_session, "normaluser", "user@test.com", "strong-password")
    resp = client.post(
        "/api/auth/login",
        json={"username": "normaluser", "password": "strong-password"},
    )
    return resp.json()["access_token"]
