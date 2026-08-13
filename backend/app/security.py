import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHash, VerifyMismatchError
from fastapi import Cookie, Depends, HTTPException, status
from jwt import InvalidTokenError
from sqlalchemy.ext.asyncio import AsyncSession

from . import crud, models
from .config import settings
from .database import get_db

ALGORITHM = "HS256"
EMAIL_VERIFICATION_PURPOSE = "verify_email"
PASSWORD_RESET_PURPOSE = "reset_password"

# Argon2id for new hashes. Legacy PBKDF2-SHA256 hashes are still verified and upgraded to
# Argon2 on the next successful login (see authenticate_user).
_password_hasher = PasswordHasher()
_LEGACY_HASH_NAME = "pbkdf2_sha256"
_LEGACY_ITERATIONS = 210_000

# Auth cookie names.
ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
CSRF_COOKIE = "csrf_token"


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    if stored_hash.startswith("$argon2"):
        try:
            return _password_hasher.verify(stored_hash, password)
        except (VerifyMismatchError, InvalidHash):
            return False
    return _verify_legacy_pbkdf2(password, stored_hash)


def password_needs_rehash(stored_hash: str) -> bool:
    """True if the hash should be replaced (legacy scheme, or outdated Argon2 parameters)."""
    if not stored_hash.startswith("$argon2"):
        return True
    try:
        return _password_hasher.check_needs_rehash(stored_hash)
    except InvalidHash:
        return True


def _verify_legacy_pbkdf2(password: str, stored_hash: str) -> bool:
    try:
        hash_name, iterations_raw, salt, expected_hash = stored_hash.split("$", 3)
    except ValueError:
        return False
    if hash_name != _LEGACY_HASH_NAME:
        return False
    computed = _pbkdf2_hash(password, salt, int(iterations_raw))
    return hmac.compare_digest(computed, expected_hash)


def _pbkdf2_hash(password: str, salt: str, iterations: int = _LEGACY_ITERATIONS) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        iterations,
    ).hex()


async def authenticate_user(db: AsyncSession, username: str, password: str) -> models.User | None:
    login_value = username.strip().lower()

    if "@" in login_value:
        user = await crud.get_user_by_email(db, login_value)
    else:
        user = await crud.get_user_by_username(db, username.strip())

    if user is None:
        return None

    if not verify_password(password, user.password_hash):
        return None

    # Transparently upgrade legacy/outdated hashes to current Argon2id parameters.
    if password_needs_rehash(user.password_hash):
        await crud.update_user_password(db, user, hash_password(password))

    return user


def _encode_token(claims: dict, expires_delta: timedelta) -> str:
    payload = {**claims, "exp": datetime.now(UTC) + expires_delta}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_access_token(user: models.User) -> str:
    return _encode_token(
        {
            "sub": str(user.id),
            "username": user.username,
            "is_admin": user.is_admin,
            # Checked against users.token_version on every request so a password change or
            # logout-everywhere kills this token immediately rather than at expiry.
            "ver": user.token_version,
        },
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


def create_password_reset_token(user: models.User) -> str:
    """A single-use reset token.

    Single use comes from the token_version claim: a successful reset bumps the row's
    version, so the same link stops validating instead of staying good for the rest of its
    hour. Binding to the password hash instead would misfire, because authenticate_user
    rewrites the hash on a transparent Argon2 upgrade without the password changing.
    """
    return _encode_token(
        {
            "sub": str(user.id),
            "purpose": PASSWORD_RESET_PURPOSE,
            "ver": user.token_version,
        },
        timedelta(hours=settings.password_reset_expire_hours),
    )


def decode_password_reset_token(token: str) -> tuple[int, int] | None:
    """Return (user id, token version) from a valid, unexpired password reset token, else None.

    The caller must still check the version against the user row — see reset_password. The
    distinct purpose claim means an email-verification token cannot be replayed as a
    password-reset token (or vice versa)."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        if payload.get("purpose") != PASSWORD_RESET_PURPOSE:
            return None
        return int(payload["sub"]), int(payload["ver"])
    except (InvalidTokenError, TypeError, ValueError, KeyError):
        return None


def _hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def create_refresh_token(db: AsyncSession, user: models.User) -> str:
    """Issue an opaque refresh token, storing only its hash."""
    token = secrets.token_urlsafe(48)
    expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    await crud.create_refresh_token(db, user.id, _hash_refresh_token(token), expires_at)
    return token


async def _active_refresh_token(db: AsyncSession, token: str) -> models.RefreshToken | None:
    stored = await crud.get_refresh_token(db, _hash_refresh_token(token))
    if stored is None or stored.revoked or stored.expires_at < datetime.now(UTC):
        return None
    return stored


async def rotate_refresh_token(db: AsyncSession, token: str) -> tuple[models.User, str] | None:
    """Validate a refresh token, revoke it (single use) and issue a fresh one."""
    stored = await _active_refresh_token(db, token)
    if stored is None:
        return None
    user = await crud.get_user(db, stored.user_id)
    if user is None:
        return None
    await crud.revoke_refresh_token(db, stored)
    return user, await create_refresh_token(db, user)


async def revoke_refresh_token(db: AsyncSession, token: str) -> None:
    stored = await crud.get_refresh_token(db, _hash_refresh_token(token))
    if stored is not None and not stored.revoked:
        await crud.revoke_refresh_token(db, stored)


async def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

    if not access_token:
        raise credentials_exception

    try:
        payload = jwt.decode(access_token, settings.secret_key, algorithms=[ALGORITHM])
        # Reject purpose-scoped tokens (e.g. email verification) as bearer credentials.
        if payload.get("purpose") is not None:
            raise credentials_exception
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
        user_id = int(sub)
        token_version = payload.get("ver")
    except (InvalidTokenError, TypeError, ValueError):
        raise credentials_exception from None

    user = await crud.get_user(db, user_id)
    if user is None:
        raise credentials_exception

    # Stale version = the session was ended server-side (password change, reset,
    # logout-everywhere). A missing claim means a token minted before this check existed, so it
    # is stale too — that logs everyone out once, on the release that introduces this.
    if token_version is None or token_version != user.token_version:
        raise credentials_exception

    return user


def require_admin_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required",
        )

    return current_user
