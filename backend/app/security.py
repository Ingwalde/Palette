import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from . import crud, models
from .config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY
from .database import get_db

ALGORITHM = "HS256"
HASH_NAME = "pbkdf2_sha256"
HASH_ITERATIONS = 210_000

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

    return password_hash == expected_hash


def _pbkdf2_hash(password: str, salt: str, iterations: int = HASH_ITERATIONS) -> str:
    import hashlib

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


def create_access_token(user: models.User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "is_admin": user.is_admin,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


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
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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
