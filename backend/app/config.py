import logging
from typing import Annotated, Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

logger = logging.getLogger("palette.config")

# Boot-time guards: these placeholder values must never reach production.
_INSECURE_SECRET_KEYS = {
    "",
    "change-this-dev-secret-key",
    "change-this-secret-key-before-sharing",
}
_INSECURE_ADMIN_PASSWORDS = {"admin123", "change-this-admin-password"}


class Settings(BaseSettings):
    """Typed, validated application settings.

    Docker Compose injects these from ``backend/.env``; pydantic-settings reads them from
    the process environment (case-insensitive). Invalid values fail fast at startup.
    """

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # Security
    secret_key: str = ""
    access_token_expire_minutes: int = 1440
    refresh_token_expire_days: int = 30
    email_verification_expire_hours: int = 24
    password_reset_expire_hours: int = 1
    enable_api_docs: bool = False
    log_level: str = "INFO"

    # Auth cookies. Tokens live in httpOnly cookies (not JS-readable) with a JS-readable
    # csrf_token for double-submit CSRF protection. cookie_secure must be True in production
    # (https); set it False for plain-http local development or the browser drops the cookies.
    cookie_secure: bool = True
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    # Rate-limit storage backend. Defaults to in-memory; set to redis://host:port in
    # production so limits are shared across processes/instances.
    redis_url: str = "memory://"

    # Database — PostgreSQL only, mandatory (Compose supplies it).
    database_url: str = ""

    # Allowed browser origins for CORS (comma-separated in the env var). Never "*".
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ]

    # Email verification (Resend). Without a key the app logs the link instead of sending.
    resend_api_key: str = ""
    email_from: str = "Palette <onboarding@resend.dev>"
    public_base_url: str = "http://localhost:5500"

    # First-run admin seed.
    default_admin_username: str = "admin"
    default_admin_email: str = "admin@palette.local"
    default_admin_password: str = "admin123"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("public_base_url")
    @classmethod
    def _strip_trailing_slash(cls, value: str) -> str:
        return value.rstrip("/")

    @field_validator("secret_key")
    @classmethod
    def _require_strong_secret(cls, value: str) -> str:
        if value in _INSECURE_SECRET_KEYS:
            raise ValueError(
                "SECRET_KEY is missing or set to an insecure placeholder value. Set a "
                "strong, unique SECRET_KEY in backend/.env. Generate one with: "
                'python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        return value

    @field_validator("database_url")
    @classmethod
    def _require_postgresql(cls, value: str) -> str:
        if not value:
            raise ValueError(
                "DATABASE_URL is not set. Palette requires PostgreSQL and runs via Docker "
                "Compose (docker compose up). See docker-compose.yml / backend/.env.example."
            )
        if not value.startswith("postgresql"):
            raise ValueError(
                f"DATABASE_URL must be a PostgreSQL URL (postgresql+psycopg://...); got: {value!r}"
            )
        return value

    @field_validator("default_admin_password")
    @classmethod
    def _warn_placeholder_admin_password(cls, value: str) -> str:
        if value in _INSECURE_ADMIN_PASSWORDS:
            logger.warning(
                "DEFAULT_ADMIN_PASSWORD is still set to a placeholder value. "
                "Change it in backend/.env and rotate the seeded admin password."
            )
        return value


settings = Settings()
