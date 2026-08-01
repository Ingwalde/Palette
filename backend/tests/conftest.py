"""Shared test fixtures.

SECRET_KEY must be set before importing the app, otherwise config.py hard-fails.
Tests run against an isolated in-memory SQLite database and the login/register
rate limiter is disabled so repeated calls do not trip 429 responses.
"""
import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-not-a-placeholder-0123456789")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5500")
os.environ.setdefault("DEFAULT_ADMIN_PASSWORD", "test-admin-strong-password")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import crud, schemas
from app.database import Base, get_db
from app.main import app
from app.rate_limit import limiter
from app.security import hash_password

# One shared in-memory database across all connections in the process.
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
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
