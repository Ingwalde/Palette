import hmac
import logging
from contextlib import asynccontextmanager
from http import HTTPStatus
from typing import cast

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
from .crud import purge_expired_refresh_tokens
from .database import AsyncSessionLocal, run_migrations
from .rate_limit import limiter
from .routers import auth, favorites, palettes, tags, users
from .security import ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE
from .seed import (
    seed_curator_and_backfill,
    seed_default_admin_user,
    seed_default_palettes,
    seed_default_tags,
)

# Mutating requests must echo the csrf_token cookie in the X-CSRF-Token header (double-submit
# The version prefix every router is mounted under. Named once so the CSRF exemptions below and
# the include_router calls cannot drift: hardcoding "/api/v1/auth/login" in one place and
# mounting at another prefix would silently make the exemption miss, and the login it protects
# would start answering 403 with no obvious cause.
API_PREFIX = "/api/v1"

# CSRF). The auth-bootstrap endpoints run before a session/csrf cookie exists, so they are exempt.
_CSRF_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "TRACE"})
_CSRF_EXEMPT_PATHS = frozenset(
    f"{API_PREFIX}{suffix}"
    for suffix in (
        "/auth/login",
        "/auth/register",
        "/auth/resend-verification",
        "/auth/forgot-password",
        "/auth/reset-password",
    )
)

# Configure application logging once at import so every module's getLogger(...) shares a
# consistent format and level (overridable with the LOG_LEVEL env var).
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

# Error tracking. No-op unless SENTRY_DSN is configured; the FastAPI/ASGI integration is
# auto-enabled by sentry-sdk[fastapi], so unhandled errors are reported with request context.
if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        send_default_pii=False,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()

    async with AsyncSessionLocal() as db:
        await seed_default_palettes(db)
        await seed_default_tags(db)
        await seed_default_admin_user(db)
        # After the palettes and the admin exist: give every ownerless palette the curator owner
        # so each one has a handle for its /u/:handle/:slug URL.
        adopted = await seed_curator_and_backfill(db)
        if adopted:
            logging.getLogger("palette").info("Assigned %d palette(s) to the curator.", adopted)
        # Housekeeping: expired refresh tokens are unreachable by every code path that reads
        # them, so they are storage and nothing else.
        removed = await purge_expired_refresh_tokens(db)
        if removed:
            logging.getLogger("palette").info("Purged %d expired refresh token(s).", removed)

    yield

    # Close the reused readiness Redis client if one was ever opened.
    if _readiness_redis is not None:
        await _readiness_redis.aclose()


app = FastAPI(
    title="Palette API",
    description="Backend API for Palette v4.9.3 with auth, favorites, PostgreSQL and Docker.",
    version="4.9.3",
    docs_url="/api/docs" if settings.enable_api_docs else None,
    redoc_url="/api/redoc" if settings.enable_api_docs else None,
    openapi_url="/api/openapi.json" if settings.enable_api_docs else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


def _rate_limited_handler(request: Request, exc: Exception) -> JSONResponse:
    # slowapi's default handler answers with a plain {"error": ...} body — the one place in the
    # API that did not speak problem+json, so a client parsing errors uniformly hit a shape it
    # did not know on the response it most needs to read. Same 429 and the Retry-After slowapi
    # sets, in the format every other error uses.
    #
    # Typed `exc: Exception` (and narrowed here) rather than `RateLimitExceeded`: Starlette's
    # add_exception_handler expects the broad signature, and the two mypy versions in play
    # disagree about whether the narrow one needs a type-ignore — the broad type satisfies both.
    limit = cast(RateLimitExceeded, exc)
    response = _problem(
        HTTPStatus.TOO_MANY_REQUESTS,
        f"Rate limit exceeded: {limit.detail}",
        title="Too Many Requests",
    )
    return request.app.state.limiter._inject_headers(response, request.state.view_rate_limit)


app.add_exception_handler(RateLimitExceeded, _rate_limited_handler)


@app.middleware("http")
async def csrf_protect(request: Request, call_next):
    mutating = request.method not in _CSRF_SAFE_METHODS
    exempt = request.url.path in _CSRF_EXEMPT_PATHS
    # Only cookie-authenticated requests are at CSRF risk; without an auth cookie the request
    # carries no ambient credentials, so let it fall through to the endpoint's own auth check.
    authenticated = bool(request.cookies.get(ACCESS_COOKIE) or request.cookies.get(REFRESH_COOKIE))

    if mutating and not exempt and authenticated:
        cookie_token = request.cookies.get(CSRF_COOKIE)
        header_token = request.headers.get("X-CSRF-Token")
        if (
            not cookie_token
            or not header_token
            or not hmac.compare_digest(cookie_token, header_token)
        ):
            return _problem(
                HTTPStatus.FORBIDDEN, "CSRF token missing or invalid", title="Forbidden"
            )

    return await call_next(request)


# Security headers on every API response.
#
# These existed only in frontend-react/nginx.conf.template, which serves the SPA — so every
# /api/v1/** response went out with none of them. A JSON API is a smaller target than a
# document, but nosniff still matters (a browser sniffing an error body as HTML is how a
# reflected payload becomes script), and frame-ancestors still matters for anything that
# renders. The README described these as a backend feature; now they are one.
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    # The API returns JSON and never renders; this is the belt to nosniff's braces, stopping
    # anything at all from executing if a response is ever loaded as a document.
    response.headers.setdefault(
        "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"
    )
    # HSTS only over https. Sent on a plain-http response it would pin a browser to https for
    # this host for the whole max-age — which is correct in production behind Caddy and breaks
    # local development, where the API is reached over http on port 8000. The scheme is read
    # from the request rather than a setting because uvicorn runs with --proxy-headers, so
    # X-Forwarded-Proto is already reflected here.
    if request.url.scheme == "https":
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    return response


# CORS is added last so it is the outermost middleware — it must wrap the CSRF check so even a
# 403 carries the CORS headers the browser needs to expose the response.
# Reject requests for a Host this API does not answer for. Default "*" keeps local runs and
# the test profile working without extra configuration; production sets the real names.
if settings.allowed_hosts != ["*"]:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # The palette list sets X-Total-Count, and a browser cannot read a response header that is
    # not exposed — so the header was being sent and silently discarded on arrival.
    expose_headers=["X-Total-Count"],
)

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(palettes.router, prefix=API_PREFIX)
app.include_router(favorites.router, prefix=API_PREFIX)
app.include_router(tags.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)


