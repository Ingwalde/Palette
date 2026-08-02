import hashlib
import hmac
import os
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from . import crud, models
from .config import settings
from .database import get_db

ALGORITHM = "HS256"
HASH_NAME = "pbkdf2_sha256"
HASH_ITERATIONS = 210_000
EMAIL_VERIFICATION_PURPOSE = "verify_email"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    password_hash = _pbkdf2_hash(password=password, salt=salt)
    return f"{HASH_NAME}${HASH_ITERATIONS}${salt}${password_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        hash_name, iterations_raw, salt, expected_hash = stored_hash.split("$", 3)
    except ValueError:
        return False

    if hash_name != HASH_NAME:
        return False

    password_hash = _pbkdf2_hash(
        password=password,
        salt=salt,
        iterations=int(iterations_raw),
    )

    return hmac.compare_digest(password_hash, expected_hash)


def _pbkdf2_hash(password: str, salt: str, iterations: int = HASH_ITERATIONS) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        iterations,
    ).hex()


def authenticate_user(db: Session, username: str, password: str) -> models.User | None:
    login_value = username.strip().lower()

    if "@" in login_value:
        user = crud.get_user_by_email(db, login_value)
    else:
        user = crud.get_user_by_username(db, username.strip())

    if user is None:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user


def _encode_token(claims: dict, expires_delta: timedelta) -> str:
    payload = {**claims, "exp": datetime.now(UTC) + expires_delta}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_access_token(user: models.User) -> str:
    return _encode_token(
        {"sub": str(user.id), "username": user.username, "is_admin": user.is_admin},
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_email_verification_token(user_id: int) -> str:
    return _encode_token(
        {"sub": str(user_id), "purpose": EMAIL_VERIFICATION_PURPOSE},
        timedelta(hours=settings.email_verification_expire_hours),
    )


def decode_email_verification_token(token: str) -> int | None:
    """Return the user id from a valid, unexpired email verification token, else None."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        if payload.get("purpose") != EMAIL_VERIFICATION_PURPOSE:
            return None
        return int(payload["sub"])
    except (InvalidTokenError, TypeError, ValueError, KeyError):
        return None


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        # Reject purpose-scoped tokens (e.g. email verification) as bearer credentials.
        if payload.get("purpose") is not None:
            raise credentials_exception
        user_id = int(payload.get("sub"))
    except (InvalidTokenError, TypeError, ValueError):
        raise credentials_exception from None

    user = crud.get_user(db, user_id)
    if user is None:
        raise credentials_exception

    return user


def require_admin_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required",
        )

    return current_user
