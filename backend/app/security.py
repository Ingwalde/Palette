import secrets

from fastapi import Header, HTTPException, status

from .config import ADMIN_TOKEN


def verify_admin_token(x_admin_token: str | None = Header(default=None)) -> None:
    if not x_admin_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin token is required",
        )

    if not secrets.compare_digest(x_admin_token, ADMIN_TOKEN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin token",
        )