def _problem(status_code: int, detail, title: str | None = None) -> JSONResponse:
    # RFC 7807 problem+json. Keeps `detail` so existing clients keep working.
    return JSONResponse(
        status_code=status_code,
        media_type="application/problem+json",
        content={
            "type": "about:blank",
            "title": title or HTTPStatus(status_code).phrase,
            "status": status_code,
            "detail": jsonable_encoder(detail),
        },
    )


# async, like every other handler: a plain `def` here is run in the threadpool, so a hot error
# path (a burst of 401s, a validation storm) borrows worker threads for work that only builds a
# small JSON body. These do no blocking I/O.
@app.exception_handler(StarletteHTTPException)
async def _http_exception_handler(request, exc: StarletteHTTPException) -> JSONResponse:
    response = _problem(exc.status_code, exc.detail)
    if exc.headers:  # preserve e.g. WWW-Authenticate on 401
        response.headers.update(exc.headers)
    return response


@app.exception_handler(RequestValidationError)
async def _validation_exception_handler(request, exc: RequestValidationError) -> JSONResponse:
    return _problem(HTTPStatus.UNPROCESSABLE_ENTITY, exc.errors(), title="Validation Error")


@app.get("/")
async def root():
    return {
        "name": "Palette API",
        "version": "4.9.3",
        # Only advertise the docs where they exist. With enable_api_docs off — the production
        # default — /api/docs is a 404, so linking to it sent anyone following the root response
        # to a dead end.
        "docs": "/api/docs" if settings.enable_api_docs else None,
        "health": "/health",
    }


@app.get("/health")
async def health_check():
    # Liveness: the process is up and serving.
    return {"status": "ok"}


_readiness_redis = None


def _get_readiness_redis():
    """A lazily-created, reused Redis client for the readiness probe."""
    global _readiness_redis
    if _readiness_redis is None:
        import redis.asyncio as redis_asyncio

        _readiness_redis = redis_asyncio.from_url(settings.redis_url)
    return _readiness_redis


@app.get("/health/ready")
async def readiness_check():
    # Readiness: dependencies (database, and Redis when configured) are reachable.
    checks: dict[str, str] = {}
    ready = True

    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
        ready = False

    if settings.redis_url.startswith("redis"):
        try:
            # One pooled client, reused across probes, rather than a fresh connection every
            # thirty seconds for the container healthcheck. ping() still reconnects and so still
            # detects a Redis that has gone down — the probe loses nothing, the connection churn
            # goes away.
            await _get_readiness_redis().ping()
            checks["redis"] = "ok"
        except Exception:
            checks["redis"] = "error"
            ready = False

    if not ready:
        return JSONResponse(status_code=503, content={"status": "not ready", "checks": checks})
    return {"status": "ready", "checks": checks}
