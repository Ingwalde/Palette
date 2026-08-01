import logging
import os

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("palette.config")

# SECRET_KEY is mandatory. The app must not boot with a missing or placeholder
# key, otherwise issued JWTs would be trivially forgeable.
_INSECURE_SECRET_KEYS = {
    "",
    "change-this-dev-secret-key",
    "change-this-secret-key-before-sharing",
}

SECRET_KEY = os.getenv("SECRET_KEY", "")

if SECRET_KEY in _INSECURE_SECRET_KEYS:
    raise RuntimeError(
        "SECRET_KEY is missing or set to an insecure placeholder value. "
        "Set a strong, unique SECRET_KEY in backend/.env before starting the app. "
        "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
    )

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# Allowed browser origins for CORS (comma-separated). Defaults to the local
# frontend dev server. Never use "*" together with credentials.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5500,http://127.0.0.1:5500",
    ).split(",")
    if origin.strip()
]

DEFAULT_ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@palette.local")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")

# First-run seeding needs a password, so we do not hard-fail here, but a loud
# warning is emitted when the placeholder value is still in use.
_INSECURE_ADMIN_PASSWORDS = {"admin123", "change-this-admin-password"}

if DEFAULT_ADMIN_PASSWORD in _INSECURE_ADMIN_PASSWORDS:
    logger.warning(
        "DEFAULT_ADMIN_PASSWORD is still set to a placeholder value. "
        "Change it in backend/.env and rotate the seeded admin password."
    )
